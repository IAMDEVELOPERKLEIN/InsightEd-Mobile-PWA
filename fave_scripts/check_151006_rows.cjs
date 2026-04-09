const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const r = await pool.query(`
      SELECT school_id, iern, unit_completion,
        unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit9,
        unit1_completed, unit2_completed, unit3_completed, unit4_completed,
        unit5_completed, unit6_completed, unit7_completed, unit9_completed
      FROM ph_schools
      WHERE iern = '2026-08722' OR school_id = '151006'
      ORDER BY iern
    `);
    console.log('Rows returned:', r.rows.length);
    r.rows.forEach((row, i) => {
      console.log(`\nRow ${i}:`);
      console.log('  school_id:', row.school_id, '| iern:', row.iern, '| unit_completion:', row.unit_completion);
      console.log('  unit ints:     ', [1,2,3,4,5,6,7,9].map(i => `u${i}=${row[`unit${i}`]}`).join(' '));
      console.log('  unit_completed:', [1,2,3,4,5,6,7,9].map(i => `u${i}=${row[`unit${i}_completed`]}`).join(' '));
    });
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}
main();
