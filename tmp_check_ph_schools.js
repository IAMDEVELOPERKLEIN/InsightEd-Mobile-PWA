import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkPhSchools() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    console.log("--- Schools in ph_schools where Municipality is Carmona ---");
    const res = await pool.query(`SELECT school_id, iern, school_name, division, municipality FROM ph_schools WHERE UPPER(municipality) LIKE '%CARMONA%' LIMIT 10`);
    console.log(res.rows);

    console.log("\n--- Checking column list for ph_schools ---");
    const res2 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'ph_schools'`);
    console.log(res2.rows.map(r => r.column_name).sort());
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkPhSchools();
