
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testEndpoint() {
  const projectId = 411;
  try {
    // Simulated logic of app.get('/api/project-images/:projectId')
    const query = `
      SELECT id, uploaded_by, created_at, category, ipc 
      FROM engineer_image 
      WHERE ipc = (
          SELECT ipc FROM engineer_form WHERE project_id = $1
      ) 
      OR project_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [projectId]);
    console.log(`Found ${result.rows.length} images for project ${projectId}`);
    if (result.rows.length > 0) {
      console.log('Sample image IPC:', result.rows[0].ipc);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

testEndpoint();
