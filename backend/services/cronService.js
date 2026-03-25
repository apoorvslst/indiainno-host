/**
 * CronService — Automated SLA & Performance Deductions
 * Runs every 24 hours. Checks officials' lastActiveDate.
 * If inactive >5 days: deduct 5 performance points.
 * If points reach 0: lock the account.
 */

const User = require('../models/User');

const INACTIVITY_THRESHOLD_DAYS = 5;
const POINTS_DEDUCTION = 5;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function runDeductionCycle() {
    console.log('[CronService] Running daily performance deduction check...');
    try {
        const thresholdDate = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

        // Find officials who haven't been active in the last 5 days
        const inactiveOfficials = await User.find({
            role: { $in: ['junior', 'dept_head'] },
            active: true,
            lastActiveDate: { $lt: thresholdDate },
            performancePoints: { $gt: 0 }
        });

        let deducted = 0;
        let locked = 0;

        for (const official of inactiveOfficials) {
            official.performancePoints = Math.max(0, official.performancePoints - POINTS_DEDUCTION);

            if (official.performancePoints <= 0) {
                official.active = false;
                locked++;
                console.log(`[CronService] LOCKED account: ${official.name} (${official.email}) — 0 points`);
            } else {
                console.log(`[CronService] Deducted ${POINTS_DEDUCTION}pts from ${official.name} (${official.email}) — now ${official.performancePoints}pts`);
            }

            deducted++;
            await official.save();
        }

        console.log(`[CronService] Cycle complete: ${deducted} deductions, ${locked} lockouts`);
    } catch (err) {
        console.error('[CronService] Error during deduction cycle:', err.message);
    }
}

function startCronService() {
    console.log('[CronService] Started — checking every 24 hours');
    // Run immediately on startup, then every 24 hours
    setTimeout(() => runDeductionCycle(), 10000); // 10s after startup
    setInterval(runDeductionCycle, CHECK_INTERVAL_MS);
}

module.exports = { startCronService, runDeductionCycle };
