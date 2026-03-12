
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("1. Creating indices for performance...");
    await client.query('CREATE INDEX IF NOT EXISTS idx_engineer_form_engineer_id ON engineer_form(engineer_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_engineer_form_ipc ON engineer_form(ipc)');
    console.log("   ✅ Indices created/verified.");

    console.log("2. Identifying records requiring backfill (null engineer_id)...");
    const nullRecords = await client.query("SELECT project_id, ipc FROM engineer_form WHERE engineer_id IS NULL AND ipc IS NOT NULL");
    console.log(`   Found ${nullRecords.rows.length} records.`);

    let fixedCount = 0;
    for (const record of nullRecords.rows) {
      // Find the most recent non-null assignment for this IPC
      const hist = await client.query(
        "SELECT engineer_id, engineer_name FROM engineer_form WHERE ipc = $1 AND engineer_id IS NOT NULL ORDER BY project_id DESC LIMIT 1",
        [record.ipc]
      );

      if (hist.rows.length > 0) {
        const { engineer_id, engineer_name } = hist.rows[0];
        await client.query(
          "UPDATE engineer_form SET engineer_id = $1, engineer_name = $2 WHERE project_id = $3",
          [engineer_id, engineer_name, record.project_id]
        );
        fixedCount++;
        console.log(`   - Fixed PID ${record.project_id} (IPC: ${record.ipc}) -> Assigned to ${engineer_name}`);
      } else {
        console.log(`   - [Skip] No history found for IPC ${record.ipc} (PID: ${record.project_id})`);
      }
    }

    // Special Case: The user "Jonathan Narvato" has UID 'elqoElPDWZaWFKnN40hi7XctAD43' but some records might have it as string or null.
    // The report showed PID 429 has null engineer_id but Name "Engineer". 
    // Let's also ensure 'xyxbCx7ebGaiceHmD2MvCozK63k1' (DepEd Engineer) is assigned to their expected projects if we can identify them.
    // Based on previous search, PID 393 and others were assigned to Jonathan Narvato.

    console.log(`   ✅ Backfill complete. ${fixedCount} records updated.`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
