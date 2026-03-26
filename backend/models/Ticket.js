const mongoose = require('mongoose');

// 1. Reusable GeoJSON Point Schema
const pointSchema = new mongoose.Schema({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
}, { _id: false });

// 2. Action History Sub-schema (Day-by-Day Timeline Tracking)
const actionHistorySchema = new mongoose.Schema({
    actionDate: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    previousStatus: { type: String },
    newStatus: { type: String },
    remarks: { type: String, default: '' },
    progressPercentage: { type: Number, min: 0, max: 100 },
    images: [{ type: String }] // phase-by-phase images from engineer
}, { _id: false });

// 3. Phase Tracking Sub-schema (Amazon-like milestone tracking)
const phaseSchema = new mongoose.Schema({
    phase: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    images: [{ type: String }],
    remarks: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

// Phase names based on category type
const PHASE_NAMES = {
    default: ['Inspection', 'Planning', 'Execution', 'Verification', 'Completion'],
    road: ['Site Inspection', 'Traffic Planning', 'Repair Work', 'Quality Check', 'Road Open'],
    water: ['Leak Detection', 'Material Planning', 'Pipe Repair', 'Pressure Test', 'Supply Restore'],
    electrical: ['Safety Audit', 'Equipment Prep', 'Repair Work', 'Safety Verification', 'Power Restore'],
    drainage: ['Blockage Assessment', 'Equipment Deployment', 'Cleaning Work', 'Sanitization', 'Completion'],
};

// 4. The Master Ticket Schema (MCD Specific)
const masterTicketSchema = new mongoose.Schema({
    // Ticket Identification
    ticketNumber: { type: String, unique: true },
    source: { type: String, enum: ['web_form', 'voice_call', 'sms', 'whatsapp'], default: 'web_form' },

    // Complainant Information
    complainantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    complainantName: { type: String, default: 'Citizen' },
    complainantPhone: { type: String },
    complainantEmail: { type: String },
    isAnonymous: { type: Boolean, default: false },

    // Categorization & Routing
    primaryCategory: { type: String, required: true },
    subCategory: { type: String, default: '' },
    department: { type: String, default: null },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
    level: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    isApproved: { type: Boolean, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // MCD Specific Location Hierarchy
    zone: { type: String, default: '' },
    wardNumber: { type: String, default: '' },
    locality: { type: String, default: '' },
    landmark: { type: String, default: '' },
    pincode: { type: String, default: '' },
    city: { type: String, default: '' },
    location: { type: pointSchema, index: '2dsphere' },
    needsManualGeo: { type: Boolean, default: false },

    // Complaint Evidence
    description: { type: String, default: '' },
    citizenImages: [{ type: String }],
    audioUrl: { type: String, default: null },
    complaintCount: { type: Number, default: 1 },

    // Status, SLA & Escalation
    status: {
        type: String,
        enum: ['Registered', 'Open', 'Assigned', 'In_Progress', 'Pending_Verification', 'Resolved', 'Closed', 'Rejected', 'Reopened', 'Disputed', 'Invalid_Spam'],
        default: 'Registered'
    },
    assignedEngineerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedJuniorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    areaMode: { type: String, enum: ['urban', 'rural'], default: 'urban' },
    slaDeadline: { type: Date, default: null },
    escalationLevel: { type: Number, default: 0 },

    // Progress Tracking
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    currentPhase: { type: Number, enum: [1, 2, 3, 4, 5], default: 1 },
    phases: [phaseSchema],
    lastProgressUpdate: { type: Date, default: null },
    actionHistory: [actionHistorySchema],

    // Resolution Evidence
    resolvedAt: { type: Date, default: null },
    resolutionImages: [{ type: String }],
    resolutionRemarks: { type: String, default: '' },
    resolutionLocation: { type: pointSchema, default: null },

    // Ticket Merging
    mergedTicketIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterTicket' }],

  // Citizen Feedback
  citizenRating: { type: Number, default: null, min: 1, max: 5 },
  citizenFeedbackText: { type: String, default: '' },
  isReopened: { type: Boolean, default: false },
  reComplaintRemark: { type: String, default: '' },

  // Implementation Plan Link
  implementationPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImplementationPlan', default: null }

}, { timestamps: true });

// Pre-save: auto-generate ticketNumber and initialize phases
masterTicketSchema.pre('save', async function () {
    if (!this.ticketNumber) {
        this.ticketNumber = 'MCD-' + Math.floor(100000 + Math.random() * 900000);
    }
    
    // Initialize phases if not set
    if (!this.phases || this.phases.length === 0) {
        const category = this.primaryCategory?.toLowerCase() || '';
        let phaseNames = PHASE_NAMES.default;
        
        if (category.includes('road') || category.includes('pothole')) phaseNames = PHASE_NAMES.road;
        else if (category.includes('water') || category.includes('drain')) phaseNames = PHASE_NAMES.water;
        else if (category.includes('electric') || category.includes('power')) phaseNames = PHASE_NAMES.electrical;
        else if (category.includes('drain') || category.includes('sewage')) phaseNames = PHASE_NAMES.drainage;
        
        this.phases = phaseNames.map((name, index) => ({
            phase: index + 1,
            name: name,
            description: '',
            status: index === 0 ? 'in_progress' : 'pending',
            startedAt: index === 0 ? new Date() : null,
            completedAt: null,
            images: [],
            remarks: '',
            updatedBy: null
        }));
        this.currentPhase = 1;
    }
    
    // Update lastProgressUpdate when progress changes
    if (this.isModified('progressPercent') || this.isModified('actionHistory')) {
        this.lastProgressUpdate = new Date();
    }
});

// 4. Raw Complaint Schema (The Intake Funnel)
const rawComplaintSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    callerPhone: { type: String },
    callerPhoneRaw: { type: String },
    audioUrl: { type: String },
    transcriptOriginal: { type: String },
    transcriptEnglish: { type: String },
    intentCategory: { type: String },
    extractedLandmark: { type: String },
    location: { type: pointSchema, index: '2dsphere' },
    geoAccuracy: { type: Number },
    department: { type: String },
    source: { type: String, enum: ['web_form', 'voice_call', 'sms', 'whatsapp'], default: 'web_form' },
    status: { type: String, default: 'Open' },
    masterTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterTicket' }
}, { timestamps: true });

// Indexes
rawComplaintSchema.index({ userId: 1, createdAt: -1 });
masterTicketSchema.index({ department: 1, status: 1 });
masterTicketSchema.index({ zone: 1, wardNumber: 1 });

const MasterTicket = mongoose.model('MasterTicket', masterTicketSchema);
const RawComplaint = mongoose.model('RawComplaint', rawComplaintSchema);

module.exports = { MasterTicket, RawComplaint };
