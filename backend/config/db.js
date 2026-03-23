const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Build URI from separate env vars to avoid dotenv mangling special chars
        const user = encodeURIComponent(process.env.MONGO_USER);
        const pass = encodeURIComponent(process.env.MONGO_PASS);
        const host = process.env.MONGO_HOST;
        const uri = process.env.MONGO_URI || `mongodb+srv://${user}:${pass}@${host}/?appName=Cluster0`;

        const conn = await mongoose.connect(uri, {
            dbName: 'civicsync'
        });
        console.log(`[MongoDB] Connected: ${conn.connection.host} | DB: ${conn.connection.name}`);
    } catch (error) {
        console.error(`[MongoDB Error]: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

