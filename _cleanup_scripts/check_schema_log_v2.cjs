const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  let log = `--- SCHEMA VERIFICATION LOG (${new Date().toISOString()}) ---\n\n`;
  try {
    log += "[1/3] Checking ph_teachers_list columns...\n";
    const res1 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ph_teachers_list'
      ORDER BY column_name;
    `);
    const cols1 = res1.rows.map(r => r.column_name);
    log += `Total columns: ${cols1.length}\n`;
    log += `Columns: ${cols1.join(", ")}\n\n`;

    // Check for dropped columns
    const dropped = ['tin', 'control_num', 'region', 'division', 'district'];
    const stillPresent = dropped.filter(c => cols1.includes(c));
    if (stillPresent.length > 0) {
        log += `⚠️ WARNING: The following columns should be dropped but are still present: ${stillPresent.join(", ")}\n`;
    } else {
        log += "✅ SUCCESS: Redundant columns successfully dropped.\n";
    }

    // Check for new columns
    const added = ['specialization', 'sex', 'experience_bracket', 'funding_source', 'role_designation'];
    const missing = added.filter(c => !cols1.includes(c));
    if (missing.length > 0) {
        log += `⚠️ WARNING: The following new columns are missing: ${missing.join(", ")}\n`;
    } else {
        log += "✅ SUCCESS: Demographic columns successfully added.\n";
    }

    log += "\n[2/3] Checking ph_teachers_workload table...\n";
    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ph_teachers_workload'
      ORDER BY column_name;
    `);
    
    if (res2.rows.length === 0) {
        log += "❌ ERROR: Table 'ph_teachers_workload' does not exist!\n";
    } else {
        log += "✅ SUCCESS: Table 'ph_teachers_workload' exists.\n";
        log += "Structure:\n";
        res2.rows.forEach(r => {
            log += `  - ${r.column_name} (${r.data_type})\n`;
        });
    }

    log += "\n[3/3] Checking indexes for ph_teachers_workload...\n";
    const res3 = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'ph_teachers_workload';
    `);
    if (res3.rows.length === 0) {
        log += "⚠️ WARNING: No indexes found for 'ph_teachers_workload'.\n";
    } else {
        log += "✅ SUCCESS: Indexes found:\n";
        res3.rows.forEach(r => log += `  - ${r.indexname}\n`);
    }

    fs.writeFileSync('schema_log_v2.txt', log);
    console.log("Verification log written to schema_log_v2.txt");
  } catch (err) {
    const errorMsg = `FATAL ERROR: ${err.message}\n${err.stack}`;
    fs.writeFileSync('schema_log_v2.txt', log + "\n" + errorMsg);
    console.error("Verification failed. Check schema_log_v2.txt");
  } finally {
    await pool.end();
  }
}

checkSchema();
