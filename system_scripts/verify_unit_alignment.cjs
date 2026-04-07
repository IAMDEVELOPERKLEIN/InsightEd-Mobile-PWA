/**
 * verify_unit_alignment.cjs
 * Diagnostic script: checks that unitX_completed flags align with unitX_updated_at timestamps.
 * Set FIX_MODE = true to backfill missing timestamps from the row's updated_at column.
 *
 * Usage:
 *   node system_scripts/verify_unit_alignment.cjs [school_id_or_iern]
 */

require('dotenv').config();
const { Pool } = require('pg');

const FIX_MODE = false; // Set to true to backfill missing unit timestamps

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const UNIT_COUNT = 10;

async function run() {
  const identifier = process.argv[2];
  let rows;

  try {
    if (identifier) {
      const isNumeric = /^\d+$/.test(identifier);
      const col = isNumeric ? 'school_id' : 'iern';
      const res = await pool.query(`SELECT * FROM ph_schools WHERE ${col} = $1`, [identifier]);
      rows = res.rows;
    } else {
      const res = await pool.query('SELECT * FROM ph_schools LIMIT 100');
      rows = res.rows;
    }

    if (rows.length === 0) {
      console.log('No schools found for the given identifier.');
      return;
    }

    let totalMismatches = 0;
    const fixes = [];

    for (const row of rows) {
      const label = `[${row.school_id} / IERN:${row.iern || 'N/A'}]`;
      for (let i = 1; i <= UNIT_COUNT; i++) {
        const completedFlag = row[`unit${i}_completed`];
        const timestamp = row[`unit${i}_updated_at`];

        if (completedFlag === true && !timestamp) {
          console.warn(`MISMATCH ${label} — Unit ${i}: completed=true but unit${i}_updated_at is NULL`);
          totalMismatches++;
          if (FIX_MODE && row.updated_at) {
            fixes.push({ school_id: row.school_id, unit: i, fallback_ts: row.updated_at });
          }
        } else if (!completedFlag && timestamp) {
          console.log(`INFO    ${label} — Unit ${i}: completed=false but unit${i}_updated_at is set (${timestamp}) — possibly partially saved`);
        } else {
          console.log(`OK      ${label} — Unit ${i}: completed=${completedFlag ?? 'null'}, timestamp=${timestamp ?? 'null'}`);
        }
      }
    }

    console.log(`\n--- Summary: ${totalMismatches} mismatch(es) across ${rows.length} school(s) ---`);

    if (FIX_MODE && fixes.length > 0) {
      console.log(`\nFIX_MODE enabled — backfilling ${fixes.length} missing timestamp(s)...`);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const { school_id, unit, fallback_ts } of fixes) {
          await client.query(
            `UPDATE ph_schools SET unit${unit}_updated_at = $1 WHERE school_id = $2`,
            [fallback_ts, school_id]
          );
          console.log(`  Backfilled unit${unit}_updated_at for school_id=${school_id} with ${fallback_ts}`);
        }
        await client.query('COMMIT');
        console.log('Backfill committed.');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Backfill failed, rolled back:', err.message);
      } finally {
        client.release();
      }
    } else if (FIX_MODE) {
      console.log('FIX_MODE enabled but no fixable mismatches found (or row has no updated_at fallback).');
    }
  } finally {
    await pool.end();
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
