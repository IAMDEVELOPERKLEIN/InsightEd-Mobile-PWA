const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testQuery() {
    try {
        console.log("Testing Aggregate Query...");
        const aggregateQuery = `
      WITH ValidProjects AS (
          SELECT DISTINCT ON (COALESCE(ipc, project_id::text))
            project_id, implementing_agencies, tranche_1, status_of_construction_phase AS status
          FROM engineer_form
          WHERE mode_of_project = 'MOA'
            AND implementing_agencies IS NOT NULL
            AND tranche_1 IS NOT NULL
            AND moa IS NOT NULL
            AND rta IS NOT NULL
          ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      )
      SELECT 
        COUNT(DISTINCT implementing_agencies) as total_active_agencies,
        COUNT(*) as total_moa_projects,
        SUM(tranche_1) as total_tranche_1_value,
        COUNT(*) FILTER (WHERE status != 'Completed' AND status IS NOT NULL) as pending_moa_tasks
      FROM ValidProjects
    `;
        const aggResult = await pool.query(aggregateQuery);
        console.log("Aggregates success");

        console.log("\nTesting Table Query...");
        const tableQuery = `
      WITH LatestProjects AS (
          SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
            project_id, implementing_agencies, project_name, moa, rta, tranche_1, date_assigned, mode_of_project, status_of_construction_phase AS status
          FROM engineer_form
          ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      )
      SELECT * FROM LatestProjects
      WHERE mode_of_project = 'MOA'
        AND implementing_agencies IS NOT NULL
        AND tranche_1 IS NOT NULL
        AND moa IS NOT NULL
        AND rta IS NOT NULL
      ORDER BY project_id DESC
    `;
        const tableResult = await pool.query(tableQuery);
        console.log("Table query success");

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        pool.end();
    }
}

testQuery();
