
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUpdates() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
      SELECT count(*) as recent_updates 
      FROM school_summary 
      WHERE last_updated > NOW() - INTERVAL '5 minutes'
    `);
        console.log(`Schools updated in last 5 minutes: ${res.rows[0].recent_updates}`);

        const sample = await client.query(`
        SELECT school_name, last_updated, data_health_description 
        FROM school_summary 
        ORDER BY last_updated DESC LIMIT 5
    `);
        console.log("Most recent updates:", sample.rows);

        client.release();
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

checkUpdates();
