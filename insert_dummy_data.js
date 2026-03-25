const { pool, initDb } = require('./db');

async function insertDummyData() {
    try {
        await initDb();
        // Fetch users to assign as sellers
        const usersResult = await pool.query('SELECT id, name FROM users LIMIT 10');
        const users = usersResult.rows;

        if (users.length < 2) {
            console.error('Not enough users in the database to assign sellers. Please create some dummy accounts first.');
            return;
        }

        const seller1 = users[0].id;
        const seller2 = users[1].id;
        const seller3 = users[users.length - 1].id;

        const items = [
            // Electronics
            {
                seller_id: seller1,
                type: 'auction',
                category: 'Electronics',
                title: 'MacBook Pro M3 Max (16-inch)',
                description: 'Brand new, 64GB RAM, 2TB SSD. Space Black. Only used for unboxing video.',
                starting_bid: 250000,
                auction_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop']
            },
            {
                seller_id: seller2,
                type: 'sale',
                category: 'Electronics',
                title: 'iPhone 15 Pro Max - 256GB',
                description: 'Titanium Blue, perfect condition. Includes original box and accessories.',
                price: 130000,
                images: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=800&auto=format&fit=crop']
            },
            {
                seller_id: seller1,
                type: 'sale',
                category: 'Electronics',
                title: 'Sony WH-1000XM5 Headphones',
                description: 'Industry-leading noise canceling. Silver color. Used for 2 months.',
                price: 25000,
                images: ['https://images.unsplash.com/photo-1678120462050-84dc21323386?q=80&w=800&auto=format&fit=crop']
            },
            // Vehicles
            {
                seller_id: seller3,
                type: 'auction',
                category: 'Vehicles',
                title: 'Tesla Model 3 Highland (2024)',
                description: 'Long Range AWD, Pearl White. Only 500km driven. Full Self-Driving included.',
                starting_bid: 4500000,
                auction_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                images: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=800&auto=format&fit=crop']
            },
            {
                seller_id: seller2,
                type: 'sale',
                category: 'Vehicles',
                title: 'Vintage Vespa VBB 1965',
                description: 'Restored to original condition. Mint green color. Italian import.',
                price: 150000,
                images: ['https://images.unsplash.com/photo-1621252179027-94459d278660?q=80&w=800&auto=format&fit=crop']
            },
            // Home & Garden
            {
                seller_id: seller1,
                type: 'sale',
                category: 'Home & Garden',
                title: 'Herman Miller Aeron Chair',
                description: 'Size B, Graphite color. Fully loaded with posture fit. Like new.',
                price: 85000,
                images: ['https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=800&auto=format&fit=crop']
            },
            {
                seller_id: seller3,
                type: 'auction',
                category: 'Home & Garden',
                title: 'Breville Barista Pro',
                description: 'Touchscreen espresso machine. Brushed stainless steel. Perfectly maintained.',
                starting_bid: 40000,
                auction_end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                images: ['https://images.unsplash.com/photo-1565452344518-47fca79cc951?q=80&w=800&auto=format&fit=crop']
            },
            // Fashion
            {
                seller_id: seller2,
                type: 'auction',
                category: 'Fashion',
                title: 'Rolex Submariner Date',
                description: '2023 model, unworn. Box and papers included. Ceramic bezel.',
                starting_bid: 1200000,
                auction_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                images: ['https://images.unsplash.com/photo-1547996160-81dfa63595dd?q=80&w=800&auto=format&fit=crop']
            },
            {
                seller_id: seller1,
                type: 'sale',
                category: 'Fashion',
                title: 'Nike Air Jordan 1 "Lost & Found"',
                description: 'Size 10 US. Authenticity guaranteed. Deadstock condition.',
                price: 35000,
                images: ['https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=800&auto=format&fit=crop']
            },
            // Other
            {
                seller_id: seller3,
                type: 'auction',
                category: 'Other',
                title: 'Rare Pokémon Charizard Holo 1st Edition',
                description: 'PSA 10 Gem Mint. Absolute collector piece. Only for serious bidders.',
                starting_bid: 1500000,
                auction_end: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
                images: ['https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=800&auto=format&fit=crop']
            }
        ];

        for (const item of items) {
            await pool.query(
                `INSERT INTO marketplace_items (seller_id, type, category, title, description, price, starting_bid, current_highest_bid, auction_end, images) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    item.seller_id,
                    item.type,
                    item.category,
                    item.title,
                    item.description,
                    item.price || null,
                    item.starting_bid || null,
                    item.starting_bid || null,
                    item.auction_end || null,
                    JSON.stringify(item.images || [])
                ]
            );
        }

        console.log('Successfully inserted dummy marketplace items.');
        process.exit(0);

    } catch (err) {
        console.error('Error inserting dummy data:', err.message);
        process.exit(1);
    }
}

insertDummyData();
