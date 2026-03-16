const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkUnitCompletion() {
  try {
    const res = await pool.query(`
      SELECT school_id, school_name, unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8, unit_completion
      FROM ph_schools
      WHERE unit_completion > 100
      LIMIT 10;
    `);
    
    console.log('Schools with unit_completion > 100%:');
    console.table(res.rows);

    const counts = await pool.query(`
      SELECT 
        COUNT(*) as total_over_100,
        COUNT(CASE WHEN unit1 > 1 THEN 1 END) as unit1_gt_1,
        COUNT(CASE WHEN unit2 > 1 THEN 1 END) as unit2_gt_1,
        COUNT(CASE WHEN unit3 > 1 THEN 1 END) as unit3_gt_1,
        COUNT(CASE WHEN unit4 > 1 THEN 1 END) as unit4_gt_1,
        COUNT(CASE WHEN unit5 > 1 THEN 1 END) as unit5_gt_1,
        COUNT(CASE WHEN unit6 > 1 THEN 1 END) as unit6_gt_1,
        COUNT(CASE WHEN unit7 > 1 THEN 1 END) as unit7_gt_1,
        COUNT(CASE WHEN unit8 > 1 THEN 1 END) as unit8_gt_1
      FROM ph_schools
      WHERE unit_completion > 100;
    `);
    console.log('Counts of units > 1 for overflowed schools:');
    console.table(counts.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkUnitCompletion();
