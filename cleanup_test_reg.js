import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function cleanup() {
  const schoolId = '114231';
  try {
    const userRes = await pool.query("SELECT uid FROM users WHERE school_id = $1", [schoolId]);
    if (userRes.rows.length > 0) {
      const uid = userRes.rows[0].uid;
      await pool.query("DELETE FROM users WHERE uid = $1", [uid]);
      console.log(`Deleted user ${uid}`);
    }
    await pool.query("DELETE FROM ph_schools WHERE school_id = $1", [schoolId]);
    console.log(`Deleted school profile ${schoolId}`);
  } catch (err) {
    console.error("Cleanup error:", err);
  } finally {
    await pool.end();
  }
}

cleanup();
