/**
 * verify_unit8_sync.js
 * Verifies the POST /api/school-location endpoint and schema alignment for Unit 8.
 *
 * Checks:
 *  - Column types in school_location_profiles (specifically JSONB for array fields)
 *  - Mock INSERT with transportation_modes + hazards_experienced as JSON arrays
 *  - Catches error code 22P02 (invalid input syntax for type array — TEXT[] conflict)
 *
 * Usage:
 *   node api/verify_unit8_sync.js
 *
 * Toggle DEBUG_MODE for verbose values array logging.
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const DEBUG_MODE = true;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function verify() {
  const client = await pool.connect();
  try {
    console.log('\n=== verify_unit8_sync: Unit 8 / school_location_profiles alignment check ===\n');

    // 1. Column type audit for the two JSONB-sensitive columns
    const KEY_COLS = [
      'transportation_modes', 'hazards_experienced',
      'water_proximity', 'natural_calamities', 'anthropogenic_threats'
    ];
    const typeRes = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'school_location_profiles'
         AND column_name = ANY($1::text[])
       ORDER BY column_name`,
      [KEY_COLS]
    );

    console.log('--- Column type audit ---');
    console.table(typeRes.rows);

    const badCols = typeRes.rows.filter(r => r.data_type !== 'jsonb' && r.data_type !== 'text');
    if (badCols.length > 0) {
      console.warn('[FLAG] The following columns are NOT jsonb/text — JSON.stringify inserts will fail:');
      console.table(badCols);
    } else {
      console.log('[OK] All audited columns are compatible types.\n');
    }

    // 2. Mock INSERT to test alignment (rolled back)
    const mockValues = [
      '__verify_school_id__',                        // $1  school_id
      null,                                          // $2  iern
      JSON.stringify(['Habal-habal', 'Jeepney']),    // $3  transportation_modes
      50,                                            // $4  road_paved_pct
      50,                                            // $5  road_unpaved_pct
      null,                                          // $6  road_lighting_pct
      null,                                          // $7  public_transpo_availability
      null,                                          // $8  water_proximity
      false,                                         // $9  near_cliff_ravine
      null,                                          // $10 road_cliff_pct
      false,                                         // $11 near_water
      null,                                          // $12 natural_calamities
      JSON.stringify(['Flooding', 'Landslide']),      // $13 hazards_experienced
      false,                                         // $14 has_insurgency_threats
      null,                                          // $15 insurgency_threats_6mo
      null,                                          // $16 road_passable_public_transpo_pct
      false,                                         // $17 river_crossing_on_foot
      null,                                          // $18 river_crossing_count
      null,                                          // $19 emergency_response_mins
      null,                                          // $20 proximity_hospital_km
      null,                                          // $21 proximity_brgy_hall_mins
      null,                                          // $22 proximity_brgy_hall_km
      null,                                          // $23 proximity_muni_hall_mins
      null,                                          // $24 proximity_muni_hall_km
      null,                                          // $25 proximity_sdo_mins
      null,                                          // $26 proximity_sdo_km
      null,                                          // $27 proximity_clinic_mins
      null,                                          // $28 proximity_clinic_km
      null,                                          // $29 proximity_terminal_mins
      null,                                          // $30 proximity_terminal_km
      null,                                          // $31 proximity_highway_mins
      null,                                          // $32 proximity_highway_km
      null,                                          // $33 cellular_coverage
      false,                                         // $34 weather_isolation
      JSON.stringify([]),                            // $35 anthropogenic_threats
      0                                              // $36 risk_index
    ];

    if (DEBUG_MODE) {
      console.log('--- Mock values array (pre-insert) ---');
      mockValues.forEach((v, i) => console.log(`  $${i + 1}: ${JSON.stringify(v)}`));
      console.log('');
    }

    console.log('--- Dry-run INSERT test (will ROLLBACK) ---');
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(`
        INSERT INTO school_location_profiles (
          school_id, iern, transportation_modes, road_paved_pct, road_unpaved_pct, road_lighting_pct,
          public_transpo_availability, water_proximity, near_cliff_ravine, road_cliff_pct,
          near_water, natural_calamities, hazards_experienced, has_insurgency_threats,
          insurgency_threats_6mo, road_passable_public_transpo_pct, river_crossing_on_foot,
          river_crossing_count, emergency_response_mins, proximity_hospital_km,
          proximity_brgy_hall_mins, proximity_brgy_hall_km, proximity_muni_hall_mins,
          proximity_muni_hall_km, proximity_sdo_mins, proximity_sdo_km,
          proximity_clinic_mins, proximity_clinic_km, proximity_terminal_mins,
          proximity_terminal_km, proximity_highway_mins, proximity_highway_km,
          cellular_coverage, weather_isolation, anthropogenic_threats, risk_index, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,CURRENT_TIMESTAMP
        )
        ON CONFLICT (school_id) DO UPDATE SET risk_index = EXCLUDED.risk_index
        RETURNING id, transportation_modes, hazards_experienced
      `, mockValues);

      const row = insertRes.rows[0];
      console.log(`[OK] INSERT succeeded (id=${row.id})`);
      console.log(`  transportation_modes returned: ${JSON.stringify(row.transportation_modes)}`);
      console.log(`  hazards_experienced returned : ${JSON.stringify(row.hazards_experienced)}`);

      await client.query('ROLLBACK');
      console.log('[OK] Rolled back. No data was persisted.\n');
      console.log('[RESULT] ✅ 22P02 error is NOT present. Schema alignment is correct.');
    } catch (insertErr) {
      await client.query('ROLLBACK').catch(() => {});
      if (insertErr.code === '22P02') {
        console.error('[RESULT] ❌ 22P02 error DETECTED — column type mismatch (TEXT[] receiving JSON string).');
        console.error('         Run: node api/migrate_slp_jsonb.cjs  to fix the column types.');
      } else {
        console.error(`[RESULT] ❌ INSERT failed with code ${insertErr.code}: ${insertErr.message}`);
      }
      if (DEBUG_MODE) console.error(insertErr);
    }

    console.log('\n[DONE] Verification complete.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

verify().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
