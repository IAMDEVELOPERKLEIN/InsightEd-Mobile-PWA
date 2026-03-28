const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkBeffDups() {
  try {
    const res = await pool.query(`
      SELECT COUNT(*) as cluster_count, SUM(cnt - 1) as potential_dups FROM (
        SELECT school_id, LOWER(TRIM(project_name)) as norm_name, "funding year", COUNT(*) as cnt
        FROM import_beff_projects
        WHERE school_id IS NOT NULL AND school_id != ''
          AND project_name IS NOT NULL AND TRIM(project_name) != ''
        GROUP BY school_id, LOWER(TRIM(project_name)), "funding year"
        HAVING COUNT(*) > 1
      ) sub
    `);
    
    console.log("Duplicate clusters in import_beff_projects: " + res.rows[0].cluster_count);
    console.log("Total duplicate rows inside import_beff_projects: " + res.rows[0].potential_dups);

    const emptyRes = await pool.query(`
      SELECT COUNT(*) FROM import_beff_projects 
      WHERE (school_id IS NULL OR school_id = '') 
         OR (project_name IS NULL OR TRIM(project_name) = '')
    `);
    console.log("Rows missing school_id or project_name: " + emptyRes.rows[0].count);

  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

checkBeffDups();
