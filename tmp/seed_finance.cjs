const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedMOA() {
    try {
        const res = await pool.query(`
      UPDATE engineer_form 
      SET mode_of_project = 'MOA' 
      WHERE project_id IN (
        SELECT project_id FROM engineer_form ORDER BY project_id DESC LIMIT 2
      )
      RETURNING project_id, mode_of_project;
    `);
        console.log(`Updated ${res.rowCount} projects to MOA mode:`, res.rows);
    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        pool.end();
    }
}

seedMOA();
