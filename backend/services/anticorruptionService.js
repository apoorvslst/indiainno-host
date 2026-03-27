const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const { ACComplaint } = require('../models/AnticorruptionComplaint');

const AES_KEY = process.env.AES_ENCRYPTION_KEY || 'civicsync-aes-default-key-change-me';

// ── Token Generation ──────────────────────────────────────────
function generateSecureToken() {
    // 16-digit numeric token
    const bytes = crypto.randomBytes(8);
    const num = BigInt('0x' + bytes.toString('hex'));
    return num.toString().slice(0, 16).padStart(16, '0');
}

// ── AES-256 Encryption / Decryption ───────────────────────────
function encryptField(text) {
    if (!text) return '';
    return CryptoJS.AES.encrypt(text, AES_KEY).toString();
}

function decryptField(cipherText) {
    if (!cipherText) return '';
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, AES_KEY);
        return bytes.toString(CryptoJS.enc.Utf8) || cipherText;
    } catch {
        return cipherText;
    }
}

// ── SHA-256 File Hash ─────────────────────────────────────────
function hashFile(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ── Field Masking ─────────────────────────────────────────────
function maskComplaint(complaint, userRole) {
    const obj = complaint.toObject ? complaint.toObject() : { ...complaint };

    // Decrypt description for authorized roles
    if (['officer', 'admin'].includes(userRole)) {
        obj.description = decryptField(obj.description);
        obj.accusedEmployeeName = decryptField(obj.accusedEmployeeName);
    } else {
        // Lower-level employees see only category + branch
        obj.description = '[ENCRYPTED — Authorized personnel only]';
        obj.accusedEmployeeName = '[REDACTED]';
    }

    return obj;
}

// ── Level Assessment ──────────────────────────────────────────
// Rule-based severity assessment returning level 1-3
const HIGH_KEYWORDS = ['public safety', 'threat', 'life', 'death', 'violence', 'assault', 'weapon'];
const MEDIUM_KEYWORDS = ['bribery', 'large sum', 'lakh', 'crore', 'extortion', 'blackmail'];

function assessLevel(category, description) {
    const text = `${category} ${description}`.toLowerCase();

    // Level 3 — Critical: public safety or threats
    if (HIGH_KEYWORDS.some(kw => text.includes(kw))) return 3;

    // Level 2 — High: bribery or large financial misconduct
    if (category === 'Bribery' || MEDIUM_KEYWORDS.some(kw => text.includes(kw))) return 2;

    // Level 1 — Standard misconduct
    return 1;
}

// ── Auto-Assign Officer ───────────────────────────────────────
// Level 1 → Junior Officer, Level 2 → Dept Head, Level 3 → Officer/Commissioner
const LEVEL_ROLE_MAP = {
    1: 'junior',
    2: 'dept_head',
    3: 'officer'
};

async function autoAssignOfficer(complaint) {
    const targetRole = LEVEL_ROLE_MAP[complaint.level] || 'junior';

    // Find an active officer with matching role (and department if available)
    const query = { role: targetRole, active: true };
    if (complaint.department && targetRole !== 'officer') {
        query.department = complaint.department;
    }

    // Try exact match first, then any officer with the role
    let officer = await User.findOne(query).sort({ lastActiveDate: -1 });
    if (!officer) {
        officer = await User.findOne({ role: targetRole, active: true }).sort({ lastActiveDate: -1 });
    }

    if (officer) {
        complaint.assignedOfficerId = officer._id;
        complaint.assignedOfficerRole = targetRole;
        complaint.status = 'Assigned';
    } else {
        complaint.status = 'Unassigned';
    }

    return complaint;
}

// ── Escalation Check (called by cron) ─────────────────────────
async function checkEscalation() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

    const unassigned = await ACComplaint.find({
        status: 'Unassigned',
        createdAt: { $lt: cutoff },
        escalationLevel: { $lt: 2 }
    });

    let escalated = 0;
    for (const complaint of unassigned) {
        complaint.escalationLevel = 2;
        complaint.status = 'Unassigned'; // stays unassigned but flagged
        complaint.escalatedAt = new Date();

        // Try to assign to a higher-level officer
        complaint.level = Math.min(complaint.level + 1, 3);
        await autoAssignOfficer(complaint);
        await complaint.save();
        escalated++;
    }

    if (escalated > 0) {
        console.log(`[AC Escalation] Escalated ${escalated} complaints to Level 2 Oversight`);
    }
    return escalated;
}

// ── Vigilance Webhook Trigger ─────────────────────────────────
async function triggerVigilanceWebhook(complaint) {
    const webhookUrl = process.env.STATE_VIGILANCE_WEBHOOK_URL;

    const payload = {
        tokenId: complaint.tokenId,
        category: complaint.category,
        department: complaint.department,
        level: complaint.level,
        timestamp: new Date().toISOString()
    };

    if (webhookUrl) {
        try {
            const axios = require('axios');
            await axios.post(webhookUrl, payload, { timeout: 10000 });
            console.log(`[AC Webhook] Notified State Vigilance API for token: ${complaint.tokenId}`);
        } catch (err) {
            console.error(`[AC Webhook] Failed to notify State Vigilance:`, err.message);
        }
    } else {
        console.log(`[AC Webhook] STATE_VIGILANCE_WEBHOOK_URL not configured. Logged bribery report: ${complaint.tokenId}`);
    }

    return payload;
}

// ── Urgency Assessment ────────────────────────────────────────
function assessUrgency(category, description) {
    const text = `${category} ${description}`.toLowerCase();
    if (HIGH_KEYWORDS.some(kw => text.includes(kw))) return 'High';
    return 'Normal';
}

module.exports = {
    generateSecureToken,
    encryptField,
    decryptField,
    hashFile,
    maskComplaint,
    assessLevel,
    assessUrgency,
    autoAssignOfficer,
    checkEscalation,
    triggerVigilanceWebhook
};
