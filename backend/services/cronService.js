/**
 * CronService — Automated SLA & Performance Deductions
 * Runs every 24 hours. Checks:
 * 1. Officials' lastActiveDate - if inactive >5 days: deduct 5 performance points
 * 2. Tickets with no progress update for 5+ days - deduct 10 points from assigned junior
 * 3. If points reach 0: lock the account
 */

const User = require('../models/User');
const { MasterTicket } = require('../models/Ticket');

const INACTIVITY_THRESHOLD_DAYS = 5;
const INACTIVITY_THRESHOLD_DAYS_TICKET = 5; // No progress update for 5 days
const POINTS_DEDUCTION_INACTIVE = 5;
const POINTS_DEDUCTION_DELAY = 10; // 10 points for no progress on ticket
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function runInactivityDeduction() {
    console.log('[CronService] Running daily performance deduction check...');
    try {
        const thresholdDate = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

        const inactiveOfficials = await User.find({
            role: { $in: ['junior', 'dept_head'] },
            active: true,
            lastActiveDate: { $lt: thresholdDate },
            performancePoints: { $gt: 0 }
        });

        let deducted = 0;
        let locked = 0;

        for (const official of inactiveOfficials) {
            official.performancePoints = Math.max(0, official.performancePoints - POINTS_DEDUCTION_INACTIVE);

            if (official.performancePoints <= 0) {
                official.active = false;
                locked++;
                console.log(`[CronService] LOCKED account: ${official.name} — 0 points (inactive)`);
            } else {
                console.log(`[CronService] Deducted ${POINTS_DEDUCTION_INACTIVE}pts from ${official.name} — now ${official.performancePoints}pts (inactive)`);
            }

            deducted++;
            await official.save();
        }

        console.log(`[CronService] Inactivity check: ${deducted} deductions, ${locked} lockouts`);
    } catch (err) {
        console.error('[CronService] Error during inactivity deduction:', err.message);
    }
}

async function runTicketProgressDeduction() {
    console.log('[CronService] Running ticket progress deduction check...');
    try {
        const thresholdDate = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS_TICKET * 24 * 60 * 60 * 1000);

        // Find tickets that are assigned but have no progress update for 5+ days
        const stalledTickets = await MasterTicket.find({
            status: { $in: ['Assigned', 'In_Progress'] },
            lastProgressUpdate: { $lt: thresholdDate },
            $or: [
                { assignedJuniorId: { $ne: null } },
                { assignedEngineerId: { $ne: null } }
            ]
        }).populate('assignedJuniorId assignedEngineerId', 'name performancePoints');

        let deducted = 0;

        for (const ticket of stalledTickets) {
            const assignee = ticket.assignedJuniorId || ticket.assignedEngineerId;
            if (!assignee || assignee.performancePoints <= 0) continue;

            // Deduct points
            assignee.performancePoints = Math.max(0, assignee.performancePoints - POINTS_DEDUCTION_DELAY);
            
            console.log(`[CronService] Deducted ${POINTS_DEDUCTION_DELAY}pts from ${assignee.name} — ticket ${ticket.ticketNumber} no progress for ${INACTIVITY_THRESHOLD_DAYS_TICKET} days`);
            
            // Add to ticket action history
            ticket.actionHistory.push({
                actionDate: new Date(),
                updatedBy: null,
                previousStatus: ticket.status,
                newStatus: ticket.status,
                remarks: `Auto-deduction: ${POINTS_DEDUCTION_DELAY} points deducted for no progress update in ${INACTIVITY_THRESHOLD_DAYS_TICKET} days`,
                progressPercentage: ticket.progressPercent
            });

            deducted++;
            await assignee.save();
            await ticket.save();
        }

        console.log(`[CronService] Ticket progress check: ${deducted} deductions`);
    } catch (err) {
        console.error('[CronService] Error during ticket progress deduction:', err.message);
    }
}

async function runDeductionCycle() {
    await runInactivityDeduction();
    await runTicketProgressDeduction();
    console.log('[CronService] All daily checks complete');
}

function startCronService() {
    console.log('[CronService] Started — checking every 24 hours');
    setTimeout(() => runDeductionCycle(), 10000); // 10s after startup
    setInterval(runDeductionCycle, CHECK_INTERVAL_MS);
}

module.exports = { startCronService, runDeductionCycle };
