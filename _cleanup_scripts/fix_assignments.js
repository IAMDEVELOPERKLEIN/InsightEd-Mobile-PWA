
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targetUid = 'xyxbCx7ebGaiceHmD2MvCozK63k1';
    const targetName = 'Christian Lareza';

    console.log(`Reassigning projects to UID: ${targetUid} (${targetName})...`);

    // 1. Reassign by Name "Jonathan Narvato"
    const res1 = await client.query(
      "UPDATE engineer_form SET engineer_id = $1, engineer_name = $2 WHERE engineer_name = 'Jonathan Narvato' OR engineer_id = 'elqoElPDWZaWFKnN40hi7XctAD43'",
      [targetUid, targetName]
    );
    console.log(`   - Jonathan Narvato: ${res1.rowCount} records updated.`);

    // 2. Reassign by Name "Engineer" or null engineer_id
    const res2 = await client.query(
      "UPDATE engineer_form SET engineer_id = $1, engineer_name = $2 WHERE engineer_id IS NULL OR engineer_name = 'Engineer'",
      [targetUid, targetName]
    );
    console.log(`   - Engineer/NULL: ${res2.rowCount} records updated.`);

    // 3. Fix Project 406 specifically if needed (it had test testing)
    const res3 = await client.query(
      "UPDATE engineer_form SET engineer_id = $1, engineer_name = $2 WHERE project_id = 406",
      [targetUid, targetName]
    );
    console.log(`   - Project 406: ${res3.rowCount} records updated.`);

    await client.query('COMMIT');
    console.log("✅ Data correction complete.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Data correction failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixData();
