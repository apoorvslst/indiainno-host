const express = require('express');
const router = express.Router();
const { MasterTicket } = require('../models/Ticket');

let twilio, MessagingResponse;
try {
    twilio = require('twilio');
    MessagingResponse = twilio.twiml.MessagingResponse;
} catch (e) {
    console.warn('[SMS] Twilio SDK not available. SMS routes will return 503.');
}

// Webhook for incoming SMS
router.post('/inbound', async (req, res) => {
    if (!MessagingResponse) return res.status(503).json({ message: 'Twilio not configured' });

    const { Body, From } = req.body;
    const twiml = new MessagingResponse();

    console.log(`[SMS Inbound] "${Body}" from ${From}`);
    const text = (Body || '').trim().toLowerCase();

    try {
        // Contractor reports fix: "FIXED [ticket_id]"
        if (text.startsWith('fixed') || text.startsWith('resolve')) {
            const parts = text.split(' ');
            if (parts.length < 2) {
                twiml.message("Invalid format. Reply with: FIXED [ticket_id]");
                return res.type('text/xml').send(twiml.toString());
            }
            const ticketId = parts[1];

            const ticket = await MasterTicket.findById(ticketId);
            if (!ticket) {
                twiml.message("Ticket ID not found.");
                return res.type('text/xml').send(twiml.toString());
            }

            ticket.status = 'Pending_Verification';
            ticket.resolutionNotes = `Offline fix reported via SMS by ${From}`;
            ticket.resolutionTimestamp = new Date();
            await ticket.save();

            twiml.message(`Ticket ${ticketId} marked as Pending Verification.`);
            return res.type('text/xml').send(twiml.toString());
        }

        // Citizen verification
        if (text === '1' || text === '2') {
            twiml.message(text === '1' ? "Thank you for verifying! Ticket closed." : "Dispute recorded.");
            return res.type('text/xml').send(twiml.toString());
        }

        twiml.message("CivicSync: Reply FIXED [id] if you are a contractor.");
        res.type('text/xml').send(twiml.toString());

    } catch (err) {
        console.error("[SMS Error]", err);
        twiml.message("System error.");
        res.type('text/xml').send(twiml.toString());
    }
});

module.exports = router;
