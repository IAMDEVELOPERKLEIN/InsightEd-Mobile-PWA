const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/deped_tracker' });

async function check() {
  try {
    console.log("Checking tables...");
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ph_unit10%'");
    console.log("Found tables:", tables.rows.map(r => r.table_name));

    const allTables = ['ph_unit10_inventory', 'ph_unit10_demolitions', 'facility_repair_details', 'ph_school_buildable_spaces'];
    for (const t of allTables) {
        try {
            const count = await pool.query(`SELECT COUNT(*) FROM ${t}`);
            console.log(`Count in ${t}:`, count.rows[0].count);
        } catch (e) {
            console.log(`Table ${t} does not exist or query failed: ${e.message}`);
        }
    }

  } catch (err) {
    console.error("DB Check Error:", err);
  } finally {
    await pool.end();
  }
}

check();
