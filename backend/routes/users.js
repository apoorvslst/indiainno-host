const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/users
// @desc    Get users (filter by ?role=engineer etc.)
// @access  Admin/Engineer (protected)
router.get('/', protect, async (req, res) => {
    try {
        const query = {};
        if (req.query.role) query.role = req.query.role;
        if (req.query.department) query.department = req.query.department;

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (err) {
        console.error('[Users List Error]', err);
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/users/:id
// @desc    Get single user profile
// @access  Admin
router.get('/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user (trust score, status, department)
// @access  Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (req.body.trustScore !== undefined) {
            user.trustScore = Math.max(0, Math.min(100, req.body.trustScore));
        }
        if (req.body.active !== undefined) user.active = req.body.active;
        if (req.body.department !== undefined) user.department = req.body.department;
        if (req.body.role !== undefined) user.role = req.body.role;

        const updatedUser = await user.save();
        const userObj = updatedUser.toObject();
        delete userObj.password;

        res.json(userObj);
    } catch (err) {
        console.error('[User Update Error]', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
