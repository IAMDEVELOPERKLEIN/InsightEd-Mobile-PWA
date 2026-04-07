import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkPhBarangayEncoding() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query(`
      SELECT DISTINCT municipality 
      FROM ph_barangays 
      WHERE municipality LIKE '%??%' OR municipality LIKE '%ñ%' OR municipality LIKE '%Ñ%'
      LIMIT 10
    `);
    console.log("Municipalities in ph_barangays with special chars or ??:");
    console.table(res.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkPhBarangayEncoding();
