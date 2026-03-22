const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

dotenv.config();

// Sanitize WEBHOOK_BASE_URL: strip any trailing slash to prevent double-slash in URLs
if (process.env.WEBHOOK_BASE_URL) {
    process.env.WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL.replace(/\/+$/, '');
    console.log(`🔗 WEBHOOK_BASE_URL: ${process.env.WEBHOOK_BASE_URL}`);
}

const {
    initiateCall,
    getCallDetails,
    pollForRecording,
    processInboundRecording,
    transcribeRecordingUrl,
    getDigitalDemocracyReply,
    synthesizeSpeech,
    saveResponseAudio
} = require('./services/exotelService');

// Ensure public/responses directory exists before any request can hit us
const responsesDir = path.join(__dirname, 'public', 'responses');
fs.mkdirSync(responsesDir, { recursive: true });
console.log(`📂 Ensured responses directory exists: ${responsesDir}`);

const app = express();

// Middleware
const allowedOriginPatterns = [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/,
    /^https:\/\/[a-z0-9-]+\.ngrok\.io$/
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOriginPatterns.some((pattern) => pattern.test(origin));
        if (isAllowed) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
        console.log(`${color}${req.method}\x1b[0m ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Root health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'CivicSync API (MERN)',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Config endpoint to fetch public settings without hardcoding
app.get('/api/config', (req, res) => {
    res.json({
        helplineNumber: process.env.EXOTEL_PHONE_NUMBER || "Not Configured"
    });
});

// Outbound call trigger for frontend button
app.post('/initiate-call', async (req, res) => {
    try {
        const userPhoneNumber = req.body?.number;
        if (!userPhoneNumber) {
            return res.status(400).json({ message: 'Phone number is required in body as { number }' });
        }

        const call = await initiateCall(userPhoneNumber);
        return res.json({
            success: true,
            message: 'Call initiated successfully',
            callSid: call.sid,
            from: call.from,
            to: call.to,
            url: call.url
        });
    } catch (error) {
        const exotelMessage =
            error?.response?.data?.RestException?.Message ||
            error?.response?.data?.message ||
            error.message;
        console.error('[Exotel Initiate Call Error]', error?.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: exotelMessage || 'Failed to initiate call',
            detail: error?.response?.data || error.message
        });
    }
});

// In-memory set to prevent duplicate processing for the same call
const processedCalls = new Set();

// ──────────────────────────────────────────────────────────────
// ROUTE: /incoming-handler — ExoML Webhook
//
// The Exophone has "CivicLogic ExoML" assigned.
// When a call comes in, Exotel sends a request to this URL and expects
// ExoML XML back (like Twilio's TwiML).
//
// Our response:
//   1. <Say> plays a Hindi greeting asking the caller to describe their complaint
//   2. <Record> records their voice (up to 120s, ends on #)
//   3. When recording finishes, Exotel POSTs to /recording-done with the recording URL
//   4. Then <Say> thanks them and the call ends
// ──────────────────────────────────────────────────────────────
app.all('/incoming-handler', (req, res) => {
    const callSid = req.query?.CallSid || req.body?.CallSid;
    const callFrom = req.query?.CallFrom || req.body?.CallFrom || req.query?.From || req.body?.From;
    const callTo = req.query?.CallTo || req.body?.CallTo || req.query?.To || req.body?.To;

    console.log('\n\n===================================');
    console.log('📞 INCOMING CALL (ExoML)');
    console.log('===================================');
    console.log('Method:', req.method);
    console.log('CallSid:', callSid);
    console.log('From:', callFrom);
    console.log('To:', callTo);
    console.log('Full Query:', JSON.stringify(req.query));
    console.log('Full Body:', JSON.stringify(req.body));
    console.log('===================================\n');

    // Build the recording callback URL
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000';
    const recordingDoneUrl = `${baseUrl}/recording-done`;

    // Return ExoML XML — greet, then record, then thank
    const exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Namaste! CivicSync mein aapka swagat hai. Kripya beep ke baad apni shikayat batayen. Samaapt karne ke liye hash dabayen.</Say>
    <Record action="${recordingDoneUrl}" method="POST" maxLength="120" finishOnKey="#" playBeep="true" />
    <Say>Dhanyawad! Aapki shikayat darj ho gayi hai. Hum jald se jald samaadhaan karenge.</Say>
</Response>`;

    console.log('📤 Sending ExoML response:');
    console.log(exoml);

    res.set('Content-Type', 'text/xml');
    res.status(200).send(exoml);
});

// ──────────────────────────────────────────────────────────────
// ROUTE: /recording-done — ExoML Record action callback
//
// Called by Exotel after <Record> finishes.
// Exotel sends RecordingUrl, RecordingDuration, CallSid, etc.
// We process the recording (STT → AI → ticket) in background.
// Must return ExoML XML for call to continue.
// ──────────────────────────────────────────────────────────────
app.all('/recording-done', (req, res) => {
    const callSid = req.query?.CallSid || req.body?.CallSid;
    const callFrom = req.query?.CallFrom || req.body?.CallFrom || req.query?.From || req.body?.From;
    const recordingUrl = req.query?.RecordingUrl || req.body?.RecordingUrl;
    const recordingDuration = req.query?.RecordingDuration || req.body?.RecordingDuration;

    console.log('\n\n===================================');
    console.log('🎙️ RECORDING DONE CALLBACK');
    console.log('===================================');
    console.log('CallSid:', callSid);
    console.log('From:', callFrom);
    console.log('RecordingUrl:', recordingUrl || '(none)');
    console.log('RecordingDuration:', recordingDuration || '(unknown)');
    console.log('Full Query:', JSON.stringify(req.query));
    console.log('Full Body:', JSON.stringify(req.body));
    console.log('===================================\n');

    // Return ExoML to end the call gracefully
    const exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Dhanyawad! Aapki shikayat darj ho gayi hai. Hum jald se jald samaadhaan karenge.</Say>
    <Hangup />
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.status(200).send(exoml);

    // Process the recording in the background
    if (recordingUrl && callSid && !processedCalls.has(callSid)) {
        processedCalls.add(callSid);
        const callerPhone = callFrom || 'unknown';

        (async () => {
            try {
                console.log(`\n🔄 [REC-DONE] Processing recording for ${callerPhone} (${callSid})...`);
                console.log(`   Recording URL: ${recordingUrl}`);
                const result = await processInboundRecording(recordingUrl, callerPhone);
                console.log(`✅ [REC-DONE] Ticket created: ${result.ticketNumber} | Category: ${result.category}`);
            } catch (err) {
                console.error(`❌ [REC-DONE] Failed to process recording:`, err.message);
            } finally {
                setTimeout(() => processedCalls.delete(callSid), 10 * 60 * 1000);
            }
        })();
    } else if (!recordingUrl) {
        console.log('   ⚠️ No RecordingUrl in callback — caller may have hung up without speaking');
    }
});

// ──────────────────────────────────────────────────────────────
// ROUTE: /call-status-callback — Primary recording URL receiver
//
// Exotel sends this when call status changes (e.g., completed).
// It includes RecordingUrl, CallSid, etc.
// Set this URL in account settings or when making outbound calls.
// This is FASTER than polling — recording URL comes immediately.
// ──────────────────────────────────────────────────────────────
app.all('/call-status-callback', (req, res) => {
    const callSid = req.query?.CallSid || req.body?.CallSid;
    const callFrom = req.query?.CallFrom || req.body?.CallFrom || req.query?.From || req.body?.From;
    const callStatus = req.query?.Status || req.body?.Status || req.query?.CallStatus || req.body?.CallStatus;
    const recordingUrl = req.query?.RecordingUrl || req.body?.RecordingUrl;

    console.log('\n\n===================================');
    console.log('--- CALL STATUS CALLBACK ---');
    console.log('===================================');
    console.log('CallSid:', callSid);
    console.log('Status:', callStatus);
    console.log('From:', callFrom);
    console.log('RecordingUrl:', recordingUrl || '(none)');
    console.log('Full Query:', JSON.stringify(req.query));
    console.log('Full Body:', JSON.stringify(req.body));
    console.log('===================================\n');

    res.status(200).json({ status: 'received' });

    // Process recording if we got one and haven't processed this call
    if (recordingUrl && callSid && !processedCalls.has(callSid)) {
        processedCalls.add(callSid);
        const callerPhone = callFrom || 'unknown';

        (async () => {
            try {
                console.log(`\n🎙️ [STATUS-CB] Processing recording for ${callerPhone} (${callSid})...`);
                const result = await processInboundRecording(recordingUrl, callerPhone);
                console.log(`✅ [STATUS-CB] Ticket created: ${result.ticketNumber} | Category: ${result.category}`);
            } catch (err) {
                console.error(`❌ [STATUS-CB] Failed to process recording for ${callerPhone}:`, err.message);
            } finally {
                setTimeout(() => processedCalls.delete(callSid), 10 * 60 * 1000);
            }
        })();
    }
});

// ──────────────────────────────────────────────────────────────
// ROUTE: /recording-callback — Legacy fallback
// Kept for backward compatibility in case Exotel sends recording
// via this path (e.g., from outbound calls using ExoML <Record>).
// ──────────────────────────────────────────────────────────────
app.all('/recording-callback', (req, res) => {
    const recordingUrl = req.query?.RecordingUrl || req.body?.RecordingUrl;
    const callSid = req.query?.CallSid || req.body?.CallSid;
    const callerPhone = req.query?.CallerPhone || req.body?.CallerPhone ||
                        req.query?.CallFrom || req.body?.CallFrom || 'unknown';

    console.log('\n--- RECORDING CALLBACK (legacy) ---');
    console.log('CallSid:', callSid, '| RecordingUrl:', recordingUrl || '(none)');
    console.log('Full Query:', JSON.stringify(req.query));
    console.log('Full Body:', JSON.stringify(req.body));

    res.status(200).json({ status: 'received' });

    if (recordingUrl && callSid && !processedCalls.has(callSid)) {
        processedCalls.add(callSid);
        (async () => {
            try {
                const result = await processInboundRecording(recordingUrl, callerPhone);
                console.log(`✅ [REC-CB] Ticket: ${result.ticketNumber} | Category: ${result.category}`);
            } catch (err) {
                console.error(`❌ [REC-CB] Failed:`, err.message);
            } finally {
                setTimeout(() => processedCalls.delete(callSid), 10 * 60 * 1000);
            }
        })();
    }
});

// Routes
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

// Connect DB then start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n✅ [CivicSync] Server running on http://localhost:${PORT}`);
        console.log(`📊 [API Routes]`);
        console.log(`   POST /api/auth/register`);
        console.log(`   POST /api/auth/login`);
        console.log(`   GET  /api/auth/me`);
        console.log(`   POST /api/tickets/complaint`);
        console.log(`   GET  /api/tickets/my-complaints`);
        console.log(`   GET  /api/tickets/master`);
        console.log(`   PUT  /api/tickets/master/:id`);
        console.log(`   GET  /api/users`);
        console.log(`   PUT  /api/users/:id`);
        console.log(`📞 [Voice Routes]`);
        console.log(`   ALL  /incoming-handler      (Async Passthru → polls for recording)`);
        console.log(`   ALL  /call-status-callback   (Exotel status push → recording URL)`);
        console.log(`   ALL  /recording-callback     (Legacy fallback)`);
        console.log(`   POST /initiate-call           (outbound call trigger)\n`);
    });
});
