const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:7v52E69TYgTE@stride-posgre-prod-01.postgres.database.azure.com:5432/postgres?sslmode=require'
});

async function run() {
  console.log('🔍 Diagnostic: Checking Latest Photos in Database...');
  try {
    const res = await pool.query('SELECT id, project_id, file_path, category, created_at FROM engineer_image ORDER BY created_at DESC LIMIT 5');
    console.table(res.rows);
  } catch (err) {
    console.error('❌ DB Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
