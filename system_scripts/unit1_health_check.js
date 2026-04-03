import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const DEBUG_MODE = true;

async function checkHealth() {
  try {
    console.log("🔍 Running Unit 1 Health Check...");
    
    // 1. Get schools with Unit 1 completion flag
    const res = await pool.query(`
      SELECT ps.school_id, ps.iern, ps.school_name, ps.school_head, ps.contact_number, ps.local_file_path, psc.unit1_completion
      FROM ph_schools ps
      LEFT JOIN ph_school_completion psc ON ps.iern = psc.iern
      WHERE psc.unit1_completion = true
      LIMIT 50
    `);

    console.log(`📊 Found ${res.rows.length} schools marked as Unit 1 Complete.`);

    const issues = [];
    res.rows.forEach(row => {
      const missing = [];
      if (!row.school_head) missing.push('school_head');
      if (!row.contact_number) missing.push('contact_number');
      if (!row.local_file_path) missing.push('Ownership Document');

      if (missing.length > 0) {
        issues.push({
          school: row.school_name,
          id: row.school_id,
          missing: missing.join(', ')
        });
      }
    });

    if (issues.length > 0) {
      console.warn(`⚠️  Found ${issues.length} schools with incomplete Unit 1 data despite being marked Complete:`);
      console.table(issues);
    } else {
      console.log("✅ All completed Unit 1 records appear healthy.");
    }

    if (DEBUG_MODE) {
      console.log("\n--- Debug: Sample Record ---");
      if (res.rows.length > 0) console.log(JSON.stringify(res.rows[0], null, 2));
    }

  } catch (err) {
    console.error("❌ Health Check Failed:", err.message);
  } finally {
    await pool.end();
  }
}

checkHealth();
