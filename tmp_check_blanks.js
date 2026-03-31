import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkBlanks() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    console.log("--- Blank entries in schools_IERN ---");
    const res = await pool.query(`SELECT * FROM "schools_IERN" WHERE "Division" = 'Blank' OR "Region" = 'Blank'`);
    console.log(res.rows);

    console.log("\n--- Blank entries in all_locations ---");
    const res2 = await pool.query(`SELECT * FROM all_locations WHERE division = 'Blank' OR region = 'Blank'`);
    console.log(res2.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkBlanks();
