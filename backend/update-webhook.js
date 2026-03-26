require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '.env');
const ENV_PATH_ROOT = path.resolve(__dirname, '..', '.env');

async function updateWebhook() {
    try {
        const tunnels = await axios.get('http://127.0.0.1:4040/api/tunnels');
        const httpsTunnel = tunnels.data.tunnels.find(t => t.proto === 'https');
        
        if (!httpsTunnel) {
            console.log('❌ No HTTPS tunnel found');
            return;
        }
        
        const publicUrl = httpsTunnel.public_url.replace(/\/+$/, '');
        console.log(`🔗 New ngrok URL: ${publicUrl}`);
        
        const vars = {
            WEBHOOK_BASE_URL: publicUrl,
            VOICE_WEBHOOK: `${publicUrl}/api/voice/incoming`,
            SMS_WEBHOOK: `${publicUrl}/api/sms/incoming`
        };
        
        [ENV_PATH, ENV_PATH_ROOT].forEach(envFile => {
            if (!fs.existsSync(envFile)) return;
            let content = fs.readFileSync(envFile, 'utf8');
            
            Object.entries(vars).forEach(([key, value]) => {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                if (regex.test(content)) {
                    content = content.replace(regex, `${key}=${value}`);
                } else {
                    content += `\n${key}=${value}`;
                }
            });
            
            fs.writeFileSync(envFile, content);
            console.log(`✅ Updated ${envFile}`);
        });
        
        console.log('\n✅ All webhooks updated!');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

setInterval(updateWebhook, 30000);
updateWebhook();