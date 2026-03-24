import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/postgres';
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkTypes() {
  try {
    const res1 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_mother_moa' AND column_name = 'mother_moa_id';
    `);
    console.log('engineer_mother_moa.mother_moa_id type:', res1.rows[0]?.data_type);

    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_supplamental_moa' AND column_name = 'mother_moa_id';
    `);
    console.log('engineer_supplamental_moa.mother_moa_id type:', res2.rows[0]?.data_type);

  } catch (err) {
    console.error("Check Error:", err.message);
  } finally {
    pool.end();
  }
}

checkTypes();
