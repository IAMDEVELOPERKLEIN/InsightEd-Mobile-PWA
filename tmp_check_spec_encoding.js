import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkSpecificEncoding() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query("SELECT DISTINCT municipality FROM all_locations WHERE municipality ILIKE 'LOS BA%OS' OR municipality ILIKE '%??%'");
    console.log("Results from all_locations:");
    console.table(res.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkSpecificEncoding();
