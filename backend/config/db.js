const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'civicsync'
        });
        console.log(`[MongoDB] Connected: ${conn.connection.host} | DB: ${conn.connection.name}`);
    } catch (error) {
        console.error(`[MongoDB Error]: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
