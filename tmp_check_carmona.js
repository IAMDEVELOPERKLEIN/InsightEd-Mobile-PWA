import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkCarmona() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    console.log("--- Schools where Municipality is Carmona ---");
    const res = await pool.query(`SELECT "SchoolID", "School_Name", "Division", "Municipality" FROM "schools_IERN" WHERE UPPER("Municipality") LIKE '%CARMONA%' LIMIT 10`);
    console.log(res.rows);

    console.log("\n--- Entries in all_locations for Carmona ---");
    const res2 = await pool.query(`SELECT * FROM all_locations WHERE UPPER(municipality) LIKE '%CARMONA%'`);
    console.log(res2.rows);

    console.log("\n--- Divisions in Region IV-A ---");
    const res3 = await pool.query(`SELECT DISTINCT "Division" FROM "schools_IERN" WHERE UPPER("Region") = 'REGION IV-A' ORDER BY "Division"`);
    console.log(res3.rows.map(r => r.Division));
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkCarmona();
