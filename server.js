const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const http = require('http');
const socketIo = require('socket.io');

const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
const PORT = process.env.PORT || 3000;

// Share io instance with routes
app.set('io', io);

// Unique ID for this server run to force client logouts on restart
const SERVER_START_ID = Date.now().toString();

// Error handling to prevent server from exiting
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Core Middleware
app.use(cors());
app.use(express.json());

// ─── API ROUTES (must be before static serving) ─────────────────────────────

// Session endpoint — MUST be before static to prevent HTML being served
app.get('/api/sys/session', (req, res) => {
    res.json({ sessionId: SERVER_START_ID });
});

app.get('/api/test-ping', (req, res) => {
    res.json({ message: 'pong', timestamp: Date.now() });
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their private room.`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/splits', require('./routes/splits'));
app.use('/api/trust', require('./routes/trust'));
app.use('/api/ai', require('./routes/ai')); // Keeping this for backwards compatibility if needed
app.use('/api/chatbot', require('./routes/chatbot')); // New Guided Chatbot
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/payments', require('./routes/payments'));

// File upload
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images are allowed'));
    }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

app.use('/uploads', express.static(uploadsDir));

// ─── STATIC FILES (must be LAST so it doesn't shadow API routes) ─────────────
app.use(express.static(path.join(__dirname, '/')));

// ─── START SERVER ─────────────────────────────────────────────────────────────
initDb().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
