
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function report() {
  try {
    const res = await pool.query("SELECT project_id, ipc, engineer_id, engineer_name, school_name, status_of_construction_phase FROM engineer_form ORDER BY project_id DESC");
    let output = "Project ID | IPC | Engineer ID | Engineer Name | School | Status\n";
    output += "-----------|-----|-------------|---------------|--------|-------\n";
    res.rows.forEach(r => {
      output += `${r.project_id} | ${r.ipc} | ${r.engineer_id} | ${r.engineer_name} | ${r.school_name} | ${r.status_of_construction_phase}\n`;
    });
    fs.writeFileSync('project_report.txt', output);
    console.log("Report generated: project_report.txt");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

report();
