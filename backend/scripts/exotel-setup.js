#!/usr/bin/env node
/**
 * Exotel Setup Script
 * 
 * Diagnoses and fixes the Exophone configuration.
 * The Passthru Applet does NOT parse ExoML — we need to find the right app_id
 * or reconfigure the flow.
 * 
 * Usage: node scripts/exotel-setup.js
 */
require('dotenv').config();
const axios = require('axios');

const SID = process.env.EXOTEL_ACCOUNT_SID;
const API_KEY = process.env.EXOTEL_API_KEY;
const API_TOKEN = process.env.EXOTEL_API_TOKEN;
const SUBDOMAIN = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
const PHONE = process.env.EXOTEL_PHONE_NUMBER?.replace('+91', '0');

const BASE = `https://${API_KEY}:${API_TOKEN}@${SUBDOMAIN}/v2_beta/Accounts/${SID}`;

async function listExophones() {
    console.log('\n📞 Listing all ExoPhones...\n');
    try {
        const res = await axios.get(`${BASE}/IncomingPhoneNumbers`, {
            headers: { Accept: 'application/json' },
            timeout: 15000
        });
        const numbers = res.data?.IncomingPhoneNumbers || res.data?.incoming_phone_numbers || [res.data];
        
        if (Array.isArray(numbers)) {
            numbers.forEach((n, i) => {
                console.log(`--- ExoPhone #${i + 1} ---`);
                console.log(`  SID:          ${n.sid}`);
                console.log(`  Number:       ${n.phone_number}`);
                console.log(`  Friendly:     ${n.friendly_name || '(none)'}`);
                console.log(`  Voice URL:    ${n.voice_url}`);
                console.log(`  SMS URL:      ${n.sms_url || '(none)'}`);
                console.log(`  Capabilities: Voice=${n.capabilities?.voice}, SMS=${n.capabilities?.sms}`);
                console.log('');
            });
        } else {
            console.log('Raw response:', JSON.stringify(res.data, null, 2));
        }
        return numbers;
    } catch (err) {
        console.error('❌ Error listing ExoPhones:', err.response?.data || err.message);
        // Try v1 API as fallback
        console.log('\n🔄 Trying v1 API...\n');
        try {
            const v1Base = `https://${API_KEY}:${API_TOKEN}@${SUBDOMAIN}/v1/Accounts/${SID}`;
            const res2 = await axios.get(`${v1Base}/IncomingPhoneNumbers`, {
                headers: { Accept: 'application/json' },
                timeout: 15000
            });
            console.log('v1 response:', JSON.stringify(res2.data, null, 2));
            return res2.data;
        } catch (err2) {
            console.error('❌ v1 also failed:', err2.response?.data || err2.message);
        }
    }
}

async function listApps() {
    console.log('\n📱 Listing installed apps/flows...\n');
    // Try to get list of apps to find if there's an ExoML app
    const v1Base = `https://${API_KEY}:${API_TOKEN}@${SUBDOMAIN}/v1/Accounts/${SID}`;
    try {
        // The flow_id from the passthru is 1209351 — let's get info about it
        const res = await axios.get(`${v1Base}/Flows`, {
            headers: { Accept: 'application/json' },
            timeout: 15000
        });
        console.log('Flows:', JSON.stringify(res.data, null, 2).substring(0, 2000));
    } catch (err) {
        console.error('Could not list flows:', err.response?.status, err.response?.data?.RestException?.Message || err.message);
    }
}

async function testOutboundCallWithExoML() {
    console.log('\n📲 Testing OUTBOUND call via Connect API (this DOES support ExoML)...\n');
    const DEMO_NUMBER = process.env.DEMO_PHONE_NUMBER?.replace('+91', '0') || '08708679087';
    const WEBHOOK_URL = process.env.WEBHOOK_BASE_URL;
    
    if (!WEBHOOK_URL) {
        console.error('❌ WEBHOOK_BASE_URL not set in .env');
        return;
    }
    
    const v1Base = `https://${API_KEY}:${API_TOKEN}@${SUBDOMAIN}/v1/Accounts/${SID}`;
    const callbackUrl = `${WEBHOOK_URL}/civic-logic`;
    
    console.log(`  From:     ${PHONE}`);
    console.log(`  To:       ${DEMO_NUMBER}`);
    console.log(`  Callback: ${callbackUrl}`);
    console.log('');
    
    try {
        const res = await axios.post(
            `${v1Base}/Calls/connect.json`,
            new URLSearchParams({
                From: PHONE,
                To: DEMO_NUMBER,
                CallerId: PHONE,
                Url: callbackUrl,
                CallType: 'trans'
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 30000
            }
        );
        console.log('✅ Outbound call initiated!');
        console.log('  Call SID:', res.data?.Call?.Sid);
        console.log('  Status:', res.data?.Call?.Status);
        console.log('  Full response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('❌ Outbound call failed:', err.response?.data || err.message);
    }
}

async function main() {
    console.log('========================================');
    console.log('  EXOTEL SETUP DIAGNOSTICS');
    console.log('========================================');
    console.log(`  Account SID: ${SID}`);
    console.log(`  Phone:       ${PHONE}`);
    console.log(`  Subdomain:   ${SUBDOMAIN}`);
    console.log('========================================\n');
    
    const arg = process.argv[2];
    
    if (arg === 'call') {
        // Test outbound call with ExoML
        await testOutboundCallWithExoML();
    } else {
        // Default: diagnostics
        await listExophones();
        await listApps();
        
        console.log('\n========================================');
        console.log('  DIAGNOSIS');
        console.log('========================================');
        console.log('');
        console.log('  The Passthru Applet (flow_id: 1209351) that is currently assigned');
        console.log('  to your Exophone does NOT parse ExoML XML responses.');
        console.log('  It only reads the HTTP status code (200 = path A, 302 = path B).');
        console.log('');
        console.log('  SOLUTION OPTIONS:');
        console.log('');
        console.log('  1. OUTBOUND CALLS (works NOW):');
        console.log('     Run: node scripts/exotel-setup.js call');
        console.log('     This uses the Connect API which DOES execute ExoML.');
        console.log('');
        console.log('  2. FIX INCOMING CALLS (requires dashboard):');
        console.log('     Go to my.exotel.com → App Bazaar → create an "ExoML" app');
        console.log('     that points to your webhook URL, then assign it to your');
        console.log('     Exophone under Numbers → Manage Numbers.');
        console.log('========================================\n');
    }
}

main().catch(console.error);
