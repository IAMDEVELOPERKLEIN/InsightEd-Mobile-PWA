import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkConstraints() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT
                conname AS constraint_name,
                contype AS constraint_type,
                pg_get_constraintdef(c.oid) AS constraint_definition
            FROM
                pg_constraint c
            JOIN
                pg_namespace n ON n.oid = c.connamespace
            WHERE
                conrelid = '"schools_IERN"'::regclass;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('❌ Error checking constraints:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}
checkConstraints();
