const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { MasterTicket, RawComplaint } = require('../models/Ticket');
const { protect, authorize } = require('../middleware/authMiddleware');

const SEVERITY_THRESHOLDS = { Medium: 3, High: 10, Critical: 25 };
const DEDUP_RADIUS_METERS = 50;

// SLA deadlines by department (hours)
const SLA_HOURS = {
    municipal: 24, pwd: 72, water_supply: 24, electricity: 12,
    transport: 48, health: 12, police: 6, fire: 2,
    environment: 72, education: 168, revenue: 168,
    social_welfare: 168, food_civil: 48, urban_dev: 168,
    telecom: 72, forest: 168
};

function calculateSeverity(count) {
    if (count >= SEVERITY_THRESHOLDS.Critical) return "Critical";
    if (count >= SEVERITY_THRESHOLDS.High) return "High";
    if (count >= SEVERITY_THRESHOLDS.Medium) return "Medium";
    return "Low";
}

function hasGeoCoordinates(lat, lng) {
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

function formatTicket(t) {
    const obj = t.toObject ? t.toObject() : t;
    return {
        ...obj,
        id: obj._id,
        lat: obj.location ? obj.location.coordinates[1] : null,
        lng: obj.location ? obj.location.coordinates[0] : null,
    };
}

function calculateSlaDeadline(department) {
    const hours = SLA_HOURS[department] || 72;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// ═══════════════════════════════════════════════════════
// SHARED: createComplaintFromData
// Used by BOTH manual web form AND voice auto-fill pipeline.
// This is the single source of truth for complaint creation.
// ═══════════════════════════════════════════════════════
async function createComplaintFromData(data, user = null) {
    const {
        primaryCategory, subCategory, description, landmark,
        lat, lng, accuracy, department,
        zone, wardNumber, locality, pincode,
        citizenImages, isAnonymous,
        source, audioUrl, callerPhone, callerPhoneRaw,
        transcriptOriginal, transcriptEnglish, severity
    } = data;

    const category = primaryCategory || data.category;
    if (!category) throw new Error('Category is required');
    if (!description) throw new Error('Description is required');

    let matchingTicket = null;
    let isNew = false;
    const hasLocation = hasGeoCoordinates(lat, lng);

    // Spatial deduplication
    if (hasLocation) {
        try {
            const nearbyTickets = await MasterTicket.find({
                primaryCategory: category,
                status: { $nin: ['Closed', 'Invalid_Spam', 'Rejected'] },
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                        $maxDistance: DEDUP_RADIUS_METERS
                    }
                }
            }).limit(1);

            if (nearbyTickets.length > 0) {
                matchingTicket = nearbyTickets[0];
            }
        } catch (geoErr) {
            console.warn('[Dedup] Geo query failed:', geoErr.message);
        }
    }

    if (matchingTicket) {
        matchingTicket.complaintCount += 1;
        matchingTicket.severity = severity || calculateSeverity(matchingTicket.complaintCount);
        if (!matchingTicket.department && department) matchingTicket.department = department;
        // Append citizen images to existing ticket
        if (citizenImages && citizenImages.length > 0) {
            matchingTicket.citizenImages.push(...citizenImages);
        }
        matchingTicket.actionHistory.push({
            newStatus: matchingTicket.status,
            remarks: `Additional complaint linked (total: ${matchingTicket.complaintCount})`,
            progressPercentage: matchingTicket.progressPercent
        });
        await matchingTicket.save();
    } else {
        isNew = true;
        matchingTicket = new MasterTicket({
            primaryCategory: category,
            subCategory: subCategory || '',
            description: description,
            severity: severity || "Low",
            complaintCount: 1,
            status: "Registered",
            department: department || null,
            needsManualGeo: !hasLocation,
            landmark: landmark || "",
            city: user?.city || data.city || "",
            zone: zone || "",
            wardNumber: wardNumber || "",
            locality: locality || "",
            pincode: pincode || "",
            citizenImages: citizenImages || [],
            audioUrl: audioUrl || null,
            source: source || 'web_form',
            isAnonymous: isAnonymous || false,
            complainantId: user?._id || null,
            complainantName: isAnonymous ? 'Anonymous' : (user?.name || data.complainantName || 'Citizen'),
            complainantPhone: user?.phone || data.complainantPhone || '',
            complainantEmail: user?.email || data.complainantEmail || '',
            location: hasLocation ? { type: "Point", coordinates: [Number(lng), Number(lat)] } : undefined,
            slaDeadline: calculateSlaDeadline(department),
            actionHistory: [{
                newStatus: 'Registered',
                remarks: `Complaint registered via ${source || 'web_form'}`,
                progressPercentage: 0
            }]
        });
        await matchingTicket.save();
    }

    // Save raw complaint
    const complaint = new RawComplaint({
        userId: user?._id || undefined,
        callerPhone: callerPhone || '',
        callerPhoneRaw: callerPhoneRaw || '',
        audioUrl: audioUrl || undefined,
        transcriptOriginal: transcriptOriginal || description,
        transcriptEnglish: transcriptEnglish || description,
        intentCategory: category,
        extractedLandmark: landmark || '',
        location: hasLocation ? { type: "Point", coordinates: [Number(lng), Number(lat)] } : undefined,
        geoAccuracy: accuracy,
        department: department,
        source: source || 'web_form',
        status: matchingTicket.status,
        masterTicketId: matchingTicket._id
    });
    await complaint.save();

    return { ticket: matchingTicket, rawComplaint: complaint, isNew };
}

// Export for use in voice.js
router.createComplaintFromData = createComplaintFromData;

// ─── POST /api/tickets/complaint ─── Submit a new complaint (web form)
router.post('/complaint', protect, async (req, res) => {
    try {
        const { category, primaryCategory, subCategory, description, landmark,
            lat, lng, accuracy, department,
            zone, wardNumber, locality, pincode,
            citizenImages, isAnonymous } = req.body;

        const result = await createComplaintFromData({
            primaryCategory: primaryCategory || category,
            subCategory, description, landmark,
            lat, lng, accuracy, department,
            zone, wardNumber, locality, pincode,
            citizenImages, isAnonymous,
            source: 'web_form'
        }, req.user);

        res.status(201).json({
            ticketId: result.ticket._id,
            isNew: result.isNew,
            ticket: formatTicket(result.ticket),
            needsManualGeo: result.ticket.needsManualGeo
        });

    } catch (err) {
        console.error('[Complaint Submit Error]', err);
        res.status(500).json({ message: err.message || 'Failed to submit complaint' });
    }
});

// ─── GET /api/tickets/my-complaints ─── User's own complaints
router.get('/my-complaints', protect, async (req, res) => {
    try {
        const complaints = await RawComplaint.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean()
            .maxTimeMS(10000);

        console.log(`[MyComplaints] User ${req.user._id}: found ${complaints.length} total complaints | sources: ${[...new Set(complaints.map(c => c.source))].join(', ')}`);

        const ticketIds = [...new Set(
            complaints
                .map(c => c.masterTicketId)
                .filter(id => id && mongoose.Types.ObjectId.isValid(id))
                .map(id => id.toString())
        )];

        const tickets = ticketIds.length
            ? await MasterTicket.find({ _id: { $in: ticketIds } }).lean().maxTimeMS(10000)
            : [];

        const ticketMap = new Map(tickets.map(t => [t._id.toString(), t]));

        const enriched = complaints.map(c => ({
            ...c,
            id: c._id,
            ticket: c.masterTicketId && ticketMap.has(c.masterTicketId.toString())
                ? { ...ticketMap.get(c.masterTicketId.toString()), id: c.masterTicketId.toString() }
                : null
        }));
        res.json(enriched);
    } catch (err) {
        console.error('[My Complaints Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/tickets/nearby ─── Nearby active tickets for citizen map
router.get('/nearby', protect, async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;
        if (!hasGeoCoordinates(lat, lng)) {
            return res.status(400).json({ message: 'lat and lng are required' });
        }

        const maxDistance = parseInt(radius, 10) || 5000;

        const tickets = await MasterTicket.find({
            status: { $nin: ['Closed', 'Invalid_Spam'] },
            location: {
                $nearSphere: {
                    $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                    $maxDistance: maxDistance
                }
            }
        }).limit(100);

        res.json(tickets.map(formatTicket));
    } catch (err) {
        console.error('[Nearby Tickets Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/tickets/master ─── All master tickets (filtered by role)
router.get('/master', protect, async (req, res) => {
    try {
        const query = {};
        const assignedDistrict = (req.user.city || '').trim();
        if (assignedDistrict) {
            query.city = assignedDistrict;
        } else if (['admin', 'engineer'].includes(req.user.role)) {
            return res.json([]);
        }

        if (req.user.role === 'engineer' && req.user.department) {
            query.department = req.user.department;
            query.$or = [{ assignedEngineerId: req.user._id }, { assignedEngineerId: null }];
            query.status = { $ne: 'Closed' };
        } else if (req.query.needsManualGeo === 'true') {
            query.needsManualGeo = true;
            query.status = { $nin: ['Closed', 'Invalid_Spam'] };
        }

        const tickets = await MasterTicket.find(query)
            .populate('assignedEngineerId', 'name email phone department')
            .sort({ updatedAt: -1 });

        res.json(tickets.map(formatTicket));
    } catch (err) {
        console.error('[Master Tickets Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/tickets/master/:id ─── Single ticket detail
router.get('/master/:id', protect, async (req, res) => {
    try {
        const ticket = await MasterTicket.findById(req.params.id)
            .populate('assignedEngineerId', 'name email phone');
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });
        res.json(formatTicket(ticket));
    } catch (err) {
        console.error('[Ticket Detail Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── PUT /api/tickets/master/:id ─── Update ticket (admin/engineer)
router.put('/master/:id', protect, authorize('admin', 'engineer'), async (req, res) => {
    try {
        const ticket = await MasterTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const isAdmin = req.user.role === 'admin';
        const isEngineer = req.user.role === 'engineer';
        const isAssignedEngineer = ticket.assignedEngineerId && ticket.assignedEngineerId.toString() === req.user._id.toString();
        const isEligibleUnassignedEngineer = !ticket.assignedEngineerId && req.user.department && ticket.department === req.user.department;

        if (isEngineer && !isAssignedEngineer && !isEligibleUnassignedEngineer) {
            return res.status(403).json({ message: 'Engineers can only update assigned or own-department unassigned tickets' });
        }

        if (isEngineer) {
            const restrictedFields = ['status', 'assignedEngineerId', 'needsManualGeo', 'severity', 'complaintCount', 'department', 'city', 'lat', 'lng'];
            const attemptedRestrictedField = restrictedFields.some((field) => req.body[field] !== undefined);
            if (attemptedRestrictedField) {
                return res.status(403).json({ message: 'Engineers are not allowed to modify admin-controlled fields' });
            }
        }

        const previousStatus = ticket.status;

        // Dynamic field updates
        const allowedFields = ['status', 'assignedEngineerId', 'needsManualGeo', 'resolutionRemarks', 'severity', 'complaintCount', 'department', 'landmark', 'city', 'progressPercent', 'zone', 'wardNumber', 'locality', 'pincode'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (isEngineer && !['progressPercent', 'resolutionRemarks'].includes(field)) return;
                if (field === 'assignedEngineerId' && !req.body[field]) {
                    ticket[field] = null;
                } else {
                    ticket[field] = req.body[field];
                }
            }
        });

        if (isEngineer && req.body.progressPercent !== undefined && Number(req.body.progressPercent) < 100) {
            ticket.status = 'In_Progress';
        }

        // Manual coordinate fix from Admin
        if (isAdmin && hasGeoCoordinates(req.body.lat, req.body.lng)) {
            ticket.location = { type: 'Point', coordinates: [Number(req.body.lng), Number(req.body.lat)] };
        }

        // Engineer resolution submission
        if (hasGeoCoordinates(req.body.resolutionLat, req.body.resolutionLng)) {
            ticket.resolutionLocation = { type: 'Point', coordinates: [Number(req.body.resolutionLng), Number(req.body.resolutionLat)] };
            // Append resolution images to array
            if (req.body.resolutionImageUrl) {
                ticket.resolutionImages.push(req.body.resolutionImageUrl);
            }
            if (req.body.resolutionImages && Array.isArray(req.body.resolutionImages)) {
                ticket.resolutionImages.push(...req.body.resolutionImages);
            }
            ticket.resolutionRemarks = req.body.resolutionRemarks || req.body.resolutionNotes || '';
            ticket.resolvedAt = new Date();
            ticket.status = 'Pending_Verification';
        }

        // Push to actionHistory on every update
        ticket.actionHistory.push({
            updatedBy: req.user._id,
            previousStatus: previousStatus,
            newStatus: ticket.status,
            remarks: req.body.resolutionRemarks || req.body.resolutionNotes || req.body.remarks || `Progress: ${ticket.progressPercent}%`,
            progressPercentage: ticket.progressPercent,
            images: req.body.resolutionImageUrl ? [req.body.resolutionImageUrl] :
                (req.body.resolutionImages || [])
        });

        await ticket.save();
        res.json(formatTicket(ticket));
    } catch (err) {
        console.error('[Ticket Update Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── PUT /api/tickets/master/:id/verify ─── Citizen verifies resolution
router.put('/master/:id/verify', protect, authorize('user', 'admin'), async (req, res) => {
    try {
        const ticket = await MasterTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (req.user.role !== 'admin') {
            const hasComplaint = await RawComplaint.exists({
                userId: req.user._id,
                masterTicketId: ticket._id
            });
            if (!hasComplaint) {
                return res.status(403).json({ message: 'You can only verify tickets linked to your complaints' });
            }
        }

        const { verified, rating, feedback } = req.body;
        const previousStatus = ticket.status;

        if (verified) {
            ticket.status = 'Closed';
            ticket.reComplaintRemark = '';
            ticket.isReopened = false;
        } else {
            // Re-complaint: reopen for engineer
            ticket.status = 'Reopened';
            ticket.reComplaintRemark = feedback || '';
            ticket.progressPercent = 0;
            ticket.resolutionImages = [];
            ticket.resolutionLocation = null;
            ticket.resolutionRemarks = '';
            ticket.resolvedAt = null;
            ticket.isReopened = true;
        }

        if (rating !== undefined) ticket.citizenRating = rating;
        if (feedback !== undefined) ticket.citizenFeedbackText = feedback;

        ticket.actionHistory.push({
            updatedBy: req.user._id,
            previousStatus: previousStatus,
            newStatus: ticket.status,
            remarks: verified ? 'Citizen satisfied — ticket closed' : `Re-complaint: ${feedback || 'No remark'}`,
            progressPercentage: verified ? 100 : 0
        });

        await ticket.save();
        res.json(formatTicket(ticket));
    } catch (err) {
        console.error('[Ticket Verify Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── POST /api/tickets/master/:id/upvote ─── Citizen upvote with proof
router.post('/master/:id/upvote', protect, authorize('user'), async (req, res) => {
    try {
        const ticket = await MasterTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const { proofImageUrl } = req.body;
        if (!proofImageUrl) {
            return res.status(400).json({ message: 'Proof image is required to upvote' });
        }

        ticket.complaintCount += 1;
        ticket.severity = calculateSeverity(ticket.complaintCount);
        ticket.citizenImages.push(proofImageUrl);

        ticket.actionHistory.push({
            newStatus: ticket.status,
            remarks: `Upvote #${ticket.complaintCount} with proof image`,
            progressPercentage: ticket.progressPercent
        });

        await ticket.save();
        res.json({
            message: 'Upvote recorded successfully!',
            ticket: formatTicket(ticket)
        });
    } catch (err) {
        console.error('[Upvote Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/tickets/stats ─── Dashboard stats (admin)
router.get('/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const [total, open, critical, pendingGeo] = await Promise.all([
            MasterTicket.countDocuments(),
            MasterTicket.countDocuments({ status: { $nin: ['Closed', 'Invalid_Spam'] } }),
            MasterTicket.countDocuments({ severity: 'Critical', status: { $nin: ['Closed'] } }),
            MasterTicket.countDocuments({ needsManualGeo: true, status: { $nin: ['Closed'] } })
        ]);
        res.json({ total, open, critical, pendingGeo });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
