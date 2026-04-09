const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // 1. Get school info
    const r = await pool.query(`
      SELECT school_id, iern, division, region, unit_completion,
        unit1,unit2,unit3,unit4,unit5,unit6,unit7,unit9,
        unit1_completed,unit2_completed,unit3_completed,unit4_completed,
        unit5_completed,unit6_completed,unit7_completed,unit9_completed,
        unit1_updated_at, unit2_updated_at, total_enrollment
      FROM ph_schools WHERE school_id = '151006'
    `);
    const row = r.rows[0];
    console.log('--- ph_schools row for 151006 ---');
    console.log('division:', row.division, '| region:', row.region);
    console.log('unit_completion:', row.unit_completion);
    console.log('unit ints:', [1,2,3,4,5,6,7,9].map(i => `u${i}=${row[`unit${i}`]}`).join(' '));
    console.log('unit_completed:', [1,2,3,4,5,6,7,9].map(i => `u${i}=${row[`unit${i}_completed`]} (type=${typeof row[`unit${i}_completed`]})`).join('\n              '));
    console.log('total_enrollment:', row.total_enrollment);

    // 2. Simulate the progress endpoint logic
    const completedUnits = [];
    let u1 = row.unit1_completed;
    console.log('\n--- Simulating progress logic ---');
    console.log('u1 raw:', u1, '| truthy:', !!u1);
    if (u1) { completedUnits.push(1); console.log('  -> unit1 COUNTED'); }
    else { console.log('  -> unit1 SKIPPED'); }

    let u2 = row.unit2_completed;
    if (!u2 && row.total_enrollment > 0) { u2 = true; }
    console.log('u2 raw:', row.unit2_completed, 'total_enrollment:', row.total_enrollment, '| final u2:', u2);
    if (u2) { completedUnits.push(2); console.log('  -> unit2 COUNTED'); }

    let u6 = row.unit6_completed;
    console.log('u6 raw:', u6, '| truthy:', !!u6);
    if (u6) { completedUnits.push(6); console.log('  -> unit6 COUNTED'); }
    else { console.log('  -> unit6 SKIPPED'); }

    console.log('\nFinal completedUnits:', completedUnits);

    // 3. Division avg_completion
    const divResult = await pool.query(`
      SELECT
        ROUND(AVG(COALESCE(unit_completion,0)),1) as avg_completion,
        COUNT(*) as total_schools,
        COUNT(CASE WHEN unit_completion >= 100 THEN 1 END) as completed_schools
      FROM ph_schools
      WHERE UPPER(TRIM(division)) = UPPER(TRIM($1))
    `, [row.division]);
    console.log('\n--- Division stats for:', row.division, '---');
    console.log(JSON.stringify(divResult.rows[0], null, 2));

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}
main();
