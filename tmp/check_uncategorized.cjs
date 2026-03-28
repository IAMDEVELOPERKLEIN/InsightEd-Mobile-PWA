const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUncategorized() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT COUNT(*) FROM engineer_form WHERE project_category_id = '10' OR project_category_id IS NULL");
    console.log(`Uncategorized count: ${res.rows[0].count}`);
  } catch (err) {
    console.error(err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
checkUncategorized();
