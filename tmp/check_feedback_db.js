
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTable() {
    try {
        const res = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'system_feedback'
            );
        `);
        console.log("Table 'system_feedback' exists:", res.rows[0].exists);
        
        if (res.rows[0].exists) {
            const columns = await pool.query(`
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'system_feedback';
            `);
            console.log("Columns:", columns.rows);
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
    }
}

checkTable();
