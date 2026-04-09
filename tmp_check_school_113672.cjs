
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchool(schoolId) {
  try {
    const schoolRes = await pool.query('SELECT * FROM ph_schools WHERE school_id = $1 OR iern = $1', [schoolId]);
    console.log('--- ph_schools (Raw) ---');
    const row = schoolRes.rows[0];
    if (row) {
      const displayData = {
        iern: row.iern,
        unit1: row.unit1, unit1_completed: row.unit1_completed,
        unit2: row.unit2, unit2_completed: row.unit2_completed,
        unit3: row.unit3, unit3_completed: row.unit3_completed,
        unit4: row.unit4, unit4_completed: row.unit4_completed,
        unit5: row.unit5, unit5_completed: row.unit5_completed,
        unit6: row.unit6, unit6_completed: row.unit6_completed,
        unit7: row.unit7, unit7_completed: row.unit7_completed,
        unit9: row.unit9, unit9_completed: row.unit9_completed,
        unit_completion: row.unit_completion
      };
      console.table([displayData]);
    }

    if (row) {
      const iern = row.iern;
      const completionRes = await pool.query('SELECT * FROM ph_school_completion WHERE iern = $1', [iern]);
      console.log('--- ph_school_completion ---');
      console.table(completionRes.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchool('113672');
