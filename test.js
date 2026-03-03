import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'school_profiles'
    `);
    fs.writeFileSync('schema_output.json', JSON.stringify(res.rows, null, 2));
    console.log("Schema written to schema_output.json");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkSchema();
