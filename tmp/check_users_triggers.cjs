const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTriggers() {
  try {
    const res = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'users'
    `);
    console.log("Triggers on 'users' table:");
    res.rows.forEach(r => {
      console.log(`${r.trigger_name}: ${r.event_manipulation}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkTriggers();
