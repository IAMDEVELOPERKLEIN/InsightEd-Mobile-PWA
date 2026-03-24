
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    const schoolId = '302260';
    const res = await pool.query('UPDATE ESF7_Database SET status = $1 WHERE school_id = $2', ['PENDING_SDO', schoolId]);
    console.log('Update Result:', res.rowCount, 'rows updated.');
  } catch (err) {
    console.error('Error during fix:', err);
  } finally {
    await pool.end();
  }
}

fix();
