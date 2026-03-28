const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findTrigger() {
  try {
    const res = await pool.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%sync%' OR event_object_table = 'import_beff';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findTrigger();
