const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Create Booking
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { type, pickup_address, delivery_address, weight_kg, price, details } = req.body;
        const userId = req.user.id;

        const newBooking = await pool.query(
            `INSERT INTO bookings (user_id, type, pickup_address, delivery_address, status, price, details) 
       VALUES ($1, $2, $3, $4, 'pending', $5, $6) RETURNING *`,
            [userId, type, pickup_address, delivery_address, price, JSON.stringify(details)]
        );

        res.json(newBooking.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get User's Bookings
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const bookings = await pool.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json(bookings.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get All Bookings (For Marketplace/Matching - Simplified)
router.get('/all', async (req, res) => {
    try {
        const bookings = await pool.query("SELECT * FROM bookings WHERE status = 'pending' ORDER BY created_at DESC");
        res.json(bookings.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});


module.exports = router;
