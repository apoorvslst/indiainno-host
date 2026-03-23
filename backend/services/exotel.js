const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const WEBHOOK_BASE = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000';

function normalizeIndianNumber(value) {
    const raw = String(value || '').trim();
    const digits = raw.replace(/\D/g, '');

    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+') && digits.length >= 10) return `+${digits}`;
    return raw;
}

function assertExotelConfig() {
    const missing = [];
    if (!process.env.EXOTEL_ACCOUNT_SID) missing.push('EXOTEL_ACCOUNT_SID');
    if (!process.env.EXOTEL_API_KEY) missing.push('EXOTEL_API_KEY');
    if (!process.env.EXOTEL_API_TOKEN) missing.push('EXOTEL_API_TOKEN');
    if (!process.env.EXOTEL_PHONE_NUMBER) missing.push('EXOTEL_PHONE_NUMBER');

    if (missing.length) {
        const err = new Error(`Missing Exotel config: ${missing.join(', ')}`);
        err.code = 'EXOTEL_CONFIG_MISSING';
        throw err;
    }
}

async function makeCall(citizenPhone) {
    assertExotelConfig();

    const accountSid = process.env.EXOTEL_ACCOUNT_SID;
    const apiKey = process.env.EXOTEL_API_KEY;
    const apiToken = process.env.EXOTEL_API_TOKEN;
    const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';

    const from = normalizeIndianNumber(citizenPhone);
    const exotelNumber = normalizeIndianNumber(process.env.EXOTEL_PHONE_NUMBER);
    const to = normalizeIndianNumber(process.env.EXOTEL_DESTINATION_NUMBER || exotelNumber);

    // IVR webhook URL — Exotel will hit this when the call connects
    const appletUrl = process.env.EXOTEL_APPLET_URL || `${WEBHOOK_BASE}/api/voice/incoming`;
    const statusCallbackUrl = process.env.EXOTEL_STATUS_CALLBACK_URL || `${WEBHOOK_BASE}/api/voice/call-status`;

    const payload = {
        From: from,
        To: to,
        CallerId: exotelNumber,
        CallType: 'trans',
        TimeLimit: 900,
        TimeOut: 30,
        Url: appletUrl,
        StatusCallback: statusCallbackUrl,
        StatusCallbackContentType: 'application/json',
    };

    console.log(`[Exotel] Making call: From=${from}, To=${to}, CallerId=${exotelNumber}, Url=${appletUrl}`);

    try {
        const url = `https://${subdomain}/v1/Accounts/${accountSid}/Calls/connect.json`;
        const body = new URLSearchParams(payload).toString();

        const { data } = await axios.post(url, body, {
            auth: {
                username: apiKey,
                password: apiToken,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 20000,
        });

        const callSid = data?.Call?.Sid || data?.Call?.sid || data?.sid || null;
        console.log(`[Exotel] Call initiated: ${callSid}`);
        return { callSid, providerResponse: data };
    } catch (error) {
        if (error.response) {
            const providerData = error.response.data;
            const providerMessage = providerData?.message || providerData?.Message || JSON.stringify(providerData);
            console.error(`[Exotel] API Error (${error.response.status}):`, providerMessage);
            const wrapped = new Error(providerMessage || 'Exotel API request failed');
            wrapped.code = error.response.status === 401 ? 'EXOTEL_AUTH_FAILED' : 'EXOTEL_API_ERROR';
            wrapped.providerStatus = error.response.status;
            wrapped.providerData = providerData;
            throw wrapped;
        }

        const wrapped = new Error(error.message || 'Exotel request failed');
        wrapped.code = 'EXOTEL_NETWORK_ERROR';
        throw wrapped;
    }
}

module.exports = {
    makeCall,
};
