// Check full state of school 151006 in local DB (insight_pooled)
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@127.0.0.1:6432/insight_pooled?prepare_threshold=0',
  ssl: false
});

async function main() {
  const schoolId = '151006';

  // Full ph_schools row
  const r = await pool.query('SELECT * FROM ph_schools WHERE school_id=$1', [schoolId]);
  const row = r.rows[0];
  if (!row) { console.log('NOT FOUND'); pool.end(); return; }

  console.log('=== ph_schools ===');
  console.log('school_id:', row.school_id);
  console.log('iern:', row.iern);
  console.log('unit_completion:', row.unit_completion);
  console.log('total_enrollment:', row.total_enrollment);
  const unitCols = [1,2,3,4,5,6,7,9];
  for (const i of unitCols) {
    console.log(`unit${i}: int=${row[`unit${i}`]}  completed=${row[`unit${i}_completed`]}  updated_at=${row[`unit${i}_updated_at`]}`);
  }
  console.log('\nschool_name:', row.school_name);
  console.log('division:', row.division);
  console.log('region:', row.region);

  // Check ph_school_completion
  const c = await pool.query('SELECT * FROM ph_school_completion WHERE iern=$1', [row.iern]);
  if (c.rows.length) {
    console.log('\n=== ph_school_completion ===');
    console.log(JSON.stringify(c.rows[0], null, 2));
  } else {
    console.log('\nNo ph_school_completion row');
  }

  // Check school_location_profiles
  const loc = await pool.query('SELECT COUNT(*) as cnt FROM school_location_profiles WHERE school_id=$1', [schoolId]);
  console.log('\nschool_location_profiles count:', loc.rows[0].cnt);

  pool.end();
}

main().catch(e => { console.error(e.message); pool.end(); });
