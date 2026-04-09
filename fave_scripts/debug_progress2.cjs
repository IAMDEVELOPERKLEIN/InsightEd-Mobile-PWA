// Simulates exact progress endpoint query through pgBouncer (same as API)
const { Pool } = require('pg');
// Use pgBouncer (same as production API)
const p = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@127.0.0.1:6432/insight_pooled?prepare_threshold=0',
  ssl: false
});

async function main() {
  const schoolId = '151006';

  // Step 1: Get iern
  const sRes = await p.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
  const iernValue = sRes.rows[0]?.iern;
  console.log('iernValue:', iernValue);

  // Step 2: Main query (exactly as in progress endpoint)
  const querySelect = `SELECT
      unit1_completed, unit2_completed, unit3_completed, unit4_completed,
      unit5_completed, unit6_completed, unit7_completed, unit8_completed,
      unit9_completed, unit10_completed, curricular_offering,
      unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8, unit9, unit10,
      unit1_updated_at, unit2_updated_at, unit3_updated_at, unit4_updated_at,
      unit5_updated_at, unit6_updated_at, unit7_updated_at, unit8_updated_at,
      unit9_updated_at, unit10_updated_at,
      school_name, total_enrollment
     FROM ph_schools`;

  let result;
  if (iernValue) {
    result = await p.query(`${querySelect} WHERE iern = $1 OR school_id = $2`, [iernValue, schoolId]);
  } else {
    result = await p.query(`${querySelect} WHERE school_id = $1`, [schoolId]);
  }

  console.log('Rows returned:', result.rows.length);
  if (result.rows.length > 0) {
    const row = result.rows[0];
    console.log('unit1_completed:', row.unit1_completed, '(type:', typeof row.unit1_completed, ')');
    console.log('unit2_completed:', row.unit2_completed);
    console.log('unit6_completed:', row.unit6_completed);
    console.log('unit7_completed:', row.unit7_completed);
    console.log('unit9_completed:', row.unit9_completed, '<-- terrain (display unit 8)');
    console.log('unit8_completed:', row.unit8_completed, '<-- new column (should be false)');
    console.log('total_enrollment:', row.total_enrollment);
    console.log('unit2_updated_at:', row.unit2_updated_at);

    if (result.rows.length > 1) {
      console.log('\nWARNING: Multiple rows returned!');
      result.rows.forEach((r, i) => {
        console.log(`  Row ${i}: unit1_completed=${r.unit1_completed}, unit2_updated_at=${r.unit2_updated_at}`);
      });
    }
  } else {
    console.log('NO ROWS — this is why result.rows[0] is {}');
  }

  p.end();
}

main().catch(e => { console.error('ERROR:', e.message); p.end(); });
