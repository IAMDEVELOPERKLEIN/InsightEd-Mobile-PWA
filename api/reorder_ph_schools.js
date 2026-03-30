/**
 * reorder_ph_schools.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot migration that physically reorders ph_schools columns
 * into the canonical Unit 1-9 logical order.
 *
 * SAFE: wrapped in a transaction — rolls back on any error.
 * Run: node api/reorder_ph_schools.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL COLUMN ORDER  (Unit 1 → 9, then monitoring)
// ─────────────────────────────────────────────────────────────────────────────
const ORDERED_COLUMNS = [
  // ── SYSTEM / IDENTITY ────────────────────────────────────────────────────
  'iern',
  'school_id',
  'created_at',
  'updated_at',
  'verified_as_of',

  // ── UNIT 1: School Identity ───────────────────────────────────────────────
  'school_name',
  'region',
  'province',
  'municipality',
  'barangay',
  'division',
  'district',
  'leg_district',
  'curricular_offering',
  'latitude',
  'longitude',
  'school_head',
  'contact_number',
  'ownership',
  'ownership_document_path',
  'ownership_document_type',
  'google_drive_link',
  'google_drive_file_id',
  'google_drive_file_name',
  'google_drive_thumbnail_url',
  'school_type',
  'mother_school_id',
  'extension_mother_school_name',
  'established_month',
  'established_year',
  'head_first_name',
  'head_middle_name',
  'head_last_name',
  'head_sex',
  'head_position_title',
  'head_date_of_birth',
  'head_date_hired',
  'unit1',
  'unit1_completed',
  'unit1_updated_at',

  // ── UNIT 2: Learners (Enrollment) ────────────────────────────────────────
  'enroll_kinder',
  'enroll_g1', 'enroll_g2', 'enroll_g3', 'enroll_g4', 'enroll_g5', 'enroll_g6',
  'enroll_g7', 'enroll_g8', 'enroll_g9', 'enroll_g10', 'enroll_g11', 'enroll_g12',
  'total_enrollment',
  'male_enrollment',
  'female_enrollment',
  'sned_self_contained_count',
  'unit2_simplified_enrollment',
  'multigrade_groupings_1',
  'multigrade_groupings_2',
  'multigrade_groupings_3',
  'multigrade_enrollment_1',
  'multigrade_enrollment_2',
  'multigrade_enrollment_3',
  'unit2',
  'unit2_completed',
  'unit2_updated_at',

  // ── UNIT 3: Organized Classes ─────────────────────────────────────────────
  'has_multigrade',
  'multigrade_sections_count',
  'unit3_simplified_counts',
  'grade_kinder_size',
  'grade_1_size', 'grade_2_size', 'grade_3_size', 'grade_4_size', 'grade_5_size', 'grade_6_size',
  'grade_7_size', 'grade_8_size', 'grade_9_size', 'grade_10_size', 'grade_11_size', 'grade_12_size',
  'multigrade_size_1',
  'multigrade_size_2',
  'multigrade_size_3',
  'unit3',
  'unit3_completed',
  'unit3_updated_at',

  // ── UNIT 4: Learner Profile ───────────────────────────────────────────────
  'selected_learner_groups',
  // BMI
  'bmi_severely_wasted', 'bmi_wasted', 'bmi_overweight_obese', 'bmi_normal',
  // ALS
  'als_kinder', 'als_g1', 'als_g2', 'als_g3', 'als_g4', 'als_g5', 'als_g6',
  'als_g7', 'als_g8', 'als_g9', 'als_g10', 'als_g11', 'als_g12', 'als_total',
  // Muslim
  'muslim_kinder', 'muslim_g1', 'muslim_g2', 'muslim_g3', 'muslim_g4', 'muslim_g5', 'muslim_g6',
  'muslim_g7', 'muslim_g8', 'muslim_g9', 'muslim_g10', 'muslim_g11', 'muslim_g12',
  // IP
  'ip_kinder', 'ip_g1', 'ip_g2', 'ip_g3', 'ip_g4', 'ip_g5', 'ip_g6',
  'ip_g7', 'ip_g8', 'ip_g9', 'ip_g10', 'ip_g11', 'ip_g12',
  // Displaced
  'displaced_kinder', 'displaced_g1', 'displaced_g2', 'displaced_g3', 'displaced_g4', 'displaced_g5', 'displaced_g6',
  'displaced_g7', 'displaced_g8', 'displaced_g9', 'displaced_g10', 'displaced_g11', 'displaced_g12',
  // Overage
  'overage_kinder', 'overage_g1', 'overage_g2', 'overage_g3', 'overage_g4', 'overage_g5', 'overage_g6',
  'overage_g7', 'overage_g8', 'overage_g9', 'overage_g10', 'overage_g11', 'overage_g12',
  // Dropout
  'dropout_kinder', 'dropout_g1', 'dropout_g2', 'dropout_g3', 'dropout_g4', 'dropout_g5', 'dropout_g6',
  'dropout_g7', 'dropout_g8', 'dropout_g9', 'dropout_g10', 'dropout_g11', 'dropout_g12',
  // Repeater
  'repeater_kinder', 'repeater_g1', 'repeater_g2', 'repeater_g3', 'repeater_g4', 'repeater_g5', 'repeater_g6',
  'repeater_g7', 'repeater_g8', 'repeater_g9', 'repeater_g10', 'repeater_g11', 'repeater_g12',
  // LWD
  'lwd_kinder', 'lwd_g1', 'lwd_g2', 'lwd_g3', 'lwd_g4', 'lwd_g5', 'lwd_g6',
  'lwd_g7', 'lwd_g8', 'lwd_g9', 'lwd_g10', 'lwd_g11', 'lwd_g12',
  // SNED
  'sned_kinder', 'sned_g1', 'sned_g2', 'sned_g3', 'sned_g4', 'sned_g5', 'sned_g6',
  'sned_g7', 'sned_g8', 'sned_g9', 'sned_g10', 'sned_g11', 'sned_g12',
  'unit4',
  'unit4_completed',
  'unit4_updated_at',

  // ── UNIT 5: Shifting & Modality ──────────────────────────────────────────
  'has_standard_shifting',
  'adm_mdl', 'adm_odl', 'adm_tvi', 'adm_blended',
  'shifting_modality',
  // Shift per level
  'shift_kinder', 'shift_g1', 'shift_g2', 'shift_g3', 'shift_g4', 'shift_g5', 'shift_g6',
  'shift_g7', 'shift_g8', 'shift_g9', 'shift_g10', 'shift_g11', 'shift_g12',
  'shift_mg_1', 'shift_mg_2', 'shift_mg_3',
  // Mode per level
  'mode_kinder', 'mode_g1', 'mode_g2', 'mode_g3', 'mode_g4', 'mode_g5', 'mode_g6',
  'mode_g7', 'mode_g8', 'mode_g9', 'mode_g10', 'mode_g11', 'mode_g12',
  'mode_mg_1', 'mode_mg_2', 'mode_mg_3',
  'unit5',
  'unit5_completed',
  'unit5_updated_at',

  // ── UNIT 6: Teaching Personnel (snapshot — roster lives in teachers_list) ─
  'total_teachers_registered',
  'total_teachers_kinder',
  'total_teachers_elementary',
  'total_teachers_jhs',
  'total_teachers_shs',
  'unit6',
  'unit6_completed',
  'unit6_updated_at',

  // ── UNIT 7: School Resources ──────────────────────────────────────────────
  'unit7_furniture',
  'unit7_ict',
  'unit7_has_ecart',
  'unit7_ecarts',
  'unit7_wash',
  'unit7_utilities',
  'u7_ict_smart_tv_cond',
  'u7_ict_projector_cond',
  'u7_ict_printer_cond',
  'u7_wash_male_seats_cond',
  'u7_wash_female_seats_cond',
  'u7_wash_common_seats_cond',
  'u7_wash_pwd_seats_cond',
  'u7_wash_faucets_cond',
  'u7_confirm_no_grid',
  'u7_confirm_no_piped',
  'u7_confirm_no_wired',
  'u7_utility_internet_type',
  'unit7',
  'unit7_completed',
  'unit7_updated_at',

  // ── UNIT 8: Physical Facilities (aggregate snapshots) ─────────────────────
  'bldg_count_good',
  'bldg_count_minor_repair',
  'bldg_count_major_repair',
  'it_laptop_total',
  'it_tablet_total',
  'it_pc_total',
  'it_printer_total',
  'it_ecart_total',
  'unit8',
  'unit8_completed',
  'unit8_updated_at',

  // ── UNIT 9: School Location / Terrain ────────────────────────────────────
  'hazard_risk_score',
  'unit9',
  'unit9_completed',
  'unit9_updated_at',

  // ── UNIT 10: Verification ─────────────────────────────────────────────────
  'unit10',
  'unit10_completed',
  'unit10_updated_at',

  // ── MONITORING / COMPLETION SNAPSHOT ─────────────────────────────────────
  'unit_completion',
  'forms_completed_count',
  'completion_percentage',
];

// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  const client = await pool.connect();
  try {
    console.log('🔍 Fetching current column definitions from information_schema…');

    // 1. Get every column in ph_schools with its full DDL info
    const colInfoRes = await client.query(`
      SELECT
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ph_schools'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    if (colInfoRes.rows.length === 0) {
      console.error('❌ Table ph_schools not found in this database.');
      return;
    }

    // Build a map: column_name → row
    const colMap = {};
    for (const row of colInfoRes.rows) {
      colMap[row.column_name] = row;
    }
    const allExistingCols = new Set(Object.keys(colMap));

    console.log(`📋 Found ${allExistingCols.size} columns in ph_schools`);

    // 2. Determine final column order:
    //    Known columns in desired order first, then any "orphan" columns not in our list
    const knownOrdered = ORDERED_COLUMNS.filter(c => allExistingCols.has(c));
    const orphans = [...allExistingCols].filter(c => !ORDERED_COLUMNS.includes(c));

    if (orphans.length > 0) {
      console.log(`⚠️  ${orphans.length} unknown column(s) found — appended after Unit 9:`);
      orphans.forEach(c => console.log(`   • ${c}`));
    }

    const finalOrder = [...knownOrdered, ...orphans];

    // Helper: build a DDL fragment from column info
    const buildColDef = (colName) => {
      const c = colMap[colName];
      if (!c) return null;

      let typeDef;
      if (c.udt_name === 'jsonb') {
        typeDef = 'JSONB';
      } else if (c.data_type === 'character varying') {
        typeDef = c.character_maximum_length
          ? `VARCHAR(${c.character_maximum_length})`
          : 'TEXT';
      } else if (c.data_type === 'character') {
        typeDef = `CHAR(${c.character_maximum_length || 1})`;
      } else if (c.data_type === 'numeric') {
        typeDef = (c.numeric_precision && c.numeric_scale != null)
          ? `NUMERIC(${c.numeric_precision},${c.numeric_scale})`
          : 'NUMERIC';
      } else if (c.data_type === 'integer') {
        typeDef = 'INTEGER';
      } else if (c.data_type === 'bigint') {
        typeDef = 'BIGINT';
      } else if (c.data_type === 'boolean') {
        typeDef = 'BOOLEAN';
      } else if (c.data_type === 'text') {
        typeDef = 'TEXT';
      } else if (c.data_type === 'timestamp without time zone') {
        typeDef = 'TIMESTAMP';
      } else if (c.data_type === 'timestamp with time zone') {
        typeDef = 'TIMESTAMPTZ';
      } else if (c.data_type === 'date') {
        typeDef = 'DATE';
      } else {
        typeDef = c.data_type.toUpperCase();
      }

      let def = `  "${colName}" ${typeDef}`;

      // Primary key columns get NOT NULL; everything else uses is_nullable
      if (colName === 'iern') {
        def += ' NOT NULL';
      } else if (c.is_nullable === 'NO') {
        def += ' NOT NULL';
      }

      if (c.column_default) {
        // Postgres sequences: skip them (PK SERIAL handles its own default)
        if (!c.column_default.includes('nextval')) {
          def += ` DEFAULT ${c.column_default}`;
        }
      }

      return def;
    };

    // 3. Build CREATE TABLE DDL
    const colDefs = finalOrder
      .map(c => buildColDef(c))
      .filter(Boolean);

    const createDDL = `
CREATE TABLE ph_schools_reordered (
${colDefs.join(',\n')},
  CONSTRAINT ph_schools_reordered_pkey PRIMARY KEY (iern)
)`;

    console.log('\n📐 Starting column reorder transaction…');
    await client.query('BEGIN');

    // 4. Drop FK constraints that reference ph_schools BEFORE we drop it
    console.log('🔗 Dropping dependent foreign key constraints…');
    const fkRes = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name AS fk_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.table_constraints tc2
        ON rc.unique_constraint_name = tc2.constraint_name
       AND tc2.table_name = 'ph_schools'
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `);

    const droppedFKs = [];
    for (const fk of fkRes.rows) {
      await client.query(`ALTER TABLE "${fk.fk_table}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`);
      droppedFKs.push(fk);
      console.log(`  ✂️  Dropped FK: ${fk.fk_table}.${fk.constraint_name}`);
    }

    // 5. Create the new table
    console.log('🏗️  Creating ph_schools_reordered…');
    await client.query(createDDL);

    // 6. Copy all data using explicit named column list
    const quotedCols = finalOrder.map(c => `"${c}"`).join(', ');
    console.log('📦 Copying data…');
    const copyRes = await client.query(`
      INSERT INTO ph_schools_reordered (${quotedCols})
      SELECT ${quotedCols}
      FROM ph_schools
    `);
    console.log(`  ✅ Copied ${copyRes.rowCount} rows`);

    // 7. Drop old table, rename new one
    console.log('🗑️  Dropping old ph_schools…');
    await client.query('DROP TABLE ph_schools');

    console.log('🔄 Renaming ph_schools_reordered → ph_schools…');
    await client.query('ALTER TABLE ph_schools_reordered RENAME TO ph_schools');

    // 8. Recreate essential indexes
    console.log('📇 Recreating indexes…');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ph_schools_school_id
      ON ph_schools(school_id)
      WHERE school_id IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ph_schools_division
      ON ph_schools(division)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ph_schools_region
      ON ph_schools(region)
    `);

    // 9. Restore FK constraints
    if (droppedFKs.length > 0) {
      console.log('🔗 Re-adding foreign key constraints…');
      for (const fk of droppedFKs) {
        // Fetch the specific FK details to rebuild it
        const detailRes = await client.query(`
          SELECT
            kcu.column_name AS fk_col,
            ccu.column_name AS ref_col
          FROM information_schema.key_column_usage kcu
          JOIN information_schema.referential_constraints rc
            ON kcu.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage ccu
            ON rc.unique_constraint_name = ccu.constraint_name
          WHERE kcu.constraint_name = $1
        `, [fk.constraint_name]);

        if (detailRes.rows.length > 0) {
          const { fk_col, ref_col } = detailRes.rows[0];
          await client.query(`
            ALTER TABLE "${fk.fk_table}"
            ADD CONSTRAINT "${fk.constraint_name}"
            FOREIGN KEY ("${fk_col}") REFERENCES ph_schools("${ref_col}") ON DELETE CASCADE
          `).catch(e => console.warn(`  ⚠️  Could not restore FK ${fk.constraint_name}: ${e.message}`));
          console.log(`  ✅ Restored FK: ${fk.fk_table}.${fk.constraint_name}`);
        }
      }
    }

    await client.query('COMMIT');

    // 10. Verify final result
    const verifyRes = await client.query(`
      SELECT column_name, ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'ph_schools' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('\n✅ Migration complete! New column order:\n');
    verifyRes.rows.forEach(r => {
      console.log(`  ${String(r.ordinal_position).padStart(3, ' ')}. ${r.column_name}`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration FAILED — rolled back.\n', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
