require('dotenv').config();
const axios = require('axios');

const SID = process.env.EXOTEL_ACCOUNT_SID;
const KEY = process.env.EXOTEL_API_KEY;
const TOK = process.env.EXOTEL_API_TOKEN;
const SUB = process.env.EXOTEL_SUBDOMAIN;
const EXOPHONE_SID = '6853874b5b6416249682b356ed7cd30e';

// New flow ID (the one we just created with Greeting + Passthru + Greeting + Hangup)
const NEW_FLOW_ID = '1209471';
// The VoiceUrl format Exotel expects
const NEW_VOICE_URL = `https://my.exotel.com/${SID}/exoml/start_voice/${NEW_FLOW_ID}`;

async function assignFlow() {
    const url = `https://${KEY}:${TOK}@${SUB}/v2_beta/Accounts/${SID}/IncomingPhoneNumbers/${EXOPHONE_SID}`;
    
    console.log('Assigning new flow to ExoPhone...');
    console.log('  ExoPhone SID:', EXOPHONE_SID);
    console.log('  New Flow ID:', NEW_FLOW_ID);
    console.log('  New VoiceUrl:', NEW_VOICE_URL);
    
    try {
        const res = await axios.put(url, 
            `VoiceUrl=${encodeURIComponent(NEW_VOICE_URL)}`,
            { 
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }, 
                timeout: 15000 
            }
        );
        console.log('\n✅ SUCCESS! Status:', res.status);
        const phone = res.data?.IncomingPhoneNumbers?.[0] || res.data;
        console.log('Phone Number:', phone?.PhoneNumber || 'N/A');
        console.log('New VoiceUrl:', phone?.VoiceUrl || JSON.stringify(res.data).substring(0, 200));
    } catch (err) {
        console.log('\n❌ FAILED:', err.response?.status, err.response?.data || err.message);
        
        // Try v1 API as fallback
        console.log('\nTrying v1 API...');
        try {
            const v1url = `https://${KEY}:${TOK}@${SUB}/v1/Accounts/${SID}/IncomingPhoneNumbers/${EXOPHONE_SID}`;
            const v1res = await axios.post(v1url, 
                `VoiceUrl=${encodeURIComponent(NEW_VOICE_URL)}`,
                { 
                    headers: { 
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }, 
                    timeout: 15000 
                }
            );
            console.log('✅ v1 SUCCESS! Status:', v1res.status);
            console.log('Response:', JSON.stringify(v1res.data).substring(0, 300));
        } catch (err2) {
            console.log('❌ v1 also failed:', err2.response?.status, err2.response?.data || err2.message);
        }
    }
}
assignFlow();
