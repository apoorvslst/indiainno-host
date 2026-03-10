const express = require('express');
const router = express.Router();
const { MasterTicket, RawComplaint } = require('../models/Ticket');
const { protect, authorize } = require('../middleware/authMiddleware');

const SEVERITY_THRESHOLDS = { Medium: 3, High: 10, Critical: 25 };
const DEDUP_RADIUS_METERS = 50;

function calculateSeverity(count) {
    if (count >= SEVERITY_THRESHOLDS.Critical) return "Critical";
    if (count >= SEVERITY_THRESHOLDS.High) return "High";
    if (count >= SEVERITY_THRESHOLDS.Medium) return "Medium";
    return "Low";
}

// Helper: Format ticket for frontend
function formatTicket(t) {
    const obj = t.toObject ? t.toObject() : t;
    return {
        ...obj,
        id: obj._id,
        lat: obj.location ? obj.location.coordinates[1] : null,
        lng: obj.location ? obj.location.coordinates[0] : null,
    };
}

// ─── POST /api/tickets/complaint ─── Submit a new complaint
router.post('/complaint', protect, async (req, res) => {
    try {
        const { category, description, landmark, lat, lng, accuracy, department } = req.body;

        if (!category) {
            return res.status(400).json({ message: 'Category is required' });
        }
        if (!description) {
            return res.status(400).json({ message: 'Description is required' });
        }

        let matchingTicket = null;
        let isNew = false;

        // Spatial deduplication using MongoDB 2dsphere
        if (lat && lng) {
            try {
                const nearbyTickets = await MasterTicket.find({
                    intentCategory: category,
                    status: { $nin: ['Closed', 'Invalid_Spam'] },
                    location: {
                        $near: {
                            $geometry: { type: "Point", coordinates: [lng, lat] },
                            $maxDistance: DEDUP_RADIUS_METERS
                        }
                    }
                }).limit(1);

                if (nearbyTickets.length > 0) {
                    matchingTicket = nearbyTickets[0];
                }
            } catch (geoErr) {
                // If 2dsphere index doesn't exist yet, skip dedup
                console.warn('[Dedup] Geo query failed (index may not exist yet):', geoErr.message);
            }
        }

        if (matchingTicket) {
            matchingTicket.complaintCount += 1;
            matchingTicket.severity = calculateSeverity(matchingTicket.complaintCount);
            if (!matchingTicket.department && department) matchingTicket.department = department;
            await matchingTicket.save();
        } else {
            isNew = true;
            matchingTicket = new MasterTicket({
                intentCategory: category,
                description: description,
                severity: "Low",
                complaintCount: 1,
                status: "Open",
                department: department || null,
                needsManualGeo: (!lat || !lng),
                landmark: landmark || "",
                city: req.user.city || "",
                location: (lat && lng) ? { type: "Point", coordinates: [lng, lat] } : undefined
            });
            await matchingTicket.save();
        }

        // Save raw complaint
        const complaint = new RawComplaint({
            userId: req.user._id,
            transcriptOriginal: description,
            transcriptEnglish: description,
            intentCategory: category,
            extractedLandmark: landmark || '',
            location: (lat && lng) ? { type: "Point", coordinates: [lng, lat] } : undefined,
            geoAccuracy: accuracy,
            department: department,
            source: 'web_form',
            status: matchingTicket.status,
            masterTicketId: matchingTicket._id
        });
        await complaint.save();

        res.status(201).json({
            ticketId: matchingTicket._id,
            isNew,
            ticket: formatTicket(matchingTicket),
            needsManualGeo: matchingTicket.needsManualGeo
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
            .populate('masterTicketId')
            .sort({ createdAt: -1 });

        const enriched = complaints.map(c => ({
            ...c.toObject(),
            id: c._id,
            ticket: c.masterTicketId ? { ...c.masterTicketId.toObject(), id: c.masterTicketId._id } : null
        }));
        res.json(enriched);
    } catch (err) {
        console.error('[My Complaints Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/tickets/master ─── All master tickets (filtered by role)
router.get('/master', protect, async (req, res) => {
    try {
        const query = {};
        if (req.user.city) {
            query.city = req.user.city;
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

// ─── PUT /api/tickets/master/:id ─── Update ticket
router.put('/master/:id', protect, async (req, res) => {
    try {
        const ticket = await MasterTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // Dynamic field updates
        const allowedFields = ['status', 'assignedEngineerId', 'needsManualGeo', 'resolutionNotes', 'severity', 'complaintCount', 'department', 'landmark', 'city', 'progressPercent'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'assignedEngineerId' && !req.body[field]) {
                    ticket[field] = null;
                } else {
                    ticket[field] = req.body[field];
                }
            }
        });

        // Manual coordinate fix from Admin
        if (req.body.lat && req.body.lng) {
            ticket.location = { type: 'Point', coordinates: [req.body.lng, req.body.lat] };
        }

        // Engineer resolution submission
        if (req.body.resolutionLat && req.body.resolutionLng) {
            ticket.resolutionLocation = { type: 'Point', coordinates: [req.body.resolutionLng, req.body.resolutionLat] };
            ticket.resolutionImageUrl = req.body.resolutionImageUrl;
            ticket.resolutionTimestamp = new Date();
            ticket.status = 'Pending_Verification';
        }

        await ticket.save();
        res.json(formatTicket(ticket));
    } catch (err) {
        console.error('[Ticket Update Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// ─── PUT /api/tickets/master/:id/verify ─── Citizen verifies resolution
router.put('/master/:id/verify', protect, async (req, res) => {
    try {
        const ticket = await MasterTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const { verified, rating, feedback } = req.body;

        if (verified) {
            ticket.status = 'Closed';
        } else {
            ticket.status = 'Disputed';
        }

        if (rating !== undefined) ticket.citizenRating = rating;
        if (feedback !== undefined) ticket.citizenFeedback = feedback;

        await ticket.save();
        res.json(formatTicket(ticket));
    } catch (err) {
        console.error('[Ticket Verify Error]', err);
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
