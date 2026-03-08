
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false // Disabled SSL
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running migration...');
        await client.query(`
      ALTER TABLE engineer_form 
      ADD COLUMN IF NOT EXISTS funding_year INTEGER,
      ADD COLUMN IF NOT EXISTS funding_year_justification TEXT;
    `);
        console.log('✅ Migration successful');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
