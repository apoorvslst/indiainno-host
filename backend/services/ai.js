const axios = require('axios');
const FormData = require('form-data');
const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

/**
 * 1. Sarvam AI - Speech to Text (Saaras)
 * Downloads audio from a URL, sends to Sarvam for transcription + translation.
 * Automatically detects Indian language and outputs English transcript.
 */
async function speechToText(audioUrl) {
    try {
        // 1. Download recording audio. 
        // Some providers (like Exotel) might need .wav appended if not present.
        const downloadUrl = (audioUrl && !audioUrl.includes('.')) ? audioUrl + '.wav' : audioUrl;

        console.log(`[Sarvam] Downloading audio from: ${downloadUrl}`);
        const response = await axios({
            method: "get",
            url: downloadUrl,
            responseType: "arraybuffer", // arraybuffer is more compatible with FormData + Buffer.from
            timeout: 30000,
        });

        // 2. Upload to Sarvam
        const form = new FormData();
        form.append('file', Buffer.from(response.data), {
            filename: 'recording.wav',
            contentType: 'audio/wav'
        });
        form.append('model', 'saaras:v2');

        const sarvamRes = await axios.post('https://api.sarvam.ai/speech-to-text-translate', form, {
            headers: {
                ...form.getHeaders(),
                'api-subscription-key': SARVAM_API_KEY,
            },
            timeout: 30000,
        });

        console.log("[Sarvam] STT Output:", sarvamRes.data);
        return {
            transcript: sarvamRes.data.transcript || '',
            language: sarvamRes.data.language_code || 'unknown'
        };

    } catch (err) {
        console.error("[Sarvam STT Error]", err?.response?.data || err.message);
        throw err;
    }
}

/**
 * 1b. Sarvam AI - Speech to Text from Buffer
 * Accepts raw audio buffer for direct processing.
 */
async function speechToTextFromBuffer(audioBuffer, mimeType = 'audio/webm') {
    try {
        const ext = mimeType.includes('wav') ? 'wav' :
            mimeType.includes('mp3') ? 'mp3' :
                mimeType.includes('ogg') ? 'ogg' : 'webm';

        const form = new FormData();
        form.append('file', audioBuffer, {
            filename: `recording.${ext}`,
            contentType: mimeType
        });
        form.append('model', 'saaras:v2');

        const sarvamRes = await axios.post('https://api.sarvam.ai/speech-to-text-translate', form, {
            headers: {
                ...form.getHeaders(),
                'api-subscription-key': SARVAM_API_KEY,
            },
            timeout: 30000,
        });

        console.log("[Sarvam] STT Buffer Output:", sarvamRes.data);
        return {
            transcript: sarvamRes.data.transcript || '',
            language: sarvamRes.data.language_code || 'unknown'
        };
    } catch (err) {
        console.error("[Sarvam STT Buffer Error]", err?.response?.data || err.message);
        throw err;
    }
}

/**
 * 2. Groq LLM - Full complaint classification
 * Takes an English transcript, returns intentCategory, department, landmark, severity, description.
 */
async function classifyComplaint(englishTranscript) {
    const prompt = `
You are an AI assistant for a civic grievance system in India called CivicSync.
Analyze this citizen complaint transcript and extract structured data.

The "department" MUST be exactly ONE of these IDs:
pwd, water_supply, municipal, electricity, transport, health, police, fire, environment, education, revenue, social_welfare, food_civil, urban_dev, telecom, forest

The "intentCategory" MUST be exactly ONE of these:
Pothole, Road_Damage, Bridge_Issue, Building_Maintenance,
Water_Leak, No_Water, Sewage_Overflow, Drainage_Block,
Garbage, Park_Maintenance, Encroachment, Illegal_Construction,
Streetlight, Power_Outage, Transformer_Issue, Illegal_Wiring,
Traffic_Signal, Bus_Stop_Damage, Missing_Signage, Road_Marking,
Hospital_Issue, Disease_Outbreak, Sanitation_Hazard, Medical_Emergency,
Safety_Concern, Traffic_Violation, Noise_Complaint, Anti_Social,
Fire_Hazard, Building_Safety, Emergency_Access_Block,
Air_Pollution, Water_Pollution, Noise_Pollution, Illegal_Dumping,
School_Infrastructure, Mid_Day_Meal, Teacher_Absence,
Land_Encroachment, Property_Dispute, Missing_Records,
Pension_Issue, Welfare_Scheme, Discrimination_Report,
Ration_Issue, Price_Violation, Food_Adulteration,
Planning_Violation, Housing_Scheme, Building_Permit,
Tower_Issue, Connectivity, Digital_Service,
Tree_Felling, Wildlife_Issue, Forest_Encroachment,
Other

Transcript: "${englishTranscript}"

Respond strictly with ONLY valid JSON:
{
  "intentCategory": "...",
  "department": "...",
  "landmark": "any specific location/street/area mentioned, or empty string",
  "description": "a clean concise 1-2 sentence summary of the complaint in English",
  "severity": "Low or Medium or High or Critical based on urgency"
}
`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "mixtral-8x7b-32768",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const jsonRes = JSON.parse(chatCompletion.choices[0].message.content);
        console.log("[Groq] Classification:", jsonRes);
        return jsonRes;
    } catch (err) {
        console.error("[Groq Error]", err.message);
        return {
            intentCategory: "Other",
            department: "municipal",
            landmark: "",
            description: englishTranscript,
            severity: "Low"
        };
    }
}

/**
 * Legacy: Entity extraction (backward compatibility)
 */
async function extractComplaintEntities(englishTranscript) {
    const result = await classifyComplaint(englishTranscript);
    return {
        intentCategory: result.intentCategory,
        landmark: result.landmark
    };
}

module.exports = {
    speechToText,
    speechToTextFromBuffer,
    classifyComplaint,
    extractComplaintEntities
};
