const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

function normalizePhone(phone) {
    // Strip spaces, dashes, and ensure +91 prefix for Indian numbers
    let cleaned = (phone || '').replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('+')) {
        if (cleaned.length === 10) cleaned = '+91' + cleaned;
        else cleaned = '+' + cleaned;
    }
    return cleaned;
}

function buildUserResponse(user) {
    return {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        mode: user.mode,
        department: user.department,
        city: user.city,
        district: user.district,
        block: user.block,
        village: user.village,
        performancePoints: user.performancePoints,
        trustScore: user.trustScore,
        active: user.active,
    };
}

// @route   POST /api/auth/register
// @desc    Register a new user (phone + PIN)
router.post('/register', async (req, res) => {
    try {
        const { name, phone, pin, email, role, department, city, mode, district, block, village } = req.body;

        if (!name || !phone || !pin) {
            return res.status(400).json({ message: 'Please provide name, phone number, and PIN' });
        }

        if (pin.length < 4) {
            return res.status(400).json({ message: 'PIN must be at least 4 digits' });
        }

        const normalizedPhone = normalizePhone(phone);

        const userExists = await User.findOne({ phone: normalizedPhone });
        if (userExists) {
            return res.status(400).json({ message: 'An account with this phone number already exists' });
        }

        // Normalize legacy roles
        let normalizedRole = role || 'citizen';
        if (normalizedRole === 'user') normalizedRole = 'citizen';
        if (normalizedRole === 'engineer') normalizedRole = 'junior';
        if (normalizedRole === 'admin') normalizedRole = 'officer';

        const isOfficial = ['junior', 'dept_head', 'officer'].includes(normalizedRole);

        const user = await User.create({
            name: name.trim(),
            phone: normalizedPhone,
            pin,
            email: email ? email.toLowerCase().trim() : '',
            role: normalizedRole,
            mode: mode || 'urban',
            city: city || '',
            department: isOfficial ? (department || null) : null,
            district: district || '',
            block: block || '',
            village: village || '',
            performancePoints: 100,
            lastActiveDate: new Date(),
        });

        const token = generateToken(user._id);
        res.status(201).json({ ...buildUserResponse(user), token });
    } catch (error) {
        console.error('[Auth Register Error]', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'An account with this phone number already exists' });
        }
        res.status(500).json({ message: error.message || 'Server error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user by phone + PIN
router.post('/login', async (req, res) => {
    try {
        const { phone, pin } = req.body;

        if (!phone || !pin) {
            return res.status(400).json({ message: 'Please provide phone number and PIN' });
        }

        const normalizedPhone = normalizePhone(phone);
        const user = await User.findOne({ phone: normalizedPhone });
        if (!user) {
            return res.status(401).json({ message: 'Invalid phone number or PIN' });
        }

        const isMatch = await user.matchPin(pin);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid phone number or PIN' });
        }

        if (!user.active) {
            return res.status(401).json({ message: 'Your account has been suspended by an administrator' });
        }

        // Update lastActiveDate on login
        user.lastActiveDate = new Date();
        await user.save();

        const token = generateToken(user._id);
        res.json({ ...buildUserResponse(user), token });
    } catch (error) {
        console.error('[Auth Login Error]', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   GET /api/auth/me
// @desc    Get logged-in user profile
router.get('/me', protect, async (req, res) => {
    res.json(buildUserResponse(req.user));
});

module.exports = router;
