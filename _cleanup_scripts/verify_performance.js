
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

// We need a full URL since we're running outside the browser context
const BASE_URL = 'http://localhost:5173'; // Adjust if needed, but we can also just call the pool directly to simulate

async function verify() {
  try {
    // Let's simulate the API call logic directly since the server might not be reachable or might require auth
    const pg = await import('pg');
    const pool = new pg.default.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log("Fetching Finance Dashboard Data (Optimized)...");
    const start = Date.now();
    
    // Exact same query as in index.js now
    const baseQuery = `
      SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
        project_id, project_name, school_name, school_id, region, division,
        status_of_construction_phase AS status,
        mode_of_project, tranche_1, tranche_2, tranche_3,
        ipc, date_assigned,
        (NULLIF(moa_pdf, '') IS NOT NULL) AS has_moa,
        (NULLIF(rta_pdf, '') IS NOT NULL) AS has_rta
      FROM engineer_form
      WHERE NULLIF(moa_pdf, '') IS NOT NULL
        AND NULLIF(rta_pdf, '') IS NOT NULL
      ORDER BY COALESCE(ipc, project_id::text), project_id DESC
    `;
    
    const result = await pool.query(baseQuery);
    const end = Date.now();
    
    const jsonStr = JSON.stringify(result.rows);
    const sizeKB = Buffer.byteLength(jsonStr) / 1024;
    
    console.log(`Rows fetched: ${result.rows.length}`);
    console.log(`Payload size: ${sizeKB.toFixed(2)} KB`);
    console.log(`Time taken: ${end - start}ms`);

    if (sizeKB < 100) {
      console.log("✅ SUCCESS: Payload is small and efficient!");
    } else {
      console.log("❌ WARNING: Payload is still significantly large.");
    }

    await pool.end();
  } catch (err) {
    console.error(err);
  }
}
verify();
