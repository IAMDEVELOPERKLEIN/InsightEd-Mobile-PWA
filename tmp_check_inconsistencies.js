import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkInconsistencies() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query(`
      WITH iern_muns AS (SELECT DISTINCT "Municipality" as mun FROM "schools_IERN"),
           ph_muns AS (SELECT DISTINCT municipality as mun FROM ph_barangays)
      SELECT 
        i.mun as iern_mun,
        p.mun as ph_mun
      FROM iern_muns i
      LEFT JOIN ph_muns p ON UPPER(TRIM(i.mun)) = UPPER(TRIM(p.mun))
      WHERE p.mun IS NULL
      LIMIT 20
    `);
    console.log("Municipalities in IERN but NOT in ph_barangays (Case-Insensitive):");
    console.table(res.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkInconsistencies();
