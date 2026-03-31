import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkMaxDummy() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query(`SELECT MAX("SchoolID") as max_id FROM "schools_IERN" WHERE "SchoolID" LIKE '999%'`);
    console.log("Max Dummy ID:", res.rows[0].max_id);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkMaxDummy();
