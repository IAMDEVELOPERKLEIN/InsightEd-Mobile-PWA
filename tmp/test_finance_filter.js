
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runTest() {
    try {
        console.log("🚀 Starting Finance Dashboard Filtering Test (Using Existing Project)...");

        // 1. Find an existing project to "borrow" for testing
        const findRes = await pool.query("SELECT project_id, moa_pdf, rta_pdf FROM engineer_form LIMIT 1");
        if (findRes.rows.length === 0) throw new Error("No projects found in database to test with.");
        
        const testProject = findRes.rows[0];
        const projectId = testProject.project_id;
        const originalMoa = testProject.moa_pdf;
        const originalRta = testProject.rta_pdf;

        console.log(`✅ Using existing project ID: ${projectId} for testing.`);

        // Define a function to check if project is in finance dashboard
        const checkFinanceAPI = async () => {
             const aggregateQuery = `
                SELECT COUNT(*) as total_projects FROM engineer_form
                WHERE moa_pdf IS NOT NULL AND moa_pdf <> ''
                AND rta_pdf IS NOT NULL AND rta_pdf <> ''
                AND project_id = $1
             `;
             const tableQuery = `
                WITH LatestProjects AS (
                    SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
                        project_id, moa_pdf, rta_pdf
                    FROM engineer_form
                    ORDER BY COALESCE(ipc, project_id::text), project_id DESC
                )
                SELECT * FROM LatestProjects
                WHERE (moa_pdf IS NOT NULL AND moa_pdf <> '' AND rta_pdf IS NOT NULL AND rta_pdf <> '')
                AND project_id = $1
             `;
             const aggRes = await pool.query(aggregateQuery, [projectId]);
             const tableRes = await pool.query(tableQuery, [projectId]);
             return {
                 inAgg: parseInt(aggRes.rows[0].total_projects) > 0,
                 inTable: tableRes.rows.length > 0
             };
        };

        // Test 1: No docs (Nullify them temporarily)
        await pool.query("UPDATE engineer_form SET moa_pdf = NULL, rta_pdf = NULL WHERE project_id = $1", [projectId]);
        let status = await checkFinanceAPI();
        console.log(`Test 1 (No docs): inAgg=${status.inAgg}, inTable=${status.inTable}`);
        if (status.inAgg || status.inTable) throw new Error("Failed Test 1");

        // Test 2: MOA only
        await pool.query("UPDATE engineer_form SET moa_pdf = 'test_moa_data', rta_pdf = NULL WHERE project_id = $1", [projectId]);
        status = await checkFinanceAPI();
        console.log(`Test 2 (MOA only): inAgg=${status.inAgg}, inTable=${status.inTable}`);
        if (status.inAgg || status.inTable) throw new Error("Failed Test 2");

        // Test 3: RTA only
        await pool.query("UPDATE engineer_form SET moa_pdf = NULL, rta_pdf = 'test_rta_data' WHERE project_id = $1", [projectId]);
        status = await checkFinanceAPI();
        console.log(`Test 3 (RTA only): inAgg=${status.inAgg}, inTable=${status.inTable}`);
        if (status.inAgg || status.inTable) throw new Error("Failed Test 3");

        // Test 4: Both
        await pool.query("UPDATE engineer_form SET moa_pdf = 'test_moa_data', rta_pdf = 'test_rta_data' WHERE project_id = $1", [projectId]);
        status = await checkFinanceAPI();
        console.log(`Test 4 (Both): inAgg=${status.inAgg}, inTable=${status.inTable}`);
        if (!status.inAgg || !status.inTable) throw new Error("Failed Test 4");

        console.log("🎉 All tests passed!");

        // Restore original state
        await pool.query("UPDATE engineer_form SET moa_pdf = $1, rta_pdf = $2 WHERE project_id = $3", [originalMoa, originalRta, projectId]);
        console.log("🧹 Restoration complete.");

    } catch (err) {
        console.error("❌ Test failed:", err.message);
    } finally {
        await pool.end();
    }
}

runTest();
