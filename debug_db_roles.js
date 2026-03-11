const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_Y1gUeD7KEnjR@ep-floral-smoke-a1hptx9s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
});

async function checkRoles() {
  try {
    const res = await pool.query("SELECT role, COUNT(*) FROM users GROUP BY role");
    console.log("Current Roles in DB:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkRoles();
