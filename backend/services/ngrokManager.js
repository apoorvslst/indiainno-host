/**
 * Ngrok Manager Service
 * 
 * Integrated webhook manager that:
 * 1. Starts ngrok tunnel automatically
 * 2. Monitors for URL changes
 * 3. Updates .env files
 * 4. Updates Twilio webhook
 * 5. Updates Exotel webhook
 * 
 * Usage: Just import and call startNgrokManager() in server.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG = {
    NGROK_PORT: process.env.NGROK_PORT || 3000,
    NGROK_REGION: process.env.NGROK_REGION || 'in',
    CHECK_INTERVAL: 15000,
    NGROK_API_URL: 'http://127.0.0.1:4040/api/tunnels'
};

let currentUrl = null;
let ngrokProcess = null;
let isRunning = false;
let serverUrl = null;

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${COLORS.cyan}[Webhook]${COLORS.reset} ${COLORS[color]}${msg}${COLORS.reset}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkNgrokRunning() {
    try {
        const response = await axios.get(CONFIG.NGROK_API_URL, { timeout: 2000 });
        return response.data;
    } catch (err) {
        return null;
    }
}

async function startNgrok() {
    return new Promise((resolve, reject) => {
        log('Starting ngrok tunnel...', 'blue');
        
        ngrokProcess = spawn('ngrok', [
            'http',
            '--region', CONFIG.NGROK_REGION,
            '--addr', CONFIG.NGROK_PORT,
            '--log', 'stdout'
        ], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true
        });

        ngrokProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('started tunnel') || output.includes('url=')) {
                log('Ngrok tunnel established', 'green');
            }
        });

        ngrokProcess.stderr.on('data', (data) => {
            const output = data.toString();
            if (output.includes('started tunnel') || output.includes('url=')) {
                log('Ngrok tunnel established', 'green');
            }
        });

        ngrokProcess.on('error', (err) => {
            log(`Ngrok error: ${err.message}`, 'red');
        });

        let attempts = 0;
        const checkInterval = setInterval(async () => {
            attempts++;
            const tunnels = await checkNgrokRunning();
            if (tunnels && tunnels.tunnels && tunnels.tunnels.length > 0) {
                clearInterval(checkInterval);
                resolve(tunnels);
            }
            if (attempts > 20) {
                clearInterval(checkInterval);
                reject(new Error('Ngrok failed to start within timeout'));
            }
        }, 1500);
    });
}

async function getNgrokUrl() {
    const tunnels = await checkNgrokRunning();
    if (!tunnels) {
        return null;
    }
    
    const httpsTunnel = tunnels.tunnels.find(t => t.proto === 'https');
    if (!httpsTunnel) {
        return null;
    }
    
    return httpsTunnel.public_url.replace(/\/+$/, '');
}

function updateEnvFiles(baseUrl) {
    const envVars = {
        WEBHOOK_BASE_URL: baseUrl,
        VOICE_WEBHOOK: `${baseUrl}/api/voice/incoming`,
        SMS_WEBHOOK: `${baseUrl}/api/sms/incoming`,
        CALLBACK_URL: `${baseUrl}/api/voice/callback`,
        STATUS_CALLBACK: `${baseUrl}/api/voice/status`
    };

    const envPaths = [
        path.resolve(__dirname, '..', '.env'),
        path.resolve(__dirname, '..', '..', '.env'),
        path.resolve(__dirname, '..', '..', '..', '.env')
    ];

    envPaths.forEach(envPath => {
        if (!fs.existsSync(envPath)) return;
        
        let content = fs.readFileSync(envPath, 'utf8');
        
        Object.entries(envVars).forEach(([key, value]) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(content)) {
                content = content.replace(regex, `${key}=${value}`);
            } else {
                content += `\n${key}=${value}`;
            }
        });
        
        fs.writeFileSync(envPath, content);
    });
    
    process.env.WEBHOOK_BASE_URL = baseUrl;
    process.env.VOICE_WEBHOOK = envVars.VOICE_WEBHOOK;
    process.env.SMS_WEBHOOK = envVars.SMS_WEBHOOK;
}

async function updateTwilioWebhook(baseUrl) {
    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    if (!TWILIO_SID || !TWILIO_AUTH || !TWILIO_NUMBER) {
        log('Twilio credentials not found, skipping...', 'yellow');
        return { success: false, reason: 'missing_credentials' };
    }

    try {
        log('Updating Twilio webhook...', 'blue');
        
        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        
        const numbers = await axios.get(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers.json`,
            { headers: { Authorization: `Basic ${auth}` } }
        );

        const myNumber = numbers.data.incoming_phone_numbers.find(
            n => n.phone_number === TWILIO_NUMBER || 
                 n.phone_number.includes(TWILIO_NUMBER.replace('+', ''))
        );

        if (!myNumber) {
            log(`Twilio number ${TWILIO_NUMBER} not found`, 'red');
            return { success: false, reason: 'number_not_found' };
        }

        const voiceUrl = `${baseUrl}/api/voice/incoming`;
        
        await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers/${myNumber.sid}.json`,
            new URLSearchParams({
                voice_url: voiceUrl,
                voice_method: 'POST',
                sms_url: `${baseUrl}/api/sms/incoming`,
                sms_method: 'POST'
            }),
            { 
                headers: { 
                    Authorization: `Basic ${auth}`, 
                    'Content-Type': 'application/x-www-form-urlencoded' 
                } 
            }
        );

        log(`✅ Twilio webhook updated: ${voiceUrl}`, 'green');
        return { success: true, url: voiceUrl };
        
    } catch (err) {
        log(`Twilio error: ${err.response?.data?.message || err.message}`, 'red');
        return { success: false, error: err.message };
    }
}

async function updateExotelWebhook(baseUrl) {
    const EXOTEL_SID = process.env.EXOTEL_SID;
    const EXOTEL_TOKEN = process.env.EXOTEL_TOKEN;
    const EXOTEL_APP_ID = process.env.EXOTEL_APP_ID;

    if (!EXOTEL_SID || !EXOTEL_TOKEN || !EXOTEL_APP_ID) {
        log('Exotel credentials not found, skipping...', 'yellow');
        return { success: false, reason: 'missing_credentials' };
    }

    try {
        log('Updating Exotel webhook...', 'blue');
        
        const voiceUrl = `${baseUrl}/api/voice/incoming`;
        
        const response = await axios.put(
            `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/apps/${EXOTEL_APP_ID}`,
            {
                VoiceCallbackUrl: voiceUrl,
                HangupCallbackUrl: `${baseUrl}/api/voice/hangup`,
                StatusCallbackUrl: `${baseUrl}/api/voice/status`
            },
            {
                auth: {
                    username: EXOTEL_SID,
                    password: EXOTEL_TOKEN
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        log(`✅ Exotel webhook updated: ${voiceUrl}`, 'green');
        return { success: true, url: voiceUrl };
        
    } catch (err) {
        log(`Exotel error: ${err.response?.data?.message || err.message}`, 'red');
        return { success: false, error: err.message };
    }
}

async function updateExotelManualPortal(baseUrl) {
    const EXOTEL_SID = process.env.EXOTEL_SID;
    const EXOTEL_TOKEN = process.env.EXOTEL_TOKEN;
    const EXOTEL_WEBHOOK_NUMBER = process.env.EXOTEL_WEBHOOK_NUMBER;

    if (!EXOTEL_SID || !EXOTEL_TOKEN || !EXOTEL_WEBHOOK_NUMBER) {
        log('Exotel Manual credentials not found, skipping...', 'yellow');
        return { success: false, reason: 'missing_credentials' };
    }

    try {
        log('Updating Exotel Manual Number webhook...', 'blue');
        
        const voiceUrl = `${baseUrl}/api/voice/incoming`;
        
        const response = await axios.put(
            `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/incomingphonenumbers/${EXOTEL_WEBHOOK_NUMBER}`,
            {
                VoiceCallbackUrl: voiceUrl,
                HangupCallbackUrl: `${baseUrl}/api/voice/hangup`
            },
            {
                auth: {
                    username: EXOTEL_SID,
                    password: EXOTEL_TOKEN
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        log(`✅ Exotel Manual webhook updated: ${voiceUrl}`, 'green');
        return { success: true, url: voiceUrl };
        
    } catch (err) {
        log(`Exotel Manual error: ${err.response?.data?.message || err.message}`, 'red');
        return { success: false, error: err.message };
    }
}

async function updateAllWebhooks(baseUrl) {
    log(`\n${'='.repeat(40)}`, 'cyan');
    log(`Updating all webhooks to: ${baseUrl}`, 'blue');
    log('='.repeat(40), 'cyan');
    
    updateEnvFiles(baseUrl);
    
    const results = {
        twilio: await updateTwilioWebhook(baseUrl),
        exotel: await updateExotelWebhook(baseUrl),
        exotelManual: await updateExotelManualPortal(baseUrl)
    };
    
    log('\n✅ Webhook update complete!', 'green');
    return results;
}

async function monitorNgrok() {
    if (!isRunning) return;
    
    try {
        const newUrl = await getNgrokUrl();
        
        if (newUrl && newUrl !== currentUrl) {
            log(`URL changed: ${currentUrl} → ${newUrl}`, 'yellow');
            currentUrl = newUrl;
            await updateAllWebhooks(newUrl);
        }
    } catch (err) {
        log(`Monitor error: ${err.message}`, 'red');
    }
}

async function startNgrokManager() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║          🌐 Ngrok Webhook Manager (Integrated)             ║
║          Auto-updates webhooks when URL changes           ║
╚════════════════════════════════════════════════════════════╝
    `);

    try {
        let tunnels = await checkNgrokRunning();
        
        if (!tunnels || !tunnels.tunnels || tunnels.tunnels.length === 0) {
            log('Ngrok not running, starting...', 'yellow');
            tunnels = await startNgrok();
        }
        
        currentUrl = await getNgrokUrl();
        
        if (currentUrl) {
            log(`Current URL: ${currentUrl}`, 'green');
            await updateAllWebhooks(currentUrl);
        } else {
            log('No HTTPS tunnel available yet', 'yellow');
        }
        
        log(`\nMonitoring for URL changes every ${CONFIG.CHECK_INTERVAL/1000}s...`, 'blue');
        
        isRunning = true;
        setInterval(monitorNgrok, CONFIG.CHECK_INTERVAL);
        
        return {
            url: currentUrl,
            stop: () => {
                isRunning = false;
                if (ngrokProcess) {
                    ngrokProcess.kill();
                }
            }
        };
        
    } catch (err) {
        log(`Warning: ${err.message} - webhook auto-update disabled`, 'yellow');
        return null;
    }
}

async function forceUpdateWebhooks() {
    try {
        const newUrl = await getNgrokUrl();
        if (newUrl && newUrl !== currentUrl) {
            log(`Force updating webhooks: ${currentUrl} → ${newUrl}`, 'yellow');
            currentUrl = newUrl;
            return await updateAllWebhooks(newUrl);
        } else if (newUrl === currentUrl) {
            log(`URL unchanged: ${currentUrl}`, 'blue');
            return { message: 'URL unchanged', url: currentUrl };
        }
        return { error: 'No ngrok URL available' };
    } catch (err) {
        log(`Force update error: ${err.message}`, 'red');
        return { error: err.message };
    }
}

module.exports = {
    startNgrokManager,
    forceUpdateWebhooks,
    getCurrentUrl: () => currentUrl
};
