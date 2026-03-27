const mongoose = require('mongoose');

// ── GeoJSON Point (reused from Ticket.js pattern) ──
const pointSchema = new mongoose.Schema({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [longitude, latitude]
}, { _id: false });

// ════════════════════════════════════════════════════════════════
// 1. ACComplaint — Anti-Corruption Complaint
// ════════════════════════════════════════════════════════════════
const acComplaintSchema = new mongoose.Schema({
    tokenId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },

    // Categorization
    category: {
        type: String,
        enum: ['Bribery', 'Extortion', 'Misconduct'],
        required: true
    },
    description: { type: String, default: '' },           // AES-256 encrypted
    accusedEmployeeName: { type: String, default: '' },    // AES-256 encrypted

    department: { type: String, default: '' },
    branch: { type: String, default: '' },

    // Location (geotags saved, metadata stripped)
    location: { type: pointSchema, index: '2dsphere' },
    locality: { type: String, default: '' },

    // Severity & Routing
    level: {
        type: Number,
        enum: [1, 2, 3],
        default: 1
    },
    urgency: {
        type: String,
        enum: ['Normal', 'High'],
        default: 'Normal'
    },

    // Lifecycle
    status: {
        type: String,
        enum: [
            'Submitted',
            'Unassigned',
            'Assigned',
            'Under_Investigation',
            'Verified',
            'Insufficient_Evidence',
            'Action_Taken',
            'Closed'
        ],
        default: 'Submitted'
    },

    // Assignment
    assignedOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedOfficerRole: { type: String, default: '' },
    escalationLevel: { type: Number, default: 0 },
    escalatedAt: { type: Date, default: null },

    // Resolution
    resolutionOutcome: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },

    // Conflict check flag
    conflictDetected: { type: Boolean, default: false },
    routedToOversightBoard: { type: Boolean, default: false }
}, { timestamps: true });

// ════════════════════════════════════════════════════════════════
// 2. ACEvidence — Evidence Vault
// ════════════════════════════════════════════════════════════════
const acEvidenceSchema = new mongoose.Schema({
    complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ACComplaint',
        required: true,
        index: true
    },
    fileType: {
        type: String,
        enum: ['MP4', 'MP3', 'PDF'],
        required: true
    },
    fileData: { type: String, required: true },     // Base64 (swap for S3 link in prod)
    fileHash: { type: String, required: true },      // SHA-256
    originalName: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 }
}, { timestamps: true });

// ════════════════════════════════════════════════════════════════
// 3. ACTamperLog — Immutable Audit Trail
// ════════════════════════════════════════════════════════════════
const acTamperLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: 'Anonymous' },
    userRole: { type: String, default: '' },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], required: true },
    endpoint: { type: String, required: true },
    requestBody: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

// Make tamper logs truly read-only: disable updateOne, updateMany, deleteOne, deleteMany
acTamperLogSchema.pre(['updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndUpdate', 'findOneAndDelete'], function () {
    throw new Error('TamperLog records are immutable and cannot be modified or deleted.');
});

// Indexes
acComplaintSchema.index({ status: 1, createdAt: 1 });
acComplaintSchema.index({ department: 1, status: 1 });
acTamperLogSchema.index({ timestamp: -1 });
acTamperLogSchema.index({ userId: 1 });

const ACComplaint = mongoose.model('ACComplaint', acComplaintSchema);
const ACEvidence = mongoose.model('ACEvidence', acEvidenceSchema);
const ACTamperLog = mongoose.model('ACTamperLog', acTamperLogSchema);

module.exports = { ACComplaint, ACEvidence, ACTamperLog };
