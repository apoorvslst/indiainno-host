const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('officer', 'dept_head', 'admin'), async (req, res) => {
  try {
    const query = {};
    if (req.query.role) query.role = req.query.role;
    if (req.query.department) query.department = req.query.department;

    if (['dept_head'].includes(req.user.role)) {
      query.department = req.user.department;
      if (req.user.mode === 'urban') {
        query.city = req.user.city;
      } else {
        query.district = req.user.district;
      }
      if (!req.query.role) query.role = 'junior';
    }

    const users = await User.find(query)
      .select('-pin')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error('[Users List Error]', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', protect, authorize('officer', 'dept_head', 'admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-pin');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('officer', 'dept_head', 'admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.trustScore !== undefined) {
      user.trustScore = Math.max(0, Math.min(100, req.body.trustScore));
    }
    if (req.body.performancePoints !== undefined) {
      user.performancePoints = Math.max(0, Math.min(100, req.body.performancePoints));
    }
    if (req.body.active !== undefined) user.active = req.body.active;
    if (req.body.department !== undefined) user.department = req.body.department;
    if (req.body.role !== undefined) user.role = req.body.role;
    if (req.body.warning !== undefined) user.warning = req.body.warning;

    const updatedUser = await user.save();
    const userObj = updatedUser.toObject();
    delete userObj.pin;

    res.json(userObj);
  } catch (err) {
    console.error('[User Update Error]', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/ban', protect, authorize('officer', 'dept_head'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (['officer', 'dept_head', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Cannot ban officials' });
    }

    user.isBanned = true;
    user.banReason = req.body.reason || 'Fake case reported';
    user.bannedBy = req.user._id;
    user.bannedAt = new Date();
    user.active = false;

    await user.save();

    res.json({
      message: 'Citizen banned successfully',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        isBanned: user.isBanned,
        banReason: user.banReason
      }
    });
  } catch (err) {
    console.error('[Ban User Error]', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/unban', protect, authorize('officer'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = false;
    user.banReason = '';
    user.bannedBy = null;
    user.bannedAt = null;
    user.active = true;

    await user.save();

    res.json({ message: 'Citizen unbanned successfully' });
  } catch (err) {
    console.error('[Unban User Error]', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/penalty', protect, authorize('officer', 'dept_head'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const points = req.body.points || 0;
    user.performancePoints = Math.max(0, (user.performancePoints || 100) - points);

    await user.save();

    res.json({
      message: 'Penalty applied',
      performancePoints: user.performancePoints
    });
  } catch (err) {
    console.error('[Penalty Error]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// @route   GET /api/users/:id
// @desc    Get single user profile
// @access  officer, dept_head
router.get('/:id', protect, authorize('officer', 'dept_head', 'admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-pin');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user (trust score, status, department, performance points)
// @access  officer, dept_head
router.put('/:id', protect, authorize('officer', 'dept_head', 'admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (req.body.trustScore !== undefined) {
            user.trustScore = Math.max(0, Math.min(100, req.body.trustScore));
        }
        if (req.body.performancePoints !== undefined) {
            user.performancePoints = Math.max(0, Math.min(100, req.body.performancePoints));
        }
        if (req.body.active !== undefined) user.active = req.body.active;
        if (req.body.department !== undefined) user.department = req.body.department;
        if (req.body.role !== undefined) user.role = req.body.role;
        if (req.body.warning !== undefined) user.warning = req.body.warning;

        const updatedUser = await user.save();
        const userObj = updatedUser.toObject();
        delete userObj.pin;

        res.json(userObj);
    } catch (err) {
        console.error('[User Update Error]', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

router.post('/:id/ban', protect, authorize('officer', 'dept_head'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (['officer', 'dept_head', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Cannot ban officials' });
    }

    user.isBanned = true;
    user.banReason = req.body.reason || 'Fake case reported';
    user.bannedBy = req.user._id;
    user.bannedAt = new Date();
    user.active = false;

    await user.save();

    res.json({ 
      message: 'Citizen banned successfully', 
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        isBanned: user.isBanned,
        banReason: user.banReason
      }
    });
  } catch (err) {
    console.error('[Ban User Error]', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/unban', protect, authorize('officer'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = false;
    user.banReason = '';
    user.bannedBy = null;
    user.bannedAt = null;
    user.active = true;

    await user.save();

    res.json({ message: 'Citizen unbanned successfully' });
  } catch (err) {
    console.error('[Unban User Error]', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/penalty', protect, authorize('officer', 'dept_head'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const points = req.body.points || 0;
    user.performancePoints = Math.max(0, (user.performancePoints || 100) - points);

    await user.save();

    res.json({ 
      message: 'Penalty applied', 
      performancePoints: user.performancePoints
    });
  } catch (err) {
    console.error('[Penalty Error]', err);
    res.status(500).json({ message: err.message });
  }
});
