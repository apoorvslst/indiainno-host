const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-pin');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            if (!req.user.active) {
                return res.status(401).json({ message: 'Account suspended by administrator' });
            }
            return next();
        } catch (error) {
            console.error('[Auth Middleware]', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    // No token at all
    return res.status(401).json({ message: 'Not authorized, no token provided' });
};

// Backward-compat role mapping: 'admin' → also matches 'officer', 'engineer' → also matches 'junior'
const ROLE_COMPAT = {
    admin: ['admin', 'officer'],
    officer: ['admin', 'officer'],
    engineer: ['engineer', 'junior'],
    junior: ['engineer', 'junior'],
    dept_head: ['dept_head'],
    user: ['user', 'citizen'],
    citizen: ['user', 'citizen'],
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ message: 'User role not authorized for this action' });
        }
        const userRole = req.user.role;
        // Check if user's role matches any of the allowed roles (with backward compat)
        const allowed = roles.some(allowedRole => {
            const compatRoles = ROLE_COMPAT[allowedRole] || [allowedRole];
            return compatRoles.includes(userRole);
        });
        if (!allowed) {
            return res.status(403).json({ message: 'User role not authorized for this action' });
        }
        next();
    };
};

module.exports = { protect, authorize };
