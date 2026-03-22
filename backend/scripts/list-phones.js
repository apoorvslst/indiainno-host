require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const SID = process.env.EXOTEL_ACCOUNT_SID;
const KEY = process.env.EXOTEL_API_KEY;
const TOK = process.env.EXOTEL_API_TOKEN;
const SUB = process.env.EXOTEL_SUBDOMAIN;

async function run() {
    const url = `https://${KEY}:${TOK}@${SUB}/v2_beta/Accounts/${SID}/IncomingPhoneNumbers`;
    let output = '';
    
    try {
        const res = await axios.get(url, { headers: { Accept: 'application/json' }, timeout: 15000 });
        output = JSON.stringify(res.data, null, 2);
    } catch (err) {
        output = `ERROR ${err.response?.status}: ${JSON.stringify(err.response?.data || err.message, null, 2)}`;
    }
    
    fs.writeFileSync('scripts/exophone-result.json', output, 'utf8');
    console.log('DONE - wrote to scripts/exophone-result.json');
}
run();
