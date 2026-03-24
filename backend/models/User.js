const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Name is required'] },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: 6 },
    phone: { type: String, default: '' },
    role: { 
        type: String, 
        enum: ['citizen', 'junior_engineer', 'executive_engineer', 'senior_engineer', 'mayor', 'admin', 'user', 'engineer'], 
        default: 'citizen' 
    },
    department: { type: String, default: null }, // for officials
    zone: { type: String, default: '' }, // for officials/routing
    wardNumber: { type: String, default: '' }, // for officials
    city: { type: String, default: '' },
    trustScore: { type: Number, default: 100, min: 0, max: 100 },
    active: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
