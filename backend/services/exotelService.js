const axios = require('axios');
const Groq = require('groq-sdk');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const FormData = require('form-data');
const { MasterTicket, RawComplaint } = require('../models/Ticket');

const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOTEL_ACCOUNT_SID = process.env.EXOTEL_ACCOUNT_SID || process.env.EXOTEL_SID;
const EXOTEL_SUBDOMAIN = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
const EXOTEL_PHONE_NUMBER = process.env.EXOTEL_PHONE_NUMBER;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL;
const PUBLIC_ASSET_PATH = process.env.PUBLIC_ASSET_PATH || 'public/responses';
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const groq = new Groq({ apiKey: GROQ_API_KEY });

// Keep this aligned with your existing Digital Democracy system prompt.
const DIGITAL_DEMOCRACY_SYSTEM_PROMPT = process.env.DIGITAL_DEMOCRACY_SYSTEM_PROMPT ||
    'You are Digital Democracy, a civic grievance AI assistant for India. Provide clear, practical, empathetic responses for citizen complaints and civic issues.';

const exotelClient = axios.create({
    baseURL: `https://${EXOTEL_SUBDOMAIN}/v1/Accounts/${EXOTEL_ACCOUNT_SID}`,
    auth: {
        username: EXOTEL_API_KEY || '',
        password: EXOTEL_API_TOKEN || ''
    },
    timeout: 30000
});

/**
 * Fetch call details from Exotel to retrieve the RecordingUrl.
 * Exotel Call Details API: GET /v1/Accounts/{sid}/Calls/{callSid}.json
 * The recording URL may only be available after the call has ended (5-20 min delay).
 */
async function getCallDetails(callSid) {
    if (!callSid) throw new Error('Missing callSid');
    const response = await exotelClient.get(`/Calls/${callSid}.json`);
    const callData = response.data?.Call || response.data;
    return {
        sid: callData.Sid || callData.sid,
        status: callData.Status || callData.status,
        recordingUrl: callData.RecordingUrl || callData.recording_url || callData.RecordingURL || null,
        from: callData.From || callData.from,
        to: callData.To || callData.to,
        duration: callData.Duration || callData.duration,
        raw: callData
    };
}

/**
 * Poll Exotel Call Details API until the call is complete and has a recording URL.
 * Retries up to `maxAttempts` times with `delayMs` between each attempt.
 */
async function pollForRecording(callSid, { maxAttempts = 10, delayMs = 30000 } = {}) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`   🔄 Polling attempt ${attempt}/${maxAttempts} for CallSid ${callSid}...`);
        try {
            const details = await getCallDetails(callSid);
            console.log(`   Status: ${details.status}, RecordingUrl: ${details.recordingUrl || '(not yet)'}`);

            if (details.recordingUrl) {
                console.log(`   ✅ Recording URL found on attempt ${attempt}`);
                return details;
            }

            // If call is still in-progress, wait and retry
            const status = (details.status || '').toLowerCase();
            if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
                // Call ended but no recording yet — keep polling a bit
                if (attempt >= maxAttempts) {
                    console.log(`   ⚠️ Call ended (${status}) but no recording URL after ${maxAttempts} attempts`);
                    return details;
                }
            }
        } catch (err) {
            console.error(`   ⚠️ Poll attempt ${attempt} failed:`, err.message);
        }

        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return null;
}

function normalizeIndianPhone(userPhoneNumber = '') {
    const digits = String(userPhoneNumber).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (digits.length === 13 && digits.startsWith('0')) return `+${digits.slice(1)}`;
    return userPhoneNumber.startsWith('+') ? userPhoneNumber : `+${digits}`;
}

async function initiateCall(userPhoneNumber) {
    if (!EXOTEL_PHONE_NUMBER) {
        throw new Error('Missing EXOTEL_PHONE_NUMBER');
    }
    if (!WEBHOOK_BASE_URL) {
        throw new Error('Missing WEBHOOK_BASE_URL');
    }

    const toNumber = normalizeIndianPhone(userPhoneNumber);
    if (!toNumber) {
        throw new Error('Invalid user phone number');
    }

    const callbackUrl = `${WEBHOOK_BASE_URL}/civic-logic`;
    const formBody = new URLSearchParams({
        From: EXOTEL_PHONE_NUMBER,
        To: toNumber,
        CallerId: EXOTEL_PHONE_NUMBER,
        Url: callbackUrl,
        CallType: 'trans'
    });

    const response = await exotelClient.post('/Calls/connect.json', formBody.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
    });

    const sid = response.data?.Call?.Sid || response.data?.Call?.sid || response.data?.sid || null;
    return {
        sid,
        to: toNumber,
        from: EXOTEL_PHONE_NUMBER,
        url: callbackUrl,
        raw: response.data
    };
}

function escapeXml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ──────────────────────────────────────────────────────────────
// CLASSIFY PROMPT — ask AI to extract category + department from transcript
// ──────────────────────────────────────────────────────────────
const CLASSIFY_SYSTEM_PROMPT = `You are a civic complaint classifier for India.
Given a citizen's voice complaint transcript, extract:
1. category — one of: Road_Damage, Water_Supply, Drainage_Sewage, Garbage_Waste, Street_Light, Traffic, Noise_Pollution, Encroachment, Public_Safety, Other
2. department — the government department responsible (e.g., PWD, Water Board, BBMP, Traffic Police, Electricity Board, Municipal Corporation, Health Department, or null if unclear)
3. description — a clean, one-line English summary of the complaint
4. landmark — any location/landmark mentioned, or empty string

Respond ONLY with valid JSON: {"category":"...","department":"...","description":"...","landmark":""}`;

/**
 * Process an inbound voicemail recording end-to-end:
 * 1. Download recording from Exotel (with auth)
 * 2. Transcribe via Sarvam STT
 * 3. Classify via Groq AI → extract category, department, description
 * 4. Save as MasterTicket + RawComplaint in MongoDB
 */
async function processInboundRecording(recordingUrl, callerPhone) {
    console.log(`\n🎙️ [processInboundRecording] Starting for ${callerPhone}`);
    console.log(`   RecordingUrl: ${recordingUrl}`);

    // Step 1: Transcribe
    let transcript = '';
    try {
        transcript = await transcribeRecordingUrl(recordingUrl);
        console.log(`   ✅ Transcript: "${transcript}"`);
    } catch (err) {
        console.error('   ❌ STT failed:', err.message);
        // Save with empty transcript so we don't lose the recording
        transcript = '[Transcription failed]';
    }

    // Step 2: Classify via AI
    let category = 'Other';
    let department = null;
    let description = transcript;
    let landmark = '';

    try {
        const classifyResult = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            messages: [
                { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
                { role: 'user', content: transcript || 'Empty recording — no speech detected' }
            ]
        });

        const raw = classifyResult.choices?.[0]?.message?.content?.trim() || '{}';
        console.log(`   AI raw response: ${raw}`);

        // Parse JSON — handle markdown-wrapped code blocks
        const jsonStr = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(jsonStr);
        category = parsed.category || 'Other';
        department = parsed.department || null;
        description = parsed.description || transcript;
        landmark = parsed.landmark || '';
        console.log(`   ✅ Classified: category=${category}, department=${department}`);
    } catch (err) {
        console.error('   ⚠️ Classification failed, defaulting to Other:', err.message);
    }

    // Step 3: Save ticket
    try {
        const masterTicket = new MasterTicket({
            intentCategory: category,
            description: description,
            severity: 'Low',
            complaintCount: 1,
            status: 'Open',
            department: department,
            needsManualGeo: true,
            landmark: landmark,
            audioUrl: recordingUrl,
            source: 'voice_call'
        });
        await masterTicket.save();
        console.log(`   ✅ MasterTicket saved: ${masterTicket.ticketNumber} (${masterTicket._id})`);

        const rawComplaint = new RawComplaint({
            callerPhone: callerPhone,
            callerPhoneRaw: callerPhone,
            audioUrl: recordingUrl,
            transcriptOriginal: transcript,
            transcriptEnglish: description,
            intentCategory: category,
            extractedLandmark: landmark,
            department: department,
            source: 'voice_call',
            status: 'Open',
            masterTicketId: masterTicket._id
        });
        await rawComplaint.save();
        console.log(`   ✅ RawComplaint saved: ${rawComplaint._id}`);

        return {
            success: true,
            ticketNumber: masterTicket.ticketNumber,
            ticketId: masterTicket._id,
            category,
            description
        };
    } catch (err) {
        console.error('   ❌ Failed to save ticket:', err.message);
        throw err;
    }
}

async function downloadRecordingAsBuffer(recordingUrl) {
    const response = await axios.get(recordingUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        // Exotel recording URLs require Basic Auth
        auth: {
            username: EXOTEL_API_KEY || '',
            password: EXOTEL_API_TOKEN || ''
        }
    });
    return Buffer.from(response.data);
}

async function transcribeRecordingUrl(recordingUrl) {
    if (!SARVAM_API_KEY) {
        throw new Error('Missing SARVAM_API_KEY');
    }

    const recordingBuffer = await downloadRecordingAsBuffer(recordingUrl);

    const form = new FormData();
    form.append('file', recordingBuffer, {
        filename: 'recording.wav',
        contentType: 'audio/wav'
    });
    form.append('model', 'saaras:v1');

    const sttResponse = await axios.post(
        'https://api.sarvam.ai/speech-to-text-translate',
        form,
        {
            headers: {
                ...form.getHeaders(),
                'api-subscription-key': SARVAM_API_KEY
            },
            timeout: 120000
        }
    );

    return sttResponse.data?.transcript || '';
}

async function getDigitalDemocracyReply(userText) {
    if (!GROQ_API_KEY) {
        throw new Error('Missing GROQ_API_KEY');
    }

    const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        messages: [
            { role: 'system', content: DIGITAL_DEMOCRACY_SYSTEM_PROMPT },
            { role: 'user', content: userText }
        ]
    });

    let reply = completion.choices?.[0]?.message?.content?.trim() || 'Thank you for reporting this issue. Your complaint has been recorded.';
    // Truncate long replies — Sarvam TTS can fail on very long text and Exotel will timeout
    if (reply.length > 500) {
        reply = reply.substring(0, 497) + '...';
    }
    return reply;
}

function normalizeSarvamAudio(responseData) {
    if (!responseData) return null;

    const maybeBase64 =
        responseData.audio ||
        responseData.audio_data ||
        responseData.audioContent ||
        responseData.audios?.[0]?.audio;

    if (maybeBase64) {
        return Buffer.from(maybeBase64, 'base64');
    }

    return null;
}

async function synthesizeSpeech(text) {
    if (!SARVAM_API_KEY) {
        throw new Error('Missing SARVAM_API_KEY');
    }

    const payload = {
        text,
        target_language_code: 'en-IN',
        speaker: 'anushka',
        pitch: 0,
        pace: 1,
        loudness: 1,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v1'
    };

    try {
        const ttsJsonResponse = await axios.post('https://api.sarvam.ai/text-to-speech', payload, {
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': SARVAM_API_KEY
            },
            timeout: 120000
        });

        const jsonAudioBuffer = normalizeSarvamAudio(ttsJsonResponse.data);
        if (jsonAudioBuffer) {
            return { buffer: jsonAudioBuffer, extension: 'mp3' };
        }
    } catch (jsonErr) {
        // Fall through to binary mode for compatibility with different Sarvam response types.
        console.warn('[Sarvam TTS] JSON mode failed, retrying in binary mode:', jsonErr.message);
    }

    const ttsBinaryResponse = await axios.post('https://api.sarvam.ai/text-to-speech', payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': SARVAM_API_KEY,
            Accept: 'audio/mpeg'
        },
        responseType: 'arraybuffer',
        timeout: 120000
    });

    return { buffer: Buffer.from(ttsBinaryResponse.data), extension: 'mp3' };
}

async function saveResponseAudio(buffer, extension = 'mp3') {
    // PUBLIC_ASSET_PATH is "public/responses" — save inside backend/public/responses/
    // Express in server.js serves: app.use('/public', express.static(path.join(__dirname, 'public')))
    // So the URL must be WEBHOOK_BASE_URL/public/responses/<file>
    const normalizedAssetPath = PUBLIC_ASSET_PATH.replace(/^\/+/, '').replace(/\\/g, '/').replace(/\/+$/, '');
    // __dirname = backend/services/, so go up one level to backend/, then into public/responses/
    const responsesDir = path.join(__dirname, '..', ...normalizedAssetPath.split('/'));
    await fs.mkdir(responsesDir, { recursive: true });

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const absoluteFilePath = path.join(responsesDir, fileName);
    await fs.writeFile(absoluteFilePath, buffer);

    // Defensive: strip any trailing slash from base URL
    const baseUrl = (WEBHOOK_BASE_URL || '').replace(/\/+$/, '');
    const audioUrl = `${baseUrl}/${normalizedAssetPath}/${fileName}`;
    console.log('[saveResponseAudio] File saved to:', absoluteFilePath);
    console.log('[saveResponseAudio] Public URL:', audioUrl);
    return audioUrl;
}

module.exports = {
    exotelClient,
    initiateCall,
    getCallDetails,
    pollForRecording,
    processInboundRecording,
    transcribeRecordingUrl,
    getDigitalDemocracyReply,
    synthesizeSpeech,
    saveResponseAudio
};
