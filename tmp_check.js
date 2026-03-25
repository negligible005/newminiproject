const { pool } = require('./db');

async function check() {
    try {
        const bookings = await pool.query('SELECT * FROM bookings');
        console.log('Bookings:', bookings.rows);

        const listings = await pool.query('SELECT * FROM listings');
        console.log('Listings:', listings.rows);

        const payments = await pool.query('SELECT * FROM dummy_payments');
        console.log('Payments:', payments.rows);
        
        const splits = await pool.query('SELECT * FROM split_requests');
        console.log('Splits:', splits.rows);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
