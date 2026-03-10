const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
        console.log(`${color}${req.method}\x1b[0m ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Root health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'CivicSync API (MERN)',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Config endpoint to fetch public settings without hardcoding (like twilio number)
app.get('/api/config', (req, res) => {
    res.json({
        helplineNumber: process.env.TWILIO_PHONE_NUMBER || "Not Configured"
    });
});

// Routes
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const voiceRoutes = require('./routes/voice');
const smsRoutes = require('./routes/sms');

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/sms', smsRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

// Connect DB then start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n✅ [CivicSync] Server running on http://localhost:${PORT}`);
        console.log(`📊 [API Routes]`);
        console.log(`   POST /api/auth/register`);
        console.log(`   POST /api/auth/login`);
        console.log(`   GET  /api/auth/me`);
        console.log(`   POST /api/tickets/complaint`);
        console.log(`   GET  /api/tickets/my-complaints`);
        console.log(`   GET  /api/tickets/master`);
        console.log(`   PUT  /api/tickets/master/:id`);
        console.log(`   GET  /api/users`);
        console.log(`   PUT  /api/users/:id\n`);
    });
});
