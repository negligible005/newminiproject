const { pool } = require('./db');

async function check() {
    try {
        const bookings = await pool.query('SELECT COUNT(*) FROM bookings');
        const confirmedBookings = await pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'");
        const payments = await pool.query('SELECT COUNT(*) FROM dummy_payments');
        const listings = await pool.query('SELECT COUNT(*) FROM listings');
        
        console.log('Total Bookings:', bookings.rows[0].count);
        console.log('Confirmed Bookings:', confirmedBookings.rows[0].count);
        console.log('Payments:', payments.rows[0].count);
        console.log('Listings:', listings.rows[0].count);

        if (parseInt(payments.rows[0].count) === 0 && parseInt(bookings.rows[0].count) > 0) {
            console.log('WARNING: There are bookings but NO dummy payments. Stats queries requiring dp join will return 0.');
        }

        const statsQuery = await pool.query(`
            SELECT COALESCE(SUM(b.total_price), 0) as raw_earned
            FROM bookings b
            WHERE b.status = 'confirmed'
        `);
        console.log('Raw Earned (without payment join):', statsQuery.rows[0].raw_earned);

    } catch(e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}
check();
