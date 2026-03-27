const { ACTamperLog } = require('../models/AnticorruptionComplaint');

/**
 * Tamper-Proof Audit Trail Middleware
 * Logs every request to /api/anticorruption/* made by authenticated (internal) users.
 * Logs are immutable — the ACTamperLog schema blocks all updates and deletes.
 */
function tamperLogMiddleware(req, res, next) {
    // Only log requests from authenticated admin/officer users
    if (req.user && ['officer', 'admin', 'dept_head', 'junior', 'engineer'].includes(req.user.role)) {
        // Fire-and-forget: don't block the request
        const sanitizedBody = { ...req.body };
        // Remove any file data from the log to avoid bloating
        if (sanitizedBody.fileData) sanitizedBody.fileData = '[FILE_DATA_STRIPPED]';
        if (sanitizedBody.files) sanitizedBody.files = `[${req.body.files?.length || 0} files]`;

        ACTamperLog.create({
            userId: req.user._id,
            userName: req.user.name || 'Unknown',
            userRole: req.user.role,
            method: req.method,
            endpoint: req.originalUrl,
            requestBody: ['POST', 'PUT'].includes(req.method) ? sanitizedBody : null,
            ipAddress: req.ip || req.connection?.remoteAddress || ''
        }).catch(err => {
            console.error('[TamperLog] Failed to write audit log:', err.message);
        });
    }

    next();
}

module.exports = tamperLogMiddleware;
