const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

const SCHOOL_ID = process.argv[2] || '151006';
const DB_COLS = [1, 2, 3, 4, 5, 6, 7, 9]; // unit9 = display unit 8 (terrain/location)

async function resyncs(school_id) {
  const iernRes = await pool.query(
    'SELECT school_id, iern, unit_completion FROM ph_schools WHERE school_id = $1',
    [school_id]
  );
  if (!iernRes.rows.length) {
    console.log(`School ${school_id} not found`);
    return;
  }
  const { iern, unit_completion: old_pct } = iernRes.rows[0];
  console.log(`\nSchool ${school_id} | iern=${iern} | current unit_completion=${old_pct}%`);

  const r = await pool.query(
    `SELECT unit1,unit2,unit3,unit4,unit5,unit6,unit7,unit9,
            unit1_completed,unit2_completed,unit3_completed,unit4_completed,
            unit5_completed,unit6_completed,unit7_completed,unit9_completed
     FROM ph_schools WHERE iern=$1`,
    [iern]
  );
  const row = r.rows[0];

  let count = 0;
  const bools = [];
  for (const i of DB_COLS) {
    const intVal = parseInt(row[`unit${i}`] || 0) === 1;
    const boolVal = row[`unit${i}_completed`] === true;
    const done = intVal || boolVal;
    bools.push(done);
    if (done) count++;
    console.log(`  DB unit${i}: int=${row[`unit${i}`]}  completed=${row[`unit${i}_completed`]}  -> ${done}`);
  }

  const pct = parseFloat(((count / 8) * 100).toFixed(2));
  console.log(`\nResult: ${count}/8 units = ${pct}%`);

  const upd = await pool.query(
    `UPDATE ph_school_completion SET
       unit1_completion=$2, unit2_completion=$3, unit3_completion=$4, unit4_completion=$5,
       unit5_completion=$6, unit6_completion=$7, unit7_completion=$8, unit8_completion=$9,
       total_completion=$1, updated_at=NOW()
     WHERE iern=$10 RETURNING iern`,
    [pct, ...bools, iern]
  );
  console.log(`ph_school_completion: ${upd.rowCount} row(s) updated`);

  await pool.query('UPDATE ph_schools SET unit_completion=$1 WHERE iern=$2', [pct, iern]);
  console.log(`ph_schools.unit_completion -> ${pct}%`);

  const v = await pool.query(
    `SELECT ps.unit_completion,
            psc.unit1_completion, psc.unit2_completion, psc.unit3_completion, psc.unit4_completion,
            psc.unit5_completion, psc.unit6_completion, psc.unit7_completion, psc.unit8_completion,
            psc.total_completion
     FROM ph_schools ps
     LEFT JOIN ph_school_completion psc ON ps.iern = psc.iern
     WHERE ps.school_id = $1`,
    [school_id]
  );
  console.log('\n--- Verification ---');
  console.log(JSON.stringify(v.rows[0], null, 2));
}

async function main() {
  try {
    await resyncs(SCHOOL_ID);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}

main();
