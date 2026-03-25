const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Name is required'] },
    phone: { type: String, required: [true, 'Phone number is required'], unique: true, trim: true },
    pin: { type: String, required: [true, 'PIN is required'], minlength: 4 },
    email: { type: String, default: '', lowercase: true, trim: true, sparse: true },
    role: {
        type: String,
        enum: ['citizen', 'user', 'junior', 'dept_head', 'officer'],
        default: 'citizen'
    },
    mode: { type: String, enum: ['urban', 'rural'], default: 'urban' },
    department: { type: String, default: null },
    zone: { type: String, default: '' },
    wardNumber: { type: String, default: '' },
    city: { type: String, default: '' },

    // Rural-specific location hierarchy
    district: { type: String, default: '' },
    block: { type: String, default: '' },
    village: { type: String, default: '' },

    // Performance & accountability
    performancePoints: { type: Number, default: 100, min: 0, max: 100 },
    lastActiveDate: { type: Date, default: Date.now },
    trustScore: { type: Number, default: 100, min: 0, max: 100 },

    active: { type: Boolean, default: true }
}, { timestamps: true });

// Hash PIN before saving (same logic as password)
userSchema.pre('save', async function () {
    if (!this.isModified('pin')) return;
    const salt = await bcrypt.genSalt(12);
    this.pin = await bcrypt.hash(this.pin, salt);
});

// Method to verify PIN
userSchema.methods.matchPin = async function (enteredPin) {
    return await bcrypt.compare(enteredPin, this.pin);
};

// Backward compat — keep matchPassword as alias
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.pin);
};

module.exports = mongoose.model('User', userSchema);
