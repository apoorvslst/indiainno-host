const dotenv = require('dotenv');

dotenv.config();

const WEBHOOK_BASE = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000';

/**
 * Validate that Twilio credentials are properly configured (not placeholders).
 */
function isTwilioConfigured() {
    const sid = process.env.TWILIO_ACCOUNT_SID || '';
    const token = process.env.TWILIO_AUTH_TOKEN || '';
    const phone = process.env.TWILIO_PHONE_NUMBER || '';

    if (!sid || !token || !phone) return false;
    // Twilio SIDs must start with 'AC'
    if (!sid.startsWith('AC')) return false;
    // Check for placeholder values
    if (sid.includes('your_') || token.includes('your_') || phone.includes('your_')) return false;

    return true;
}

function getTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!isTwilioConfigured()) {
        const missing = [];
        if (!accountSid || !accountSid.startsWith('AC')) missing.push('TWILIO_ACCOUNT_SID (must start with AC)');
        if (!authToken || authToken.includes('your_')) missing.push('TWILIO_AUTH_TOKEN');
        if (!phoneNumber || phoneNumber.includes('your_')) missing.push('TWILIO_PHONE_NUMBER');
        const err = new Error(`Twilio not configured properly: ${missing.join(', ')}. Get credentials from twilio.com/console`);
        err.code = 'TWILIO_CONFIG_MISSING';
        throw err;
    }

    // Only require twilio when we know credentials are valid
    const twilio = require('twilio');
    return {
        client: twilio(accountSid, authToken),
        phoneNumber
    };
}

/**
 * Make an outbound call using Twilio.
 * Uses inline TwiML with Language Selection IVR.
 * User selects language → describes complaint → recording is processed.
 */
async function makeCall(toNumber) {
    const { client, phoneNumber } = getTwilioClient();

    const languageSelectedUrl = `${WEBHOOK_BASE}/api/voice/language-selected`;
    const recordingCallbackUrl = `${WEBHOOK_BASE}/api/voice/recording-complete`;

    // Inline TwiML: greet → language selection → record complaint
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">Welcome to Civic Sync, the Government Grievance Redressal System.</Say>
    <Gather numDigits="1" action="${languageSelectedUrl}" method="POST" timeout="8">
        <Say voice="Polly.Aditi">Please select your language.</Say>
        <Say voice="Polly.Aditi">Press 1 for Hindi.</Say>
        <Say voice="Polly.Aditi">Press 2 for English.</Say>
        <Say voice="Polly.Aditi">Press 3 for Marathi.</Say>
        <Say voice="Polly.Aditi">Press 4 for Tamil.</Say>
        <Say voice="Polly.Aditi">Press 5 for Telugu.</Say>
        <Say voice="Polly.Aditi">Press 6 for Kannada.</Say>
        <Say voice="Polly.Aditi">Press 7 for Bengali.</Say>
    </Gather>
    <Say voice="Polly.Aditi">No input received. You can speak in any language after the beep. Press hash when done.</Say>
    <Record maxLength="120" playBeep="true" action="${recordingCallbackUrl}" finishOnKey="#" trim="trim-silence" />
    <Say voice="Polly.Aditi">We did not receive your recording. Goodbye.</Say>
</Response>`;

    console.log(`[Twilio] Calling ${toNumber} from ${phoneNumber} with language selection IVR`);

    const call = await client.calls.create({
        to: toNumber,
        from: phoneNumber,
        twiml: twiml,
        statusCallback: `${WEBHOOK_BASE}/api/voice/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    console.log(`[Twilio] Call initiated: ${call.sid}`);
    return { callSid: call.sid };
}

/**
 * Send an SMS notification via Twilio
 */
async function sendNotification(to, body) {
    try {
        const { client, phoneNumber } = getTwilioClient();
        const message = await client.messages.create({
            body: body,
            from: phoneNumber,
            to: to
        });
        console.log(`[Twilio] SMS sent to ${to}: ${message.sid}`);
        return message.sid;
    } catch (err) {
        console.error(`[Twilio] SMS failed to ${to}:`, err.message);
        throw err;
    }
}

module.exports = {
    makeCall,
    sendNotification,
    getTwilioClient,
    isTwilioConfigured
};
