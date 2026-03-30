import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fixMissing() {
  try {
    console.log("Looking for missing completion records...");
    
    // Find ierns in ph_schools that are missing in ph_school_completion
    const query = `
      SELECT ps.iern, ps.school_id 
      FROM ph_schools ps 
      LEFT JOIN ph_school_completion psc ON ps.iern = psc.iern 
      WHERE ps.iern IS NOT NULL AND psc.iern IS NULL
    `;
    
    const missingRes = await pool.query(query);
    console.log(`Found ${missingRes.rows.length} missing schools.`);

    for (const row of missingRes.rows) {
      console.log(`Syncing missing school: ${row.school_id} (${row.iern})`);
      await pool.query(`
        INSERT INTO ph_school_completion (iern, unit1_completion, total_completion)
        VALUES ($1, true, 12.5)
        ON CONFLICT (iern) DO NOTHING
      `, [row.iern]);
    }
    
    console.log("All missing schools synced.");
  } catch(e) { 
      console.error(e); 
  } finally { 
      pool.end(); 
  }
}

fixMissing();
