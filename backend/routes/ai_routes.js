const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const aiService = require('../services/ai');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/ai/voice-form-fill
 * Accepts an audio file, transcribes it via Sarvam, and classifies it via Groq.
 * Returns structured data to auto-fill the complaint form.
 */
router.post('/voice-form-fill', protect, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No audio file uploaded' });
        }

        console.log(`[AI Routes] Processing voice form fill request. File size: ${req.file.size} bytes`);

        // 1. STT via Sarvam from Buffer
        const sttResult = await aiService.speechToTextFromBuffer(req.file.buffer, req.file.mimetype);
        const transcript = sttResult.transcript;

        if (!transcript || transcript.trim().length === 0) {
            return res.status(422).json({ message: 'Could not transcribe audio. Please speak clearly.' });
        }

        console.log(`[AI Routes] Transcript: "${transcript}"`);

        // 2. Classification/Entity Extraction via Groq
        const classification = await aiService.classifyComplaint(transcript);

        res.json({
            success: true,
            transcript,
            ...classification
        });

    } catch (err) {
        console.error('[AI Routes Error]', err.response?.data || err.message);
        const status = err.response?.status || 500;
        const message = err.response?.data?.message || err.message || 'Internal server error during voice processing';
        res.status(status).json({ message, error: err.message });
    }
});

/**
 * POST /api/ai/voice-scheme-search
 * Accepts an audio file, transcribes via Sarvam, and extracts the core scheme search query via Groq.
 */
router.post('/voice-scheme-search', protect, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No audio file uploaded' });
        }

        console.log(`[AI Routes] Processing voice scheme search. File size: ${req.file.size} bytes`);

        // 1. STT via Sarvam
        const sttResult = await aiService.speechToTextFromBuffer(req.file.buffer, req.file.mimetype);
        const transcript = sttResult.transcript;

        if (!transcript || transcript.trim().length === 0) {
            return res.json({
                success: false,
                message: "We couldn't hear you clearly. Please hold the microphone button and speak."
            });
        }

        console.log(`[AI Routes] Scheme Search Transcript: "${transcript}"`);

        // 2. Extract Query via Groq
        const extraction = await aiService.extractSchemeQuery(transcript);

        res.json({
            success: true,
            transcript,
            query: extraction.query,
            language: extraction.language
        });

    } catch (err) {
        console.error('[AI Routes Voice Scheme Error]', err.message);
        res.status(500).json({ message: 'Failed to process voice search', error: err.message });
    }
});

/**
 * POST /api/ai/scheme-details
 * Generates an overview, deadlines, and a safe link for a given scheme name.
 */
router.post('/scheme-details', protect, async (req, res) => {
    try {
        const { schemeName } = req.body;
        if (!schemeName) {
            return res.status(400).json({ message: 'Scheme name is required' });
        }

        console.log(`[AI Routes] Generating details for scheme: ${schemeName}`);
        const details = await aiService.generateSchemeDetails(schemeName);

        res.json({ success: true, ...details });

    } catch (err) {
        console.error('[AI Routes Scheme Details Error]', err.message);
        res.status(500).json({ message: 'Failed to generate scheme details' });
    }
});

module.exports = router;
