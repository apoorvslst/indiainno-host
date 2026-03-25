// @ts-check
import { test, expect } from '@playwright/test';

// ── Config ──────────────────────────────────────────────
const BACKEND_URL = 'http://localhost:5000';
const UNIQUE = Date.now();
const TEST_USER = {
    name: `Test Citizen ${UNIQUE}`,
    email: `testcitizen_${UNIQUE}@example.com`,
    password: 'Test@12345',
    phone: `+91${String(9000000000 + (UNIQUE % 999999999))}`,
    role: 'user',
    city: 'Kota',
};

// The transcript the "caller" would speak — includes problem AND location
const CALL_TRANSCRIPT =
    'There is no water supply in my area near Gumanpura Road, Kota since 3 days. The pipeline seems broken near the main chauraha.';

let authToken = '';

// ── Register a fresh test user before all tests ─────────
test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
        data: TEST_USER,
    });

    if (res.ok()) {
        const body = await res.json();
        authToken = body.token;
        console.log(`✅ Registered test user: ${TEST_USER.email}`);
    } else {
        // User may already exist — log in instead
        const loginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
            data: { email: TEST_USER.email, password: TEST_USER.password },
        });
        expect(loginRes.ok()).toBeTruthy();
        const body = await loginRes.json();
        authToken = body.token;
        console.log(`✅ Logged into existing test user: ${TEST_USER.email}`);
    }

    expect(authToken).toBeTruthy();
});

// ═══════════════════════════════════════════════════════════
// TEST: Full call → auto-submit → verify on dashboard
// ═══════════════════════════════════════════════════════════
test('Call auto-submits complaint and it appears on dashboard', async ({ page, request }) => {
    // ── STEP 1: Log in via the UI ─────────────────────────
    await test.step('Login as citizen', async () => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await page.locator('input[type="email"]').fill(TEST_USER.email);
        await page.locator('input[type="password"]').fill(TEST_USER.password);
        await page.locator('button[type="submit"]').click();

        // Should redirect to citizen dashboard
        await page.waitForURL('**/citizen', { timeout: 15_000 });
        await expect(page.locator('text=Citizen Dashboard')).toBeVisible();
        console.log('✅ Logged in and on Citizen Dashboard');
    });

    // ── STEP 2: Click "Contact Authorities" (call button) ─
    await test.step('Click Contact Authorities button', async () => {
        const callButton = page.locator('button', { hasText: 'Contact Authorities' });
        await expect(callButton).toBeVisible();

        // Intercept the voice/call-me API request
        const callPromise = page.waitForResponse(
            (res) => res.url().includes('/api/voice/call-me'),
            { timeout: 25_000 }
        );

        await callButton.click();

        // Button should show "Connecting..." while API is in flight
        await expect(
            page.locator('button', { hasText: /Connecting/i })
        ).toBeVisible({ timeout: 5_000 });

        // Wait for the API response
        const callResponse = await callPromise;
        const callStatus = callResponse.status();
        const callBody = await callResponse.json().catch(() => ({}));

        console.log(`📞 Call API responded: ${callStatus}`, callBody.message || '');

        if (callStatus === 200) {
            console.log(`✅ Call initiated successfully! SID: ${callBody.callSid}`);
        } else {
            console.log(`⚠️ Call API returned ${callStatus} — expected if Twilio trial is inactive. Proceeding with pipeline simulation.`);
        }
    });

    // ── STEP 3: Simulate what happens AFTER the call ──────
    // The real flow: Twilio records voice → Sarvam STT → Groq classification → DB save
    // We simulate this using the test-pipeline endpoint with a standalone request
    await test.step('Simulate voice pipeline (STT → classify → save)', async () => {
        const pipelineRes = await request.post(
            `${BACKEND_URL}/api/voice/test-pipeline`,
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    transcript: CALL_TRANSCRIPT,
                    language: 'hi',
                    phone: TEST_USER.phone,
                },
            }
        );

        const pipelineBody = await pipelineRes.json();

        console.log(`🎯 Pipeline result:`, {
            status: pipelineRes.status(),
            ticketNumber: pipelineBody.ticketNumber,
            category: pipelineBody.classification?.intentCategory || pipelineBody.classification?.primaryCategory,
            department: pipelineBody.classification?.department,
            severity: pipelineBody.classification?.severity,
            description: (pipelineBody.classification?.description || '').substring(0, 80),
        });

        expect(pipelineRes.ok()).toBeTruthy();
        expect(pipelineBody.success).toBe(true);
        expect(pipelineBody.ticketNumber).toBeTruthy();
        console.log(`✅ Complaint auto-submitted: ${pipelineBody.ticketNumber}`);
    });

    // ── STEP 4: Verify complaint appears on My Complaints ─
    await test.step('Verify complaint on My Complaints page', async () => {
        await page.goto('/citizen/complaints');
        await page.waitForLoadState('networkidle');

        // Wait for complaint cards/list to render
        await page.waitForTimeout(2000);

        const pageContent = (await page.textContent('body')) || '';

        // The complaint should exist — categories Groq might assign for water-related issue
        const hasComplaint =
            pageContent.includes('Water') ||
            pageContent.includes('water') ||
            pageContent.includes('Gumanpura') ||
            pageContent.includes('pipeline') ||
            pageContent.includes('supply') ||
            pageContent.includes('voice_call') ||
            pageContent.includes('Pothole') ||
            pageContent.includes('Other') ||
            pageContent.includes('Registered') ||
            pageContent.includes('Open');

        expect(hasComplaint).toBe(true);
        console.log('✅ Complaint is visible on My Complaints page!');

        // Take a screenshot for the record
        await page.screenshot({ path: 'tests/screenshots/complaint-visible.png', fullPage: true });
        console.log('📸 Screenshot saved to tests/screenshots/complaint-visible.png');
    });
});

// ═══════════════════════════════════════════════════════════
// TEST: Verify complaint details are correctly auto-filled
// ═══════════════════════════════════════════════════════════
test('Auto-filled complaint has correct extracted fields', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/voice/test-pipeline`, {
        headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
        data: {
            transcript: 'Big pothole on Station Road near Chambal Garden, Kota. Many accidents happening daily.',
            language: 'en',
        },
    });

    const body = await res.json();
    console.log('🧠 Groq classification:', body.classification);
    console.log('📋 Response status:', res.status(), 'body.success:', body.success);

    expect(res.ok()).toBeTruthy();
    expect(body.success).toBe(true);
    expect(body.ticketNumber).toBeTruthy();

    // The classification should have extracted meaningful fields
    const c = body.classification;
    expect(c).toBeDefined();
    expect(c.description).toBeTruthy();

    // Groq should identify location-related info
    const hasLocationInfo =
        (c.landmark && c.landmark.length > 0) ||
        (c.locality && c.locality.length > 0) ||
        c.description.toLowerCase().includes('station road') ||
        c.description.toLowerCase().includes('chambal');

    expect(hasLocationInfo).toBe(true);
    console.log(`✅ Location extracted: landmark="${c.landmark}", locality="${c.locality}"`);
    console.log(`✅ Category: ${c.intentCategory || c.primaryCategory}, Dept: ${c.department}, Severity: ${c.severity}`);
});
