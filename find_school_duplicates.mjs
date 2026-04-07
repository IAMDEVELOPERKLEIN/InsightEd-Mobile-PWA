import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findDuplicates() {
  try {
    console.log("🔍 Searching for duplicates by School ID + Project Name...");
    const res = await pool.query(`
      SELECT school_id, project_name, COUNT(*) as duplicate_count
      FROM engineer_form
      GROUP BY school_id, project_name
      HAVING COUNT(*) > 1;
    `);

    if (res.rows.length === 0) {
      console.log("✅ No duplicates found for School ID + Project Name.");
    } else {
      console.log(`⚠️ Found ${res.rows.length} duplicate groups:`);
      console.table(res.rows);
      
      // Get detailed list
      const details = await pool.query(`
        SELECT project_id, school_id, project_name, ipc, created_at
        FROM engineer_form
        WHERE (school_id, project_name) IN (
          SELECT school_id, project_name
          FROM engineer_form
          GROUP BY school_id, project_name
          HAVING COUNT(*) > 1
        )
        ORDER BY school_id, project_name, created_at;
      `);
      console.log("\n📋 Detailed Rows for Duplicates:");
      console.table(details.rows);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    pool.end();
  }
}

findDuplicates();
