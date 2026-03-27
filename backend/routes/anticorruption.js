const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const tamperLogMiddleware = require('../middleware/tamperLogMiddleware');
const { ACComplaint, ACEvidence, ACTamperLog } = require('../models/AnticorruptionComplaint');
const {
    generateSecureToken,
    encryptField,
    decryptField,
    hashFile,
    maskComplaint,
    assessLevel,
    assessUrgency,
    autoAssignOfficer,
    triggerVigilanceWebhook
} = require('../services/anticorruptionService');

// ════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (Anonymous — no auth required)
// ════════════════════════════════════════════════════════════════

// POST /api/anticorruption/submit — Anonymous complaint submission
router.post('/submit', async (req, res) => {
    try {
        const { category, description, accusedEmployeeName, department, branch, locality, lat, lng, files } = req.body;

        if (!category || !description) {
            return res.status(400).json({ message: 'Category and description are required.' });
        }

        // Generate secure token
        const tokenId = generateSecureToken();

        // Assess level & urgency
        const level = assessLevel(category, description);
        const urgency = assessUrgency(category, description);

        // Build complaint
        let complaint = new ACComplaint({
            tokenId,
            category,
            description: encryptField(description),
            accusedEmployeeName: encryptField(accusedEmployeeName || ''),
            department: department || '',
            branch: branch || '',
            locality: locality || '',
            level,
            urgency,
            status: 'Submitted',
            location: (lat && lng) ? { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } : undefined
        });

        // Auto-assign officer based on level
        complaint = await autoAssignOfficer(complaint);
        await complaint.save();

        // Trigger webhook for bribery
        if (category === 'Bribery') {
            triggerVigilanceWebhook(complaint); // fire-and-forget
        }

        // Save evidence files
        if (files && Array.isArray(files)) {
            const evidencePromises = files.map(file => {
                const fileBuffer = Buffer.from(file.data, 'base64');
                return ACEvidence.create({
                    complaintId: complaint._id,
                    fileType: file.type,
                    fileData: file.data,
                    fileHash: hashFile(fileBuffer),
                    originalName: file.name || '',
                    sizeBytes: fileBuffer.length
                });
            });
            await Promise.all(evidencePromises);
        }

        res.status(201).json({
            success: true,
            tokenId,
            level,
            urgency,
            status: complaint.status,
            assignedRole: complaint.assignedOfficerRole || 'Pending Assignment',
            message: `Report submitted successfully. Your tracking token is: ${tokenId}. Level ${level} complaint — assigned to ${complaint.assignedOfficerRole || 'pending officer assignment'}.`
        });
    } catch (err) {
        console.error('[AC Submit Error]', err);
        res.status(500).json({ message: 'Failed to submit report.', error: err.message });
    }
});

// GET /api/anticorruption/track/:tokenId — Track complaint by token
router.get('/track/:tokenId', async (req, res) => {
    try {
        const complaint = await ACComplaint.findOne({ tokenId: req.params.tokenId })
            .populate('assignedOfficerId', 'name role department');

        if (!complaint) {
            return res.status(404).json({ message: 'No report found with this token. Please check your tracking ID.' });
        }

        // Public view — limited information
        const response = {
            tokenId: complaint.tokenId,
            category: complaint.category,
            status: complaint.status,
            level: complaint.level,
            urgency: complaint.urgency,
            department: complaint.department,
            branch: complaint.branch,
            assignedRole: complaint.assignedOfficerRole || 'Pending',
            escalationLevel: complaint.escalationLevel,
            resolutionOutcome: complaint.resolutionOutcome || null,
            submittedAt: complaint.createdAt,
            resolvedAt: complaint.resolvedAt || null,
            // Don't expose description, accused name, or officer details publicly
        };

        res.json(response);
    } catch (err) {
        console.error('[AC Track Error]', err);
        res.status(500).json({ message: 'Failed to retrieve report status.' });
    }
});

// GET /api/anticorruption/dashboard-stats — Transparency Dashboard
router.get('/dashboard-stats', async (req, res) => {
    try {
        const totalReports = await ACComplaint.countDocuments();
        const casesResolved = await ACComplaint.countDocuments({
            status: { $in: ['Action_Taken', 'Closed'] }
        });

        // Average resolution time (for resolved cases)
        const resolvedCases = await ACComplaint.find({
            resolvedAt: { $ne: null }
        }).select('createdAt resolvedAt');

        let avgResolutionHours = 0;
        if (resolvedCases.length > 0) {
            const totalHours = resolvedCases.reduce((sum, c) => {
                return sum + (c.resolvedAt - c.createdAt) / (1000 * 60 * 60);
            }, 0);
            avgResolutionHours = Math.round(totalHours / resolvedCases.length);
        }

        // Department with highest integrity (fewest complaints)
        const deptStats = await ACComplaint.aggregate([
            { $match: { department: { $ne: '' } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: 1 } },
            { $limit: 1 }
        ]);

        // Department with most resolved
        const topResolved = await ACComplaint.aggregate([
            { $match: { status: { $in: ['Action_Taken', 'Closed'] }, department: { $ne: '' } } },
            { $group: { _id: '$department', resolved: { $sum: 1 } } },
            { $sort: { resolved: -1 } },
            { $limit: 1 }
        ]);

        res.json({
            totalReports,
            casesResolved,
            avgResolutionTime: avgResolutionHours > 0 ? `${avgResolutionHours}h` : 'N/A',
            departmentHighestIntegrity: deptStats[0]?._id || 'N/A',
            departmentMostResolved: topResolved[0]?._id || 'N/A',
            resolutionRate: totalReports > 0 ? Math.round((casesResolved / totalReports) * 100) : 0
        });
    } catch (err) {
        console.error('[AC Dashboard Error]', err);
        res.status(500).json({ message: 'Failed to fetch dashboard statistics.' });
    }
});

// ════════════════════════════════════════════════════════════════
// ADMIN ROUTES (Protected — officer/admin only)
// ════════════════════════════════════════════════════════════════

// Apply tamper log middleware to all admin routes
router.use('/admin', protect, tamperLogMiddleware);

// GET /api/anticorruption/admin/complaints — List all complaints
router.get('/admin/complaints', authorize('officer', 'admin'), async (req, res) => {
    try {
        const { status, category, level, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (level) filter.level = parseInt(level);

        const complaints = await ACComplaint.find(filter)
            .populate('assignedOfficerId', 'name role department')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await ACComplaint.countDocuments(filter);

        // Apply field masking based on user role
        const masked = complaints.map(c => maskComplaint(c, req.user.role));

        res.json({ complaints: masked, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('[AC Admin List Error]', err);
        res.status(500).json({ message: 'Failed to fetch complaints.' });
    }
});

// PUT /api/anticorruption/admin/complaints/:id/assign — Assign to officer
router.put('/admin/complaints/:id/assign', authorize('officer', 'admin'), async (req, res) => {
    try {
        const { officerId } = req.body;
        const complaint = await ACComplaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

        if (officerId) {
            const User = require('../models/User');
            const officer = await User.findById(officerId);
            if (!officer) return res.status(404).json({ message: 'Officer not found.' });

            complaint.assignedOfficerId = officer._id;
            complaint.assignedOfficerRole = officer.role;
            complaint.status = 'Assigned';
        } else {
            // Auto-assign based on level
            await autoAssignOfficer(complaint);
        }

        await complaint.save();
        res.json({ success: true, complaint: maskComplaint(complaint, req.user.role) });
    } catch (err) {
        console.error('[AC Assign Error]', err);
        res.status(500).json({ message: 'Failed to assign complaint.' });
    }
});

// PUT /api/anticorruption/admin/complaints/:id/status — Update status
router.put('/admin/complaints/:id/status', authorize('officer', 'admin'), async (req, res) => {
    try {
        const { status, resolutionOutcome } = req.body;
        const complaint = await ACComplaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

        complaint.status = status;
        if (resolutionOutcome) complaint.resolutionOutcome = resolutionOutcome;
        if (['Action_Taken', 'Closed'].includes(status)) complaint.resolvedAt = new Date();

        await complaint.save();

        // Trigger webhook if bribery and action taken
        if (complaint.category === 'Bribery' && status === 'Action_Taken') {
            triggerVigilanceWebhook(complaint);
        }

        res.json({ success: true, complaint: maskComplaint(complaint, req.user.role) });
    } catch (err) {
        console.error('[AC Status Error]', err);
        res.status(500).json({ message: 'Failed to update complaint status.' });
    }
});

// GET /api/anticorruption/admin/tamper-logs — View audit trail (read-only)
router.get('/admin/tamper-logs', authorize('officer', 'admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const logs = await ACTamperLog.find()
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await ACTamperLog.countDocuments();

        res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('[AC TamperLog Error]', err);
        res.status(500).json({ message: 'Failed to fetch tamper logs.' });
    }
});

module.exports = router;
