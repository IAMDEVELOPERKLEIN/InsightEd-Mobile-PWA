
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabaseStats() {
  try {
    const tables = ['engineer_form', 'school_profiles', 'users', 'lgu_projects', 'variation_orders'];
    for (const table of tables) {
      const res = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`Table ${table}: ${res.rows[0].count} rows`);
    }

    const resLarge = await pool.query(`
      SELECT 'engineer_form' as tbl, project_id, LENGTH(other_remarks::text) as len 
      FROM engineer_form ORDER BY len DESC LIMIT 3;
    `);
    console.log("Largest remarks in engineer_form:");
    console.log(JSON.stringify(resLarge.rows, null, 2));

  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

checkDatabaseStats();
