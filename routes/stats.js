const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

// GET /api/stats/global
// Calculates aggregate platform-wide earnings, savings, and splits
router.get('/global', async (req, res) => {
    try {
        // 1. Total Earned (Total transaction volume of confirmed bookings)
        const earnedRes = await pool.query(`
            SELECT COALESCE(SUM(total_price), 0) as total_earned
            FROM bookings b
            WHERE b.status = 'confirmed'
        `);
        const totalEarned = parseFloat(earnedRes.rows[0].total_earned || 0);

        // 2. Total Saved (Sum of all sharing revenue + consumer discounts)
        // Part A: Sharing Revenue (What providers collected back)
        const sharingRevenueRes = await pool.query(`
            SELECT COALESCE(SUM(b.total_price), 0) as sharing_revenue
            FROM listings l
            JOIN bookings b ON l.id = b.listing_id 
            WHERE l.type IN ('digital_subscriptions', 'sports', 'travel', 'other')
              AND b.status = 'confirmed'
        `);
        const sharingRevenue = parseFloat(sharingRevenueRes.rows[0].sharing_revenue || 0);

        // Part B: Consumer Discounts (Total Value - Paid Amount)
        const discountsRes = await pool.query(`
            SELECT 
                l.capacity, 
                l.price_per_unit, 
                b.total_price as paid_amount
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            WHERE b.status = 'confirmed'
              AND l.type IN ('digital_subscriptions', 'sports', 'travel', 'other')
        `);
        
        let totalDiscounts = 0;
        discountsRes.rows.forEach(row => {
            const capacity = parseInt(row.capacity) || 1;
            const price = parseFloat(row.price_per_unit);
            const totalValue = capacity * price;
            const paid = parseFloat(row.paid_amount);
            totalDiscounts += Math.max(0, totalValue - paid);
        });

        const totalSaved = sharingRevenue + totalDiscounts;

        // 3. Active Splits (Count of all requested listings/splits)
        // Using "listings" to match personal stats active_splits logic
        const activeSplitsRes = await pool.query("SELECT COUNT(*) FROM listings");
        const activeSplits = parseInt(activeSplitsRes.rows[0].count);

        res.json({
            amount_earned: totalEarned,
            amount_saved: totalSaved,
            active_splits: activeSplits
        });

    } catch (err) {
        console.error("Error fetching global stats:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/stats
// Calculates dynamic earnings/savings for the logged in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Savings from Splits Created by the User (Revenue collected from others)
        const providedSavingsQuery = `
            SELECT COALESCE(SUM(b.total_price), 0) as provided_savings
            FROM listings l
            JOIN bookings b ON l.id = b.listing_id 
            JOIN dummy_payments dp ON b.id = dp.booking_id
            WHERE l.provider_id = $1 
              AND l.type IN ('digital_subscriptions', 'sports', 'travel', 'other')
              AND b.status = 'confirmed'
        `;
        const providedRes = await pool.query(providedSavingsQuery, [userId]);
        const providedSavings = parseFloat(providedRes.rows[0].provided_savings || 0);

        // 2. Savings from Splits Joined by the User
        // Saving = (Total Split Value) - (What the user paid)
        // Total Split Value = capacity * price_per_unit
        const joinedSavingsQuery = `
            SELECT 
                l.capacity, 
                l.price_per_unit, 
                b.total_price as paid_amount
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN dummy_payments dp ON b.id = dp.booking_id
            WHERE b.user_id = $1 
              AND l.type IN ('digital_subscriptions', 'sports', 'travel', 'other')
              AND b.status = 'confirmed'
        `;
        const joinedRes = await pool.query(joinedSavingsQuery, [userId]);
        
        let joinedSavings = 0;
        joinedRes.rows.forEach(row => {
            const capacity = parseInt(row.capacity) || 1;
            const price = parseFloat(row.price_per_unit);
            const totalValue = capacity * price;
            const paid = parseFloat(row.paid_amount);
            const saving = Math.max(0, totalValue - paid);
            joinedSavings += saving;
        });

        // 3. Provider Earnings (Total revenue from all confirmed bookings)
        const amountEarnedQuery = `
            SELECT COALESCE(SUM(b.total_price), 0) as total_earned
            FROM listings l
            JOIN bookings b ON l.id = b.listing_id 
            JOIN dummy_payments dp ON b.id = dp.booking_id
            WHERE l.provider_id = $1 
              AND b.status = 'confirmed'
        `;
        const earnedRes = await pool.query(amountEarnedQuery, [userId]);
        const amountEarned = parseFloat(earnedRes.rows[0].total_earned || 0);

        // 4. Active Splits (still using the original logic of listings created)
        const activeSplitsRes = await pool.query('SELECT COUNT(*) FROM listings WHERE provider_id = $1', [userId]);

        const totalAmountSaved = providedSavings + joinedSavings;

        res.json({
            amount_saved: totalAmountSaved,
            amount_earned: amountEarned,
            provided_savings: providedSavings,
            joined_savings: joinedSavings,
            active_splits: parseInt(activeSplitsRes.rows[0].count)
        });

    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/stats/savings-history
// Detailed saving events for the analytics modal
router.get('/savings-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Savings from Splits Created (Revenue collected)
        const createdQuery = `
            SELECT 
                l.details->>'app' as item_name,
                l.type,
                b.total_price as amount,
                dp.created_at as date
            FROM listings l
            JOIN bookings b ON l.id = b.listing_id 
            JOIN dummy_payments dp ON b.id = dp.booking_id
            WHERE l.provider_id = $1 
              AND l.type IN ('digital_subscriptions', 'sports', 'travel', 'other')
              AND b.status = 'confirmed'
            ORDER BY dp.created_at DESC
        `;
        const createdRes = await pool.query(createdQuery, [userId]);
        const createdHistory = createdRes.rows.map(r => ({
            item: r.item_name || r.type.replace(/_/g, ' '),
            type: 'Split Shared',
            amount: parseFloat(r.amount),
            date: r.date
        }));

        // 2. Savings from Splits Joined (Discount)
        const joinedQuery = `
            SELECT 
                l.details->>'app' as item_name,
                l.type,
                l.capacity, 
                l.price_per_unit, 
                b.total_price as paid_amount,
                dp.created_at as date
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN dummy_payments dp ON b.id = dp.booking_id
            WHERE b.user_id = $1 
              AND l.type IN ('digital_subscriptions', 'sports', 'travel', 'other')
              AND b.status = 'confirmed'
            ORDER BY dp.created_at DESC
        `;
        const joinedRes = await pool.query(joinedQuery, [userId]);
        const joinedHistory = joinedRes.rows.map(row => {
            const capacity = parseInt(row.capacity) || 1;
            const price = parseFloat(row.price_per_unit);
            const totalValue = capacity * price;
            const paid = parseFloat(row.paid_amount);
            const saving = Math.max(0, totalValue - paid);
            return {
                item: row.item_name || row.type.replace(/_/g, ' '),
                type: 'Split Joined',
                amount: saving,
                date: row.date
            };
        });

        // 3. Merge and Sort
        const allHistory = [...createdHistory, ...joinedHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

        // 4. Group by Month for Graph
        const monthlyData = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Initialize last 6 months
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const mLabel = monthNames[d.getMonth()];
            monthlyData[mLabel] = 0;
        }

        allHistory.forEach(h => {
            const mIdx = new Date(h.date).getMonth();
            const mLabel = monthNames[mIdx];
            if (monthlyData.hasOwnProperty(mLabel)) {
                monthlyData[mLabel] += h.amount;
            }
        });

        const graphData = Object.keys(monthlyData).map(m => ({
            month: m,
            amount: monthlyData[m]
        }));

        res.json({
            history: allHistory,
            graphData: graphData
        });

    } catch (err) {
        console.error("Error fetching savings history:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/stats/history
// Fetches the provider's chronological earnings history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // We want all bookings made against any of the user's listings
        const historyQuery = `
            SELECT 
                b.id as booking_id,
                b.created_at as date,
                b.quantity,
                b.total_price as amount,
                l.type as listing_type,
                l.location as listing_location,
                u.name as consumer_name,
                u.email as consumer_email,
                dp.confirmation_id
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN dummy_payments dp ON dp.booking_id = b.id
            WHERE l.provider_id = $1 AND b.status = 'confirmed'
            ORDER BY b.created_at DESC
            LIMIT 50
        `;

        const { rows } = await pool.query(historyQuery, [userId]);

        res.json(rows);

    } catch (err) {
        console.error("Error fetching history:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/stats/earnings-history
// Detailed earning events for the provider analytics graph
router.get('/earnings-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const historyQuery = `
            SELECT 
                b.id as booking_id,
                b.created_at as date,
                b.total_price as amount,
                l.type as listing_type,
                l.location as listing_location,
                dp.created_at as payment_date
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN dummy_payments dp ON dp.booking_id = b.id
            WHERE l.provider_id = $1 AND b.status = 'confirmed'
            ORDER BY dp.created_at DESC
        `;

        const { rows } = await pool.query(historyQuery, [userId]);
        
        const history = rows.map(r => ({
            item: r.listing_type.replace(/_/g, ' '),
            amount: parseFloat(r.amount),
            date: r.payment_date || r.date
        }));

        // Group by Month for Graph
        const monthlyData = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Initialize last 6 months
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const mLabel = monthNames[d.getMonth()];
            monthlyData[mLabel] = 0;
        }

        history.forEach(h => {
            const mIdx = new Date(h.date).getMonth();
            const mLabel = monthNames[mIdx];
            if (monthlyData.hasOwnProperty(mLabel)) {
                monthlyData[mLabel] += h.amount;
            }
        });

        const graphData = Object.keys(monthlyData).map(m => ({
            month: m,
            amount: monthlyData[m]
        }));

        res.json({
            history: history,
            graphData: graphData
        });

    } catch (err) {
        console.error("Error fetching earnings history:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
