import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env')) {
    const content = fs.readFileSync('.env', 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form'
        `);
        console.log("Columns in engineer_form:");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
