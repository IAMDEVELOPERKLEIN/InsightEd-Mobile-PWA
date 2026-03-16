const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insighted' });

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools' 
      AND (
        column_name LIKE 'enroll_%' OR 
        column_name LIKE 'stat_%' OR 
        column_name LIKE 'aral_%' OR 
        column_name LIKE 'shift_%' OR 
        column_name LIKE 'mode_%' OR 
        column_name LIKE 'cnt_%' OR
        column_name LIKE 'total_%' OR
        column_name IN ('division', 'district', 'region')
      )
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
