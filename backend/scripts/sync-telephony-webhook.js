const axios = require('axios');

async function syncTelephonyWebhooks(newWebhookUrl) {
    if (!newWebhookUrl) return;

    // Remove any trailing slashes from the base url
    const baseUrl = newWebhookUrl.replace(/\/+$/, '');
    const provider = process.env.VOICE_OUTBOUND_PROVIDER || 'exotel';

    if (provider === 'twilio') {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !twilioNumber) {
            console.log('[Telephony Sync] Twilio credentials missing in .env. Skipping auto-sync.');
            return;
        }

        try {
            console.log(`[Telephony Sync] Initiating Twilio URL update for ${twilioNumber}...`);

            // 1. Fetch phone number SID using the raw string
            const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(twilioNumber)}`;
            const searchRes = await axios.get(searchUrl, {
                auth: { username: accountSid, password: authToken }
            });

            const numberRecord = searchRes.data?.incoming_phone_numbers?.[0];
            if (!numberRecord) {
                console.log(`[Telephony Sync] Could not locate ${twilioNumber} in this Twilio account.`);
                return;
            }

            const sid = numberRecord.sid;
            const newVoiceUrl = `${baseUrl}/api/voice/incoming`;
            const newStatusCallback = `${baseUrl}/api/voice/call-status`;

            if (numberRecord.voice_url === newVoiceUrl) {
                console.log(`[Telephony Sync] Your Twilio number is already synced to this remote tunnel!`);
                return;
            }

            // 2. Perform the update
            const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`;
            const params = new URLSearchParams();
            params.append('VoiceUrl', newVoiceUrl);
            params.append('VoiceMethod', 'POST');
            params.append('StatusCallback', newStatusCallback);
            params.append('StatusCallbackMethod', 'POST');

            await axios.post(updateUrl, params.toString(), {
                auth: { username: accountSid, password: authToken },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            console.log(`[Telephony Sync] ✅ Twilio Webhook Auto-Update Complete! The numbers will now route to your local backend.`);
        } catch (err) {
            console.error(`[Telephony Sync] ❌ Failed to update Twilio Webhooks:`, err.response?.data?.message || err.message);
        }
    } else {
        // Exotel Manual Warning Let-it-be
        console.log(`\n======================================================`);
        console.log(`[Telephony Sync] ⚠️ WARNING: TELEPHONY NOT AUTO-SYNCED`);
        console.log(`[Telephony Sync] Your .env specifies you are using Exotel ('VOICE_OUTBOUND_PROVIDER').`);
        console.log(`[Telephony Sync] Exotel does not allow developers to update visual App URLs via an API endpoint.`);
        console.log(`[Telephony Sync] You MUST manually log into your Exotel Dashboard, edit your Call Flow App, and set the Passthru URL to:`);
        console.log(`                 ${baseUrl}/api/voice/incoming`);
        console.log(`======================================================\n`);
    }
}

module.exports = syncTelephonyWebhooks;
