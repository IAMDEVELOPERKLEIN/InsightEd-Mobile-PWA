
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectTable() {
    try {
        console.log('Inspecting engineer_form constraints...');
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE contype IN ('u', 'p') AND conrelid = 'engineer_form'::regclass;
        `);
        console.log('Constraints:', res.rows);

        console.log('\nChecking for duplicates in engineer_form (ipc, project_id)...');
        const dupRes = await pool.query(`
            SELECT ipc, COUNT(*) 
            FROM engineer_form 
            GROUP BY ipc 
            HAVING COUNT(*) > 1 
            LIMIT 5;
        `);
        console.log('Sample Duplicates:', dupRes.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

inspectTable();
