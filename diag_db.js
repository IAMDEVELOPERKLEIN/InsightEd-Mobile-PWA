import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diagnose() {
  try {
    console.log("--- Row Counts ---");
    const countRes = await pool.query("SELECT COUNT(*) FROM engineer_form");
    console.log("Total rows in engineer_form:", countRes.rows[0].count);

    const distinctIpcRes = await pool.query("SELECT COUNT(DISTINCT ipc) FROM engineer_form");
    console.log("Distinct IPCs in engineer_form:", distinctIpcRes.rows[0].count);

    console.log("\n--- Index Check ---");
    const indexRes = await pool.query(`
        SELECT
            t.relname as table_name,
            i.relname as index_name,
            a.attname as column_name
        FROM
            pg_class t,
            pg_class i,
            pg_index x,
            pg_attribute a
        WHERE
            t.oid = x.indrelid
            AND i.oid = x.indexrelid
            AND a.attrelid = t.oid
            AND a.attnum = ANY(x.indkey)
            AND t.relname = 'engineer_form'
        ORDER BY
            t.relname,
            i.relname;
    `);
    console.table(indexRes.rows);

    console.log("\n--- Sample Query Timing (Full Projects) ---");
    const start = Date.now();
    const projectsRes = await pool.query(`
      WITH LatestProjects AS (
          SELECT DISTINCT ON (ipc) *
          FROM engineer_form
          ORDER BY ipc, project_id DESC
      )
      SELECT * FROM LatestProjects LIMIT 10;
    `);
    const end = Date.now();
    console.log(`Query took ${end - start}ms for 10 rows.`);

    console.log("\n--- EXPLAIN ANALYZE (Potential Bottleneck) ---");
    const explainRes = await pool.query(`
      EXPLAIN ANALYZE
      WITH LatestProjects AS (
          SELECT DISTINCT ON (ipc) *
          FROM engineer_form
          ORDER BY ipc, project_id DESC
      )
      SELECT * FROM LatestProjects;
    `);
    console.log(explainRes.rows.map(r => r['QUERY PLAN']).join('\n'));

  } catch (err) {
    console.error("Diagnosis Error:", err);
  } finally {
    await pool.end();
  }
}

diagnose();
