import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCols() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'school_profiles'
      ORDER BY column_name;
    `);
    
    fs.writeFileSync('school_profiles_columns.json', JSON.stringify(res.rows, null, 2));
    console.log("Results written to school_profiles_columns.json");

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkCols();
