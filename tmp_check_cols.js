import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const tableName = process.argv[2] || 'schools_IERN';

async function checkColumns() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [tableName]);
    console.log(`COLUMNS for ${tableName}:`, res.rows.map(r => r.column_name).sort());
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
