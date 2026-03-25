const { pool } = require('./db');
pool.query("SELECT id FROM marketplace_items WHERE title LIKE '%Vintage Vespa%'")
    .then(res => {
        console.log('ITEM_ID_FOUND:' + JSON.stringify(res.rows));
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
