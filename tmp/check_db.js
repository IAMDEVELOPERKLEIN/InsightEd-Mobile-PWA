const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form'
      ORDER BY ordinal_position;
    `);
        console.log('--- Columns in engineer_form ---');
        res.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkColumns();
