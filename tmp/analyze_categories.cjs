const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function analyzeCategories() {
  try {
    const res = await pool.query(`
      SELECT project_category, project_category_id, COUNT(*) 
      FROM engineer_form 
      GROUP BY project_category, project_category_id 
      ORDER BY count DESC
    `);
    
    console.log("Category Distribution in engineer_form:");
    res.rows.forEach(r => {
      console.log(`- ID: ${r.project_category_id || 'NULL'} | Category: "${r.project_category || 'NULL'}" | Count: ${r.count}`);
    });

  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

analyzeCategories();
