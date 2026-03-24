const { Pool } = require('pg');

const dbUrl = 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await pool.query(`ALTER TABLE ESF7_Database ADD COLUMN IF NOT EXISTS iern TEXT`);
    console.log('✅ Added iern column to ESF7_Database');
  } catch (err) {
    console.error('Migration Error:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();
