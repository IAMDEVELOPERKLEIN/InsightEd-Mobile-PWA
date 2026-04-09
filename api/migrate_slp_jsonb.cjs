/**
 * migrate_slp_jsonb.cjs
 * One-shot migration: converts transportation_modes and hazards_experienced
 * in school_location_profiles from TEXT[] → JSONB, preserving all existing data.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node api/migrate_slp_jsonb.cjs
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const COLUMNS_TO_MIGRATE = [
  'transportation_modes', 
  'hazards_experienced', 
  'water_proximity', 
  'natural_calamities', 
  'anthropogenic_threats'
];

async function getColumnType(client, columnName) {
  const res = await client.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = 'school_location_profiles' AND column_name = $1`,
    [columnName]
  );
  return res.rows[0]?.data_type || null;
}

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('\n=== migrate_slp_jsonb: school_location_profiles TEXT[] → JSONB ===\n');

    // Pre-flight: row count
    const cntRes = await client.query('SELECT COUNT(*) FROM school_location_profiles');
    const rowCount = parseInt(cntRes.rows[0].count, 10);
    console.log(`[INFO] Total rows to migrate: ${rowCount}`);

    for (const col of COLUMNS_TO_MIGRATE) {
      const currentType = await getColumnType(client, col);

      if (!currentType) {
        console.log(`[SKIP] Column "${col}" does not exist — will be created as JSONB by runAutoMigrations.`);
        continue;
      }

      if (currentType === 'jsonb') {
        console.log(`[OK]   Column "${col}" is already JSONB — no migration needed.`);
        continue;
      }

      console.log(`[MIGRATING] "${col}" (${currentType} → jsonb)...`);

      // Sample before
      const sampleBefore = await client.query(
        `SELECT school_id, ${col} FROM school_location_profiles WHERE ${col} IS NOT NULL LIMIT 3`
      );
      console.log(`  Sample BEFORE (${col}):`);
      sampleBefore.rows.forEach(r => console.log(`    school_id=${r.school_id}  value=${JSON.stringify(r[col])}`));

      // Perform the conversion
      await client.query(
        `ALTER TABLE school_location_profiles ALTER COLUMN ${col} TYPE JSONB USING to_jsonb(${col})`
      );

      // Verify after
      const typeAfter = await getColumnType(client, col);
      const sampleAfter = await client.query(
        `SELECT school_id, ${col} FROM school_location_profiles WHERE ${col} IS NOT NULL LIMIT 3`
      );
      console.log(`  Type after: ${typeAfter}`);
      console.log(`  Sample AFTER (${col}):`);
      sampleAfter.rows.forEach(r => console.log(`    school_id=${r.school_id}  value=${JSON.stringify(r[col])}`));

      if (typeAfter === 'jsonb') {
        console.log(`[OK]   "${col}" successfully converted to JSONB.\n`);
      } else {
        console.error(`[ERROR] "${col}" type is still "${typeAfter}" after migration!\n`);
        process.exitCode = 1;
      }
    }

    // Final schema report
    const schemaRes = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'school_location_profiles'
         AND column_name IN (${COLUMNS_TO_MIGRATE.map((_, i) => `$${i + 1}`).join(',')})`,
      COLUMNS_TO_MIGRATE
    );
    console.log('\n--- Final column types ---');
    console.table(schemaRes.rows);

    console.log('[DONE] Migration complete.\n');
  } catch (err) {
    console.error('[FATAL] Migration failed:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
