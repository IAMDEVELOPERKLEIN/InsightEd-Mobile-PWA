
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res1 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form'");
    console.log('Columns in engineer_form:', res1.rows.map(r => r.column_name).join(', '));
    
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'lgu_projects'");
    console.log('Columns in lgu_projects:', res2.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await pool.end();
  }
}

check();
