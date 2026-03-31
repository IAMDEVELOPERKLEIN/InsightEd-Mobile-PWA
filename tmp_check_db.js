import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkTables() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    console.log("--- schools_IERN ---");
    const res1 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'schools_IERN'");
    console.log(res1.rows.map(r => r.column_name).sort());

    console.log("\n--- all_locations ---");
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'all_locations'");
    console.log(res2.rows.map(r => r.column_name).sort());
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkTables();
