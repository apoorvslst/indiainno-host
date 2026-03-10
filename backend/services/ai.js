const axios = require('axios');
const FormData = require('form-data');
const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

/**
 * 1. Sarvam AI - Speech to Text (Saaras)
 * Automatically detects language and outputs native language transcript
 */
async function speechToText(audioUrl) {
    try {
        // 1. Download Twilio Recording (requires auth + .wav extension)
        const downloadUrl = audioUrl.endsWith('.wav') ? audioUrl : audioUrl + '.wav';
        const response = await axios({
            method: "get",
            url: downloadUrl,
            responseType: "stream",
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            }
        });

        // 2. Upload to Sarvam
        const form = new FormData();
        form.append('file', response.data, 'recording.wav');
        form.append('model', 'saaras:v1');

        const sarvamRes = await axios.post('https://api.sarvam.ai/speech-to-text-translate', form, {
            headers: {
                ...form.getHeaders(),
                'api-subscription-key': SARVAM_API_KEY,
            }
        });

        console.log("[Sarvam] STT Output:", sarvamRes.data);
        return {
            transcript: sarvamRes.data.transcript, // Translated english directly
            language: "unknown" // saaras translate endpoint auto detects and translates
        };

    } catch (err) {
        console.error("[Sarvam STT Error]", err?.response?.data || err.message);
        throw err;
    }
}

/**
 * 2. Groq LLM - Entity Extraction (Intent Category & Landmark)
 */
async function extractComplaintEntities(englishTranscript) {
    const prompt = `
  You are an AI assistant for a civic grievance system in India.
  Extract the following information from this spoken complaint transcript:
  1. The "intentCategory" which MUST be exactly one of: Pothole, Road_Damage, Streetlight, Power_Outage, Water_Leak, No_Water, Garbage, Sewage_Overflow, Traffic_Signal, Fire_Hazard, Noise_Complaint, Hospital_Issue, Tree_Felling, Other.
  2. The "landmark" which is any specific location, street name, area, or landmark mentioned. If none mentioned, return "".

  Transcript: "${englishTranscript}"

  Respond strictly with ONLY valid JSON format like:
  {"intentCategory": "Pothole", "landmark": "Sector 14 near park"}
  `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "mixtral-8x7b-32768",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const jsonRes = JSON.parse(chatCompletion.choices[0].message.content);
        return jsonRes;
    } catch (err) {
        console.error("[Groq Error]", err.message);
        return { intentCategory: "Other", landmark: "" };
    }
}

module.exports = {
    speechToText,
    extractComplaintEntities
};
