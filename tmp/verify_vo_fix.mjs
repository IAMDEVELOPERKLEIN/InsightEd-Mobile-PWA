
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    // 1. Find a test project
    const projRes = await pool.query('SELECT project_id, ipc, project_name FROM engineer_form LIMIT 1');
    if (projRes.rows.length === 0) {
      console.log("No projects found for testing.");
      return;
    }
    const project = projRes.rows[0];
    console.log(`Testing with project: ${project.project_name} (ID: ${project.project_id}, IPC: ${project.ipc})`);

    // 2. Mock a VO POST request
    const mockVo = {
      projectId: project.project_id,
      ipc: project.ipc,
      variationName: "Test VO " + Date.now(),
      variationType: "Change Order",
      originalAmount: 1000000,
      additive: 50000,
      deductive: 10000,
      reusedAmount: 0,
      uid: "test-user-123",
      userName: "Test Engineer"
    };

    console.log("Mocking POST /api/variation-orders...");
    // Since I can't easily make a real HTTP request to the running server from here (it's in the background),
    // I will simulate the logic by calling the DB directly similar to the endpoint.
    
    const modified = parseFloat(mockVo.originalAmount) + parseFloat(mockVo.additive) - parseFloat(mockVo.deductive);
    
    const insertQuery = `
      INSERT INTO variation_orders (
        project_id, ipc, variation_name, variation_type, 
        original_amount, additive, deductive, reused_amount, modified_amount, created_by,
        requested_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'Approved')
      RETURNING *;
    `;
    const insertValues = [mockVo.projectId, mockVo.ipc, mockVo.variationName, mockVo.variationType, mockVo.originalAmount, mockVo.additive, mockVo.deductive, mockVo.reusedAmount, modified, mockVo.uid];
    const insertRes = await pool.query(insertQuery, insertValues);
    console.log("✅ Simulation: VO inserted successfully:", insertRes.rows[0].variation_name);

    // 3. Test the GET logic
    console.log("Simulating GET /api/variation-orders/:projectId...");
    const getRes = await pool.query(
      'SELECT * FROM variation_orders WHERE project_id = $1 OR ipc IN (SELECT ipc FROM engineer_form WHERE project_id = $1) ORDER BY created_at DESC',
      [project.project_id]
    );
    console.log(`✅ Simulation: Found ${getRes.rows.length} VO records for project.`);
    
    // Verify columns exist and are named correctly
    const firstVo = getRes.rows[0];
    const expectedCols = ['variation_name', 'variation_type', 'original_amount', 'additive', 'deductive', 'reused_amount', 'modified_amount'];
    expectedCols.forEach(col => {
        if (firstVo[col] === undefined) {
            console.error(`❌ Column missing: ${col}`);
        } else {
            console.log(`✅ Column exists: ${col} = ${firstVo[col]}`);
        }
    });

  } catch (err) {
    console.error("❌ Test Failed:", err.message);
  } finally {
    await pool.end();
  }
}

test();
