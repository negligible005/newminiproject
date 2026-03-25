const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Helper to format bookings for chat options
function formatBookingOptions(bookings) {
    if (bookings.length === 0) {
        return [
            { label: "Check again later", next: "main_menu" }
        ];
    }
    
    return bookings.map(b => ({
        label: `Order #${b.id} - ${b.type.replace(/_/g, ' ')}`,
        next: "order_details",
        context: { order_id: b.id }
    })).concat([
        { label: "Main Menu", next: "main_menu" }
    ]);
}

router.post('/interact', authenticateToken, async (req, res) => {
    try {
        const { node_id, context = {} } = req.body;
        const userId = req.user.id;
        const role = req.user.role || 'consumer';

        // -----------------------------------------------------
        // STATE MACHINE LOGIC
        // -----------------------------------------------------
        
        // 1. MAIN MENU
        if (node_id === 'main_menu') {
            if (role === 'provider') {
                return res.json({
                    message: "Welcome to Provider Support. How can I assist you today?",
                    options: [
                        { label: "Manage My Listings", next: "provider_listings" },
                        { label: "Check Earnings", next: "provider_earnings" },
                        { label: "Report an Issue", next: "report_issue" },
                        { label: "Talk to Human", next: "talk_human" }
                    ]
                });
            } else {
                return res.json({
                    message: "Welcome to UNIO Support! Please choose an option below:",
                    options: [
                        { label: "Track My Order", next: "track_order" },
                        { label: "Check Trust Score", next: "check_trust" },
                        { label: "Report an Issue", next: "report_issue" },
                        { label: "Payment Help", next: "payment_help" },
                        { label: "Other Queries", next: "other_queries" }
                    ]
                });
            }
        }

        // 2. TRACK ORDER FLOW (Consumer only)
        if (node_id === 'track_order') {
            // Fetch recent active orders
            const recentOrders = await pool.query(
                `SELECT b.id, l.type, b.status 
                 FROM bookings b 
                 JOIN listings l ON b.listing_id = l.id 
                 WHERE b.user_id = $1 AND b.status != 'cancelled' 
                 ORDER BY b.created_at DESC LIMIT 3`, 
                [userId]
            );

            return res.json({
                message: "Which order would you like to track? Here are your recent active orders:",
                options: formatBookingOptions(recentOrders.rows)
            });
        }

        if (node_id === 'order_details' && context.order_id) {
            // Fetch specific order details
            const orderRes = await pool.query(
                `SELECT status, eta, updated_at FROM bookings WHERE id = $1 AND user_id = $2`,
                [context.order_id, userId]
            );

            if (orderRes.rows.length === 0) {
                return res.json({
                    message: "I couldn't find details for that order.",
                    options: [{ label: "Back to Main Menu", next: "main_menu" }]
                });
            }

            const order = orderRes.rows[0];
            const statusStr = order.status.replace(/_/g, ' ').toUpperCase();
            
            return res.json({
                message: `Order #${context.order_id} is currently **${statusStr}**.\n\n` + 
                         (order.eta ? `Estimated Time of Arrival: **${order.eta}**\n` : '') +
                         `Last updated: ${new Date(order.updated_at).toLocaleString()}`,
                options: [
                    { label: "Track Another Order", next: "track_order" },
                    { label: "Report an Issue with this Order", next: "order_issue", context: { order_id: context.order_id } },
                    { label: "Main Menu", next: "main_menu" }
                ]
            });
        }

        // 3. REPORT ISSUE FLOW
        if (node_id === 'report_issue') {
            return res.json({
                message: "What kind of issue are you experiencing?",
                options: [
                    { label: "Order not delivered", next: "issue_resolution", context: { issue_type: "delivery" } },
                    { label: "Wrong item / service", next: "issue_resolution", context: { issue_type: "wrong_item" } },
                    { label: "App performance/bugs", next: "issue_resolution", context: { issue_type: "technical" } },
                    { label: "Back to Main Menu", next: "main_menu" }
                ]
            });
        }

        if (node_id === 'order_issue') {
            return res.json({
                message: `I'm sorry you are having trouble with Order #${context.order_id || 'Unknown'}. What went wrong?`,
                options: [
                    { label: "Damaged / Bad Quality", next: "issue_resolution", context: { issue_type: "damaged" } },
                    { label: "Provider didn't show", next: "issue_resolution", context: { issue_type: "no_show" } },
                    { label: "Other", next: "issue_resolution", context: { issue_type: "other" } },
                    { label: "Back to Main Menu", next: "main_menu" }
                ]
            });
        }

        if (node_id === 'issue_resolution') {
            // Escalate to human support
            return res.json({
                message: "I've noted the issue. A support agent will review this and get back to you within 24 hours.",
                options: [
                    { label: "Main Menu", next: "main_menu" },
                    { label: "Close Chat", next: "close_chat" }
                ]
            });
        }

        // NEW FLOW: CHECK TRUST SCORE
        if (node_id === 'check_trust') {
            const trustQuery = await pool.query(
                `SELECT COALESCE(AVG(score), 0) as avg_score, COUNT(*) as total_reviews 
                 FROM trust_scores WHERE ratee_id = $1`, [userId]
            );
            
            const stats = trustQuery.rows[0];
            const avgScore = parseFloat(stats.avg_score).toFixed(1);
            
            let message = '';
            if (stats.total_reviews == 0) {
                message = "You don't have any trust score ratings yet. Participate in the UNIO community or complete splits to get rated!";
            } else {
                message = `Your current Trust Score is **${avgScore}/5.0** based on ${stats.total_reviews} reviews.`;
            }

            return res.json({
                message: message,
                options: [
                    { label: "How are scores calculated?", next: "faq_response", context: { topic: "trust_score" } },
                    { label: "Back to Main Menu", next: "main_menu" }
                ]
            });
        }

        // 4. PAYMENT HELP FLOW
        if (node_id === 'payment_help') {
            return res.json({
                message: "Here are some common payment topics. What do you need help with?",
                options: [
                    { label: "Check Recent Payments", next: "check_payments" },
                    { label: "Payment failed but money deducted", next: "issue_resolution", context: { issue_type: "payment_failed" } },
                    { label: "How to use UNIO wallet", next: "faq_response", context: { topic: "wallet" } },
                    { label: "Main Menu", next: "main_menu" }
                ]
            });
        }

        if (node_id === 'check_payments') {
            const paymentsQuery = await pool.query(
                `SELECT payment_amount, status, created_at FROM dummy_payments 
                 WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3`, [userId]
            );

            let message = '';
            if (paymentsQuery.rows.length === 0) {
                message = "You don't have any recent payments on record.";
            } else {
                message = "Here are your 3 most recent payment transactions:\n\n";
                paymentsQuery.rows.forEach(p => {
                    message += `- **₹${p.payment_amount}** (${p.status}) on ${new Date(p.created_at).toLocaleDateString()}\n`;
                });
            }

            return res.json({
                message: message,
                options: [
                    { label: "Report a Payment Issue", next: "issue_resolution", context: { issue_type: "payment_failed" } },
                    { label: "Back to Main Menu", next: "main_menu" }
                ]
            });
        }

        // 5. FAQ / MISCELLANEOUS
        if (node_id === 'faq_response') {
            if (context.topic === 'wallet') {
                return res.json({
                    message: "UNIO wallet automatically applies your balances toward your next booked split. You can top it up via standard UPI or credit card.",
                    options: [{ label: "Main Menu", next: "main_menu" }]
                });
            }
            if (context.topic === 'trust_score') {
                return res.json({
                    message: "Trust scores are calculated based on ratings provided by other users after a split or marketplace interaction. A higher score unlocks priority benefits!",
                    options: [
                        { label: "Check my Score", next: "check_trust" },
                        { label: "Main Menu", next: "main_menu" }
                    ]
                });
            }
        }

        if (node_id === 'other_queries' || node_id === 'talk_human') {
            return res.json({
                message: "If you need customized help, our human support team is available from 9 AM to 9 PM IST.",
                options: [
                    { label: "Leave a message for Support", next: "issue_resolution" },
                    { label: "Main Menu", next: "main_menu" }
                ]
            });
        }
        
        // PROVIDER SPECIFIC OPTIONS
        if (node_id === 'provider_listings') {
            const listingsQuery = await pool.query(`SELECT COUNT(*) FROM listings WHERE provider_id = $1`, [userId]);
            const count = listingsQuery.rows[0].count;
            return res.json({
                message: `You currently have ${count} active listings on UNIO. Provide better details and photos to attract more bookings!`,
                options: [
                    { label: "Check Earnings", next: "provider_earnings" },
                    { label: "Main Menu", next: "main_menu" }
                ]
            });
        }

        if (node_id === 'provider_earnings') {
            const earningQuery = await pool.query(
                `SELECT COALESCE(SUM(total_price), 0) as total FROM bookings b JOIN listings l ON b.listing_id = l.id WHERE l.provider_id = $1 AND b.payment_status = 'paid'`, 
                [userId]
            );
            return res.json({
                message: `Your total cleared earnings are ₹${earningQuery.rows[0].total}. Payments are settled every Monday.`,
                options: [
                    { label: "Manage Listings", next: "provider_listings" },
                    { label: "Main Menu", next: "main_menu" }
                ]
            });
        }

        if (node_id === 'close_chat') {
            return res.json({
                message: "Goodbye! Have a great day ahead! 👋",
                options: []
            });
        }

        // 6. DEFAULT FALLBACK
        return res.json({
            message: "I'm sorry, I encountered an unknown step. Let's start over.",
            options: [
                { label: "Main Menu", next: "main_menu" }
            ]
        });

    } catch (err) {
        console.error("Chatbot interact error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
