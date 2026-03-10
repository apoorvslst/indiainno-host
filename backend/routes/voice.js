const express = require('express');
const router = express.Router();
const { MasterTicket, RawComplaint } = require('../models/Ticket');

let twilio, VoiceResponse;
try {
    twilio = require('twilio');
    VoiceResponse = twilio.twiml.VoiceResponse;
} catch (e) {
    console.warn('[Voice] Twilio SDK not available. Voice routes will return 503.');
}

let aiService;
try {
    aiService = require('../services/ai');
} catch (e) {
    console.warn('[Voice] AI service not available:', e.message);
}

// ── Language Options ──
const LANGUAGES = {
    '1': { code: 'hi', name: 'Hindi', voice: 'Polly.Aditi' },
    '2': { code: 'en', name: 'English', voice: 'Polly.Joanna' },
    '3': { code: 'ta', name: 'Tamil', voice: 'Polly.Aditi' },
    '4': { code: 'te', name: 'Telugu', voice: 'Polly.Aditi' },
    '5': { code: 'bn', name: 'Bengali', voice: 'Polly.Aditi' },
    '6': { code: 'mr', name: 'Marathi', voice: 'Polly.Aditi' },
    '7': { code: 'gu', name: 'Gujarati', voice: 'Polly.Aditi' },
    '8': { code: 'kn', name: 'Kannada', voice: 'Polly.Aditi' },
    '9': { code: 'ml', name: 'Malayalam', voice: 'Polly.Aditi' },
};

// ── Departments (matches frontend departments.js) ──
const DEPARTMENTS = [
    { digit: '1', id: 'pwd', name: 'Public Works Department' },
    { digit: '2', id: 'water_supply', name: 'Water Supply and Sewerage' },
    { digit: '3', id: 'municipal', name: 'Municipal Corporation' },
    { digit: '4', id: 'electricity', name: 'Electricity Board' },
    { digit: '5', id: 'transport', name: 'Roads and Transport' },
    { digit: '6', id: 'health', name: 'Health Department' },
    { digit: '7', id: 'police', name: 'Police Department' },
    { digit: '8', id: 'environment', name: 'Environment and Pollution Control' },
    { digit: '9', id: 'education', name: 'Education Department' },
];

// ── Cities ──
const CITIES = [
    { digit: '1', name: 'Jaipur' },
    { digit: '2', name: 'Delhi' },
    { digit: '3', name: 'Mumbai' },
    { digit: '4', name: 'Bangalore' },
    { digit: '5', name: 'Hyderabad' },
    { digit: '6', name: 'Chennai' },
    { digit: '7', name: 'Kolkata' },
    { digit: '8', name: 'Lucknow' },
    { digit: '9', name: 'Pune' },
];

// In-memory session store for multi-step call state
const callSessions = {};

function getVoice(session) {
    return session?.voice || 'Polly.Aditi';
}

// =============================================
// STEP 1: Welcome — Select Language
// =============================================
router.post('/incoming', (req, res) => {
    if (!VoiceResponse) return res.status(503).json({ message: 'Twilio not configured' });

    const callSid = req.body.CallSid;
    callSessions[callSid] = {}; // initialize session

    const twiml = new VoiceResponse();
    const gather = twiml.gather({ numDigits: 1, action: '/api/voice/select-language' });
    gather.say({ voice: 'Polly.Aditi' },
        'Welcome to Civic Sync, the Government Grievance Redressal System. ' +
        'Please select your language. ' +
        'Press 1 for Hindi. Press 2 for English. Press 3 for Tamil. ' +
        'Press 4 for Telugu. Press 5 for Bengali. Press 6 for Marathi. ' +
        'Press 7 for Gujarati. Press 8 for Kannada. Press 9 for Malayalam.'
    );
    twiml.say({ voice: 'Polly.Aditi' }, 'We did not receive your input.');
    twiml.redirect('/api/voice/incoming');

    res.type('text/xml').send(twiml.toString());
});

// =============================================
// STEP 2: Language selected — Choose Action
// =============================================
router.post('/select-language', (req, res) => {
    if (!VoiceResponse) return res.status(503).json({ message: 'Twilio not configured' });

    const callSid = req.body.CallSid;
    const digit = req.body.Digits;
    const lang = LANGUAGES[digit];

    if (!lang) {
        const twiml = new VoiceResponse();
        twiml.say({ voice: 'Polly.Aditi' }, 'Invalid selection. Please try again.');
        twiml.redirect('/api/voice/incoming');
        return res.type('text/xml').send(twiml.toString());
    }

    // Save language in session
    if (!callSessions[callSid]) callSessions[callSid] = {};
    callSessions[callSid].language = lang.code;
    callSessions[callSid].languageName = lang.name;
    callSessions[callSid].voice = lang.voice;

    const voice = lang.voice;
    const twiml = new VoiceResponse();
    twiml.say({ voice }, `You selected ${lang.name}.`);

    const gather = twiml.gather({ numDigits: 1, action: '/api/voice/select-action' });
    gather.say({ voice },
        'Press 1 to register a new complaint. Press 2 to enquire about an existing complaint.'
    );
    twiml.say({ voice }, 'We did not receive your input.');
    twiml.redirect('/api/voice/incoming');

    res.type('text/xml').send(twiml.toString());
});

// =============================================
// STEP 3: Action selected — Route to complaint or enquiry
// =============================================
router.post('/select-action', (req, res) => {
    if (!VoiceResponse) return res.status(503).json({ message: 'Twilio not configured' });

    const callSid = req.body.CallSid;
    const session = callSessions[callSid] || {};
    const voice = getVoice(session);
    const twiml = new VoiceResponse();

    if (req.body.Digits === '1') {
        // Register complaint → select department
        const gather = twiml.gather({ numDigits: 1, action: '/api/voice/select-department' });
        gather.say({ voice },
            'Please select the department. ' +
            'Press 1 for Public Works. Press 2 for Water Supply. Press 3 for Municipal Corporation. ' +
            'Press 4 for Electricity. Press 5 for Roads and Transport. Press 6 for Health. ' +
            'Press 7 for Police. Press 8 for Environment. Press 9 for Education.'
        );
        twiml.say({ voice }, 'No input received.');
        twiml.redirect('/api/voice/incoming');
    } else if (req.body.Digits === '2') {
        // Enquire → enter ticket number
        const gather = twiml.gather({ numDigits: 6, action: '/api/voice/enquire', timeout: 10 });
        gather.say({ voice }, 'Please enter the 6 digit number from your ticket. For example, if your ticket is T K T dash 1 2 3 4 5 6, enter 1 2 3 4 5 6.');
        twiml.say({ voice }, 'No input received. Goodbye.');
    } else {
        twiml.say({ voice }, 'Invalid option.');
        twiml.redirect('/api/voice/incoming');
    }

    res.type('text/xml').send(twiml.toString());
});

// =============================================
// STEP 4a: Department selected → Select City
// =============================================
router.post('/select-department', (req, res) => {
    if (!VoiceResponse) return res.status(503).json({ message: 'Twilio not configured' });

    const callSid = req.body.CallSid;
    const session = callSessions[callSid] || {};
    const voice = getVoice(session);
    const digit = req.body.Digits;
    const dept = DEPARTMENTS.find(d => d.digit === digit);

    if (!dept) {
        const twiml = new VoiceResponse();
        twiml.say({ voice }, 'Invalid department. Please try again.');
        twiml.redirect('/api/voice/incoming');
        return res.type('text/xml').send(twiml.toString());
    }

    // Save department in session
    session.department = dept.id;
    session.departmentName = dept.name;
    callSessions[callSid] = session;

    const twiml = new VoiceResponse();
    twiml.say({ voice }, `You selected ${dept.name}.`);

    const gather = twiml.gather({ numDigits: 1, action: '/api/voice/select-city' });
    gather.say({ voice },
        'Now select your city. ' +
        'Press 1 for Jaipur. Press 2 for Delhi. Press 3 for Mumbai. ' +
        'Press 4 for Bangalore. Press 5 for Hyderabad. Press 6 for Chennai. ' +
        'Press 7 for Kolkata. Press 8 for Lucknow. Press 9 for Pune.'
    );
    twiml.say({ voice }, 'No input received.');
    twiml.redirect('/api/voice/incoming');

    res.type('text/xml').send(twiml.toString());
});

// =============================================
// STEP 4b: City selected → Record Voice Issue
// =============================================
router.post('/select-city', (req, res) => {
    if (!VoiceResponse) return res.status(503).json({ message: 'Twilio not configured' });

    const callSid = req.body.CallSid;
    const session = callSessions[callSid] || {};
    const voice = getVoice(session);
    const digit = req.body.Digits;
    const city = CITIES.find(c => c.digit === digit);

    if (!city) {
        const twiml = new VoiceResponse();
        twiml.say({ voice }, 'Invalid city. Please try again.');
        twiml.redirect('/api/voice/incoming');
        return res.type('text/xml').send(twiml.toString());
    }

    // Save city in session
    session.city = city.name;
    callSessions[callSid] = session;

    const twiml = new VoiceResponse();
    twiml.say({ voice }, `City set to ${city.name}. Now please describe your complaint and the exact location or landmark after the beep. Press any key when finished.`);
    twiml.record({
        maxLength: 60,
        playBeep: true,
        action: '/api/voice/recording-complete',
        trim: 'trim-silence'
    });

    res.type('text/xml').send(twiml.toString());
});

// =============================================
// STEP 5: Recording complete → Process & store
// =============================================
router.post('/recording-complete', async (req, res) => {
    if (!VoiceResponse) return res.status(503).json({ message: 'Twilio not configured' });

    const { RecordingUrl, CallSid, Caller } = req.body;
    const session = callSessions[CallSid] || {};
    const voice = getVoice(session);

    if (!RecordingUrl) {
        const twiml = new VoiceResponse();
        twiml.say({ voice }, 'Sorry, we did not capture your recording. Goodbye.');
        return res.type('text/xml').send(twiml.toString());
    }

    // Respond immediately
    const twiml = new VoiceResponse();
    twiml.say({ voice }, 'Thank you. Your complaint has been registered. You will receive an SMS with your ticket number shortly. Goodbye.');
    res.type('text/xml').send(twiml.toString());

    // ── Async processing ──
    try {
        console.log(`[Voice] Processing ${CallSid} from ${Caller} | Lang: ${session.languageName} | Dept: ${session.departmentName} | City: ${session.city}`);

        const crypto = require('crypto');
        const callerHash = crypto.createHash('sha256').update(Caller || "unknown").digest('hex');

        let transcriptText = 'Voice complaint (transcription pending)';
        let intentCategory = 'Other';
        let landmark = '';

        if (aiService) {
            try {
                const sttResult = await aiService.speechToText(RecordingUrl);
                transcriptText = sttResult.transcript || transcriptText;
                const entities = await aiService.extractComplaintEntities(transcriptText);
                intentCategory = entities.intentCategory || 'Other';
                landmark = entities.landmark || '';
            } catch (aiErr) {
                console.warn('[Voice] AI processing failed, saving raw:', aiErr.message);
            }
        }

        const ticket = new MasterTicket({
            intentCategory,
            description: transcriptText,
            severity: "Low",
            complaintCount: 1,
            status: "Open",
            needsManualGeo: true,
            landmark: landmark || "From voice call - needs manual review",
            audioUrl: RecordingUrl,
            department: session.department || null,
            city: session.city || "",
            source: 'voice_call'
        });
        await ticket.save();

        const rawComplaint = new RawComplaint({
            callerPhone: callerHash,
            callerPhoneRaw: Caller || "",
            audioUrl: RecordingUrl,
            status: 'Open',
            source: 'voice_call',
            transcriptOriginal: transcriptText,
            transcriptEnglish: transcriptText,
            intentCategory,
            extractedLandmark: landmark,
            department: session.department || null,
            masterTicketId: ticket._id
        });
        await rawComplaint.save();

        // Send SMS with ticket number
        try {
            const twilioService = require('../services/twilio');
            await twilioService.sendNotification(
                Caller,
                `CivicSync: Your complaint is registered.\n` +
                `Ticket: ${ticket.ticketNumber}\n` +
                `Department: ${session.departmentName || 'General'}\n` +
                `City: ${session.city || 'N/A'}\n` +
                `Language: ${session.languageName || 'N/A'}\n` +
                `Call this number again and press 2, then enter ${ticket.ticketNumber?.replace('TKT-', '')} to check status anytime.`
            );
        } catch (smsErr) {
            console.error('[Voice] SMS failed:', smsErr.message);
        }

        // Clean up session
        delete callSessions[CallSid];

    } catch (err) {
        console.error("[Voice Pipeline Failure]", err);
    }
});

// =============================================
// ENQUIRE: Ticket status lookup by number
// =============================================
router.post('/enquire', async (req, res) => {
    if (!VoiceResponse) return res.status(503).json({ message: 'Twilio not configured' });

    const callSid = req.body.CallSid;
    const session = callSessions[callSid] || {};
    const voice = getVoice(session);
    const twiml = new VoiceResponse();
    const digits = req.body.Digits;

    try {
        const ticketNumber = `TKT-${digits}`;
        const ticket = await MasterTicket.findOne({ ticketNumber });

        if (!ticket) {
            twiml.say({ voice }, `Sorry, we could not find a ticket with number ${digits}. Please check and try again.`);
            twiml.redirect('/api/voice/incoming');
        } else {
            const statusStr = ticket.status.replace(/_/g, " ");
            const progress = ticket.progressPercent || 0;
            const dept = ticket.department || 'Not assigned';
            const city = ticket.city || 'Not specified';

            twiml.say({ voice },
                `Ticket ${digits} found. ` +
                `Status: ${statusStr}. ` +
                `Department: ${dept}. ` +
                `City: ${city}. ` +
                `Repair progress: ${progress} percent. ` +
                (progress === 100 ? 'The issue has been resolved. ' : '') +
                'Thank you for calling Civic Sync. Goodbye.'
            );
        }
    } catch (e) {
        console.error('[Voice Enquire Error]', e);
        twiml.say({ voice }, 'There was a system error. Please try again later.');
    }

    // Cleanup session
    delete callSessions[callSid];
    res.type('text/xml').send(twiml.toString());
});

// =============================================
// POST /api/voice/call-me — Citizen requests a call back
// =============================================
const { protect } = require('../middleware/authMiddleware');

router.post('/call-me', protect, async (req, res) => {
    try {
        // For demo: always call the demo number from .env
        // In production: use req.user.phone instead
        const DEMO_PHONE = process.env.DEMO_PHONE_NUMBER;
        let formattedPhone = DEMO_PHONE || req.user.phone;

        if (!formattedPhone || formattedPhone.length < 10) {
            return res.status(400).json({
                message: 'No valid phone number configured. Please update your phone number.',
                needsPhone: true
            });
        }

        // Format phone number - ensure it starts with +
        formattedPhone = formattedPhone.trim();
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.replace(/^0+/, '');
            if (!formattedPhone.startsWith('91')) {
                formattedPhone = '91' + formattedPhone;
            }
            formattedPhone = '+' + formattedPhone;
        }

        const webhookBase = process.env.WEBHOOK_BASE_URL;
        if (!webhookBase) {
            return res.status(500).json({
                message: 'Server webhook URL not configured. Admin needs to set WEBHOOK_BASE_URL in .env (ngrok URL).',
                errorCode: 'NO_WEBHOOK_URL'
            });
        }

        const twilioService = require('../services/twilio');
        const callSid = await twilioService.makeCall(formattedPhone, webhookBase);

        res.json({
            success: true,
            message: `Call initiated! Your phone (${formattedPhone}) will ring shortly.`,
            callSid
        });

    } catch (err) {
        console.error('[Call-Me Error]', err);

        // Provide user-friendly Twilio error messages
        let userMessage = 'Failed to initiate call. Please try again.';
        if (err.code === 21214 || err.code === 21217) {
            userMessage = 'Your phone number is not verified with Twilio trial account. Ask admin to verify it or upgrade to a paid Twilio plan.';
        } else if (err.code === 21210) {
            userMessage = 'The Twilio phone number is not configured correctly.';
        } else if (err.message?.includes('not a valid phone number')) {
            userMessage = 'Your phone number format is invalid. Please update it in your profile (e.g. +919876543210).';
        }

        res.status(500).json({
            message: userMessage,
            twilioError: err.code || null,
            detail: err.message
        });
    }
});

// =============================================
// POST /api/voice/call-status — Twilio callback for call status
// =============================================
router.post('/call-status', (req, res) => {
    console.log(`[Voice] Call ${req.body.CallSid} status: ${req.body.CallStatus} (duration: ${req.body.CallDuration}s)`);
    res.sendStatus(200);
});

module.exports = router;
