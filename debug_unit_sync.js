/**
 * debug_unit_sync.js
 * Diagnoses Unit 7 / Unit 8 completion state for a given school.
 *
 * Usage:
 *   node debug_unit_sync.js <schoolId>
 *
 * Toggle DEBUG_MODE for verbose transition logging.
 */

const { Pool } = require('pg');
require('dotenv').config();

const DEBUG_MODE = true;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function diagnose(schoolId) {
  const client = await pool.connect();
  try {
    if (DEBUG_MODE) console.log(`\n[DEBUG] Connecting to DB for schoolId: ${schoolId}`);

    // 1. Resolve IERN
    const sRes = await client.query(
      'SELECT iern, unit8_completed, unit8_updated_at FROM ph_schools WHERE school_id = $1',
      [schoolId]
    );
    if (sRes.rows.length === 0) {
      console.error(`No school found for school_id = ${schoolId}`);
      return;
    }
    const { iern, unit8_completed, unit8_updated_at } = sRes.rows[0];
    console.log(`\nSchool: school_id=${schoolId}  iern=${iern}`);

    // 2. ph_school_completion flags for Units 7 & 8
    const cRes = await client.query(
      'SELECT unit7_completion, unit8_completion, total_completion FROM ph_school_completion WHERE iern = $1',
      [iern]
    );
    if (cRes.rows.length === 0) {
      console.warn('  [WARN] No row in ph_school_completion for this IERN.');
    } else {
      const row = cRes.rows[0];
      console.log('\n--- ph_school_completion ---');
      console.log(`  unit7_completion : ${row.unit7_completion}`);
      console.log(`  unit8_completion : ${row.unit8_completion}`);
      console.log(`  total_completion : ${row.total_completion}%`);
    }

    // 3. ph_schools flags for Unit 8
    console.log('\n--- ph_schools (unit8) ---');
    console.log(`  unit8_completed  : ${unit8_completed}`);
    console.log(`  unit8_updated_at : ${unit8_updated_at}`);

    // 4. Check for the desync symptom: unit8_completed=true but updated_at is null
    if (unit8_completed === true && unit8_updated_at == null) {
      console.warn('\n  [FLAG] unit8_completed is TRUE but unit8_updated_at is NULL — possible ghost auto-complete.');
    }

    // 5. Unit 7 save timestamp vs Unit 8 updated_at
    const u7Res = await client.query(
      'SELECT updated_at FROM ph_school_completion WHERE iern = $1',
      [iern]
    );
    if (u7Res.rows.length > 0 && unit8_updated_at) {
      const compTs = new Date(u7Res.rows[0].updated_at);
      const u8Ts = new Date(unit8_updated_at);
      const diffMs = Math.abs(compTs - u8Ts);
      if (DEBUG_MODE) console.log(`\n[DEBUG] Completion row updated_at: ${compTs.toISOString()}`);
      if (DEBUG_MODE) console.log(`[DEBUG] unit8_updated_at         : ${u8Ts.toISOString()}`);
      if (diffMs < 5000) {
        console.warn('  [FLAG] unit8_updated_at is within 5s of the completion row timestamp — likely a sync side-effect, not an explicit save.');
      }
    }

    // 6. Inventory record count (should NOT drive completion by itself)
    const invRes = await client.query(
      'SELECT COUNT(*) FROM ph_buildings_inventory WHERE iern = $1 OR school_id = $2',
      [iern, schoolId]
    );
    const invCount = parseInt(invRes.rows[0].count, 10);
    console.log(`\n--- Inventory records : ${invCount} ---`);
    if (invCount > 0 && unit8_completed !== true) {
      console.log('  [OK] Records exist but unit8_completed is false — auto-complete decoupling is working correctly.');
    }

    console.log('\n[DONE] Diagnosis complete.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

const schoolId = process.argv[2];
if (!schoolId) {
  console.error('Usage: node debug_unit_sync.js <schoolId>');
  process.exit(1);
}

diagnose(schoolId).catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
