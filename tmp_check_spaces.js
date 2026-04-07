import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkSpaces() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "Province" != TRIM("Province")) as province_spaced,
        COUNT(*) FILTER (WHERE "Municipality" != TRIM("Municipality")) as municipality_spaced,
        COUNT(*) FILTER (WHERE "District" != TRIM("District")) as district_spaced,
        COUNT(*) FILTER (WHERE "Barangay" != TRIM("Barangay")) as barangay_spaced
      FROM "schools_IERN"
    `);
    console.table(res.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkSpaces();
