const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function checkLocks() {
  try {
    const res = await pool.query(`
      SELECT
        pid,
        now() - query_start AS duration,
        query,
        state,
        wait_event_type,
        wait_event
      FROM pg_stat_activity
      WHERE state != 'idle' OR wait_event IS NOT NULL
      ORDER BY duration DESC;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkLocks();
