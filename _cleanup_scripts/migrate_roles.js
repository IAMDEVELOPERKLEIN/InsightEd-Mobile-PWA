import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_Y1gUeD7KEnjR@ep-floral-smoke-a1hptx9s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
});

async function runUpdate() {
  try {
    const res = await pool.query("UPDATE users SET role = 'School Head' WHERE role = 'Beta Tester' OR role = 'beta tester'");
    console.log(`✅ Database updated. Rows affected: ${res.rowCount}`);
  } catch (err) {
    console.error("DB Update Error:", err.message);
  } finally {
    await pool.end();
  }
}

runUpdate();
