const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  let log = "";
  try {
    log += "Checking ph_teachers_list columns...\n";
    const res1 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ph_teachers_list';
    `);
    const cols1 = res1.rows.map(r => r.column_name);
    log += "ph_teachers_list columns: " + cols1.join(", ") + "\n\n";

    log += "Checking ph_teachers_workload columns...\n";
    const res2 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ph_teachers_workload';
    `);
    const cols2 = res2.rows.map(r => r.column_name);
    log += "ph_teachers_workload columns: " + cols2.join(", ") + "\n\n";

    log += "Checking indexes for ph_teachers_workload...\n";
    const res3 = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'ph_teachers_workload';
    `);
    log += "ph_teachers_workload indexes: " + JSON.stringify(res3.rows, null, 2);

    fs.writeFileSync('schema_log.txt', log);
    console.log("Written to schema_log.txt");
  } catch (err) {
    console.error("Error checking schema:", err);
  } finally {
    await pool.end();
  }
}

checkSchema();
