import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCols() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form'
      ORDER BY column_name;
    `);
    console.log("Columns in engineer_form:");
    res.rows.forEach(row => console.log(`- ${row.column_name}`));
    
    // Also check hrodi_project
    const resHrodi = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hrodi_project'
      ORDER BY column_name;
    `);
    console.log("\nColumns in hrodi_project:");
    resHrodi.rows.forEach(row => console.log(`- ${row.column_name}`));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkCols();
