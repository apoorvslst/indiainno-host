/**
 * Migration Script: Convert legacy roles to new 3-tier hierarchy
 * 
 * Usage: node scripts/migrateRoles.js
 * 
 * Migrations:
 *   engineer → junior (mode: urban, performancePoints: 100)
 *   admin → officer (mode: urban, performancePoints: 100)  
 *   user → citizen (normalize)
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
    console.log('[Migration] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Migration] Connected.\n');

    const User = mongoose.connection.collection('users');

    // engineer → junior
    const engResult = await User.updateMany(
        { role: 'engineer' },
        { $set: { role: 'junior', mode: 'urban', performancePoints: 100, lastActiveDate: new Date() } }
    );
    console.log(`[Migration] engineer → junior: ${engResult.modifiedCount} users updated`);

    // admin → officer
    const adminResult = await User.updateMany(
        { role: 'admin' },
        { $set: { role: 'officer', mode: 'urban', performancePoints: 100, lastActiveDate: new Date() } }
    );
    console.log(`[Migration] admin → officer: ${adminResult.modifiedCount} users updated`);

    // user → citizen
    const userResult = await User.updateMany(
        { role: 'user' },
        { $set: { role: 'citizen' } }
    );
    console.log(`[Migration] user → citizen: ${userResult.modifiedCount} users updated`);

    // Sync assignedJuniorId from assignedEngineerId
    const Ticket = mongoose.connection.collection('mastertickets');
    const ticketResult = await Ticket.updateMany(
        { assignedEngineerId: { $ne: null }, assignedJuniorId: { $eq: null } },
        [{ $set: { assignedJuniorId: '$assignedEngineerId' } }]
    );
    console.log(`[Migration] Synced assignedJuniorId on ${ticketResult.modifiedCount} tickets`);

    console.log('\n[Migration] Complete!');
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('[Migration Error]', err);
    process.exit(1);
});
