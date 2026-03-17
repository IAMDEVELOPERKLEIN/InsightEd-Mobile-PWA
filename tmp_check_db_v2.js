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
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('engineer_form', 'hrodi_project')
      ORDER BY table_name, column_name;
    `);
    
    let currentTable = "";
    res.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\nTable: ${currentTable}`);
      }
      console.log(`  - ${row.column_name}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkCols();
