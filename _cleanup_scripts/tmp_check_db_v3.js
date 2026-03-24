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
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('engineer_form', 'hrodi_project')
      ORDER BY table_name, column_name;
    `);
    
    fs.writeFileSync('db_columns.json', JSON.stringify(res.rows, null, 2));
    console.log("Results written to db_columns.json");

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkCols();
