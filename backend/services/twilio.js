const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Send SMS/WhatsApp Notification
 */
async function sendNotification(to, body) {
    try {
        const message = await client.messages.create({
            body: body,
            from: TWILIO_NUMBER,
            to: to
        });
        console.log(`[Twilio] Message sent to ${to}: ${message.sid}`);
        return message.sid;
    } catch (err) {
        console.error(`[Twilio Error] Failed to send to ${to}`, err.message);
        throw err;
    }
}

/**
 * Make an outbound call using inline TwiML (no webhook needed!)
 * Twilio reads the TwiML directly — no ngrok dependency for the IVR.
 */
async function makeCall(to, webhookBaseUrl) {
    try {
        // Build the full IVR TwiML inline so Twilio doesn't need to hit a webhook
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="${webhookBaseUrl}/api/voice/select-language">
        <Say voice="Polly.Aditi">Welcome to Civic Sync, the Government Grievance Redressal System. Please select your language. Press 1 for Hindi. Press 2 for English. Press 3 for Tamil. Press 4 for Telugu. Press 5 for Bengali. Press 6 for Marathi. Press 7 for Gujarati. Press 8 for Kannada. Press 9 for Malayalam.</Say>
    </Gather>
    <Say voice="Polly.Aditi">We did not receive your input. Goodbye.</Say>
</Response>`;

        const call = await client.calls.create({
            to: to,
            from: TWILIO_NUMBER,
            twiml: twiml,  // Use inline TwiML instead of URL
        });
        console.log(`[Twilio] Outbound call initiated to ${to}: ${call.sid}`);
        return call.sid;
    } catch (err) {
        console.error(`[Twilio Error] Failed to call ${to}`, err.message);
        throw err;
    }
}

module.exports = {
    sendNotification,
    makeCall
};
