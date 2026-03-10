const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query(
      `SELECT school_id, unit1, unit2, unit1_completed, unit2_completed, unit_completion 
       FROM ph_schools 
       WHERE unit1_completed = true OR unit1 = 1
       LIMIT 5`
    );
    console.log('=== Schools with completed units ===');
    console.log(JSON.stringify(res.rows, null, 2));
    
    const colRes = await pool.query(
      `SELECT column_name, data_type, is_generated 
       FROM information_schema.columns 
       WHERE table_name = 'ph_schools' AND column_name IN ('unit1','unit2','unit_completion')
       ORDER BY column_name`
    );
    console.log('\n=== Column info ===');
    console.log(JSON.stringify(colRes.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
