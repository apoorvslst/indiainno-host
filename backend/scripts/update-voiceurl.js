require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const SID = process.env.EXOTEL_ACCOUNT_SID;
const KEY = process.env.EXOTEL_API_KEY;
const TOK = process.env.EXOTEL_API_TOKEN;
const SUB = process.env.EXOTEL_SUBDOMAIN;
const WEBHOOK = process.env.WEBHOOK_BASE_URL;
const EXOPHONE_SID = '6853874b5b6416249682b356ed7cd30e';

async function run() {
    const url = `https://${KEY}:${TOK}@${SUB}/v2_beta/Accounts/${SID}/IncomingPhoneNumbers/${EXOPHONE_SID}`;
    const newVoiceUrl = `${WEBHOOK}/incoming-handler`;
    
    console.log('Updating ExoPhone VoiceUrl...');
    console.log('  ExoPhone SID:', EXOPHONE_SID);
    console.log('  New VoiceUrl:', newVoiceUrl);
    
    try {
        const res = await axios.put(url, 
            `VoiceUrl=${encodeURIComponent(newVoiceUrl)}`,
            { 
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }, 
                timeout: 15000 
            }
        );
        console.log('SUCCESS! Status:', res.status);
        fs.writeFileSync('scripts/update-result.json', JSON.stringify(res.data, null, 2), 'utf8');
        console.log('Response saved to scripts/update-result.json');
    } catch (err) {
        const errData = {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
        };
        console.log('FAILED:', JSON.stringify(errData, null, 2));
        fs.writeFileSync('scripts/update-result.json', JSON.stringify(errData, null, 2), 'utf8');
    }
}
run();
