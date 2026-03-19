const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkIERN() {
  try {
    const res = await pool.query(`
      SELECT DISTINCT "Curricular_Offering" 
      FROM "schools_IERN" 
      WHERE "Curricular_Offering" ILIKE '%Elementary%'
      LIMIT 10
    `);
    console.log("✅ Curricular Offerings in schools_IERN:", res.rows.map(r => r.Curricular_Offering));
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkIERN();
