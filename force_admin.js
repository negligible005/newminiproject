const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function updateAndVerify() {
    try {
        await pool.query("UPDATE users SET role = 'admin' WHERE email = 'rachel@gmail.com'");
        const res = await pool.query("SELECT email, role FROM users WHERE email = 'rachel@gmail.com'");
        if (res.rows.length > 0) {
            console.log(`VERIFIED: ${res.rows[0].email} is now ${res.rows[0].role}`);
        } else {
            console.log("NOT FOUND: Rachel user does not exist in DB");
        }
        await pool.end();
    } catch (err) {
        console.error("DB ERROR:", err);
        process.exit(1);
    }
}

updateAndVerify();
