const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});
async function check() {
  try {
    const res = await pool.query("SELECT * FROM information_schema.tables WHERE table_name = 'activity_logs'");
    console.log('Tables found:', res.rowCount);
    if (res.rowCount > 0) {
      const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'activity_logs'");
      console.log('Columns:', cols.rows);
    }
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    pool.end();
  }
}
check();
