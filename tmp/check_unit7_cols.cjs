const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function checkCols() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'ph_schools' 
            AND column_name LIKE 'unit7_%'
        `);
        console.log(JSON.stringify(res.rows.map(r => r.column_name)));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkCols();
