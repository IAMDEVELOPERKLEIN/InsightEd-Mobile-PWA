import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function debugProject() {
  try {
    console.log("Checking project 419 and 436...");
    const res = await pool.query(`
      SELECT * FROM engineer_form 
      WHERE project_id IN (419, 436)
      ORDER BY project_id ASC
    `);
    
    res.rows.forEach(row => {
      console.log(`--- Project ID: ${row.project_id} ---`);
      console.log(`Name: ${row.project_name}`);
      console.log(`MOA PDF: ${row.moa_pdf}`);
      console.log(`RTA PDF: ${row.rta_pdf}`);
      console.log(`MOA: ${row.moa}`);
      console.log(`RTA: ${row.rta}`);
      console.log(`IPC: ${row.ipc}`);
    });

    if (res.rows.length > 0) {
       console.log("Column keys in row 0:", Object.keys(res.rows[0]));
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

debugProject();
