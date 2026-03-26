require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const axios = require('axios');

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

async function updateTwilioWebhook() {
    try {
        const tunnels = await axios.get('http://127.0.0.1:4040/api/tunnels');
        const publicUrl = tunnels.data.tunnels[0].public_url.replace(/\/+$/, '');
        
        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        
        const numbers = await axios.get(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers.json`,
            { headers: { Authorization: `Basic ${auth}` } }
        );
        
        const myNumber = numbers.data.incoming_phone_numbers.find(
            n => n.phone_number === TWILIO_NUMBER || n.phone_number.includes(TWILIO_NUMBER.replace('+', ''))
        );
        
        if (!myNumber) {
            console.log('❌ Phone number not found. Available:', numbers.data.incoming_phone_numbers.map(n => n.phone_number).join(', '));
            return;
        }
        
        await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers/${myNumber.sid}.json`,
            new URLSearchParams({
                voice_url: `${publicUrl}/api/voice/incoming`,
                sms_url: `${publicUrl}/api/sms/incoming`
            }),
            { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        console.log(`✅ Updated Twilio webhook to: ${publicUrl}/api/voice/incoming`);
    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

updateTwilioWebhook();