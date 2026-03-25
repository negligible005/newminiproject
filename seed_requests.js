const bcrypt = require('bcrypt');
const { pool } = require('./db');

const seedRequests = async () => {
    try {
        console.log("🌱 Seeding Sample Requests...");

        // 1. Create an admin if not exists
        const adminHash = await bcrypt.hash('admin123', 10);
        await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
            ['System Admin', 'admin@unio.com', adminHash, 'admin']
        );

        // 2. Fetch some existing users to be providers/sellers
        const providers = await pool.query("SELECT id FROM users WHERE role = 'provider' LIMIT 2");
        if (providers.rows.length < 1) {
             console.log("⚠️ No providers found. Run seed.js first.");
             process.exit(0);
        }
        const p1 = providers.rows[0].id;
        const p2 = providers.rows[1] ? providers.rows[1].id : p1;

        // 3. Create Pending Listings
        await pool.query(`
            INSERT INTO listings (provider_id, type, capacity, price_per_unit, location, date, approved, details)
            VALUES 
            ($1, 'cold_storage', '50 Units', 120.00, 'Mumbai North', '2026-04-10', FALSE, '{"temp": "-18C", "security": "High"}'),
            ($2, 'cargo_split', '500kg', 15.00, 'Delhi -> Jaipur', '2026-03-30', FALSE, '{"vehicle": "Tata Ace", "insurance": true}')
        `, [p1, p2]);

        // 4. Create Marketplace Items (some pending)
        await pool.query(`
            INSERT INTO marketplace_items (seller_id, type, category, title, description, price, status)
            VALUES 
            ($1, 'item', 'Electronics', 'MacBook Air M2', 'Slightly used, silver color', 75000, 'pending'),
            ($2, 'item', 'Furniture', 'Ergonomic Chair', 'Brand new office chair', 12000, 'pending')
        `, [p1, p2]);

        // 5. Create Split Requests
        // Need an active item for a split
        const itemRes = await pool.query("INSERT INTO marketplace_items (seller_id, type, category, title, description, price, status) VALUES ($1, 'subscription', 'Software', 'Netflix Premium', '4 Slots available', 649, 'active') RETURNING id", [p1]);
        const itemId = itemRes.rows[0].id;

        await pool.query(`
            INSERT INTO split_requests (item_id, creator_id, total_slots, filled_slots, price_per_person, status)
            VALUES ($1, $2, 4, 1, 162.25, 'pending')
        `, [itemId, p2]);

        console.log("✅ Sample requests seeded successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
};

seedRequests();
