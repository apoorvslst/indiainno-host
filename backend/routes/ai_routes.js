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

module.exports = router;
