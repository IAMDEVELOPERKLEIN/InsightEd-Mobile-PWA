import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function testTable() {
  try {
    const res = await pool.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
    console.log("Tables in DB:", res.rows.map(r => r.tablename));
    
    // Test specific table
    try {
        const iernRes = await pool.query('SELECT count(*) FROM "schools_IERN"');
        console.log("✅ schools_IERN exists, row count:", iernRes.rows[0].count);
    } catch (e) {
        console.error("❌ schools_IERN check failed:", e.message);
    }

  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await pool.end();
  }
}

testTable();
