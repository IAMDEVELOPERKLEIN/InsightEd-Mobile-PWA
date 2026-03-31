import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkSDO() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    console.log("--- SDO or Placeholder entries in schools_IERN ---");
    const res = await pool.query(`SELECT * FROM "schools_IERN" WHERE "School_Name" LIKE '%SDO%' OR "School_Name" LIKE '%Placeholder%' LIMIT 10`);
    console.log(res.rows);

    console.log("\n--- Checking for existing dummy IDs ---");
    const res2 = await pool.query(`SELECT * FROM "schools_IERN" WHERE "SchoolID" LIKE '999%' LIMIT 10`);
    console.log(res2.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkSDO();
