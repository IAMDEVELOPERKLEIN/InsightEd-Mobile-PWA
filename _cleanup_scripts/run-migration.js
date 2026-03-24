import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/postgres';
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log("Starting Migration...");

    await pool.query(`
      ALTER TABLE engineer_supplamental_moa DROP CONSTRAINT IF EXISTS engineer_supplamental_moa_mother_moa_id_fkey;
    `);
    console.log("Dropped constraint engineer_supplamental_moa_mother_moa_id_fkey (if existed)");

    await pool.query(`
      ALTER TABLE engineer_mother_moa ALTER COLUMN mother_moa_id TYPE VARCHAR(255) USING mother_moa_id::text;
    `);
    console.log("Altered engineer_mother_moa.mother_moa_id to VARCHAR(255)");

    await pool.query(`
      ALTER TABLE engineer_supplamental_moa ALTER COLUMN mother_moa_id TYPE VARCHAR(255) USING mother_moa_id::text;
    `);
    console.log("Altered engineer_supplamental_moa.mother_moa_id to VARCHAR(255)");

    await pool.query(`
      ALTER TABLE engineer_supplamental_moa ALTER COLUMN supplamental_moa_id TYPE VARCHAR(255) USING supplamental_moa_id::text;
    `);
    console.log("Altered engineer_supplamental_moa.supplamental_moa_id to VARCHAR(255)");

    // Find and drop constraints on engineer_form before altering it
    const constraintsRes = await pool.query(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'engineer_form' AND kcu.column_name = 'mother_moa_id' AND tc.constraint_type = 'FOREIGN KEY';
    `);
    
    for (let row of constraintsRes.rows) {
      await pool.query(`ALTER TABLE engineer_form DROP CONSTRAINT ${row.constraint_name}`);
      console.log(`Dropped constraint ${row.constraint_name} on engineer_form`);
    }

    await pool.query(`
      ALTER TABLE engineer_form ALTER COLUMN mother_moa_id TYPE VARCHAR(255) USING mother_moa_id::text;
    `);
    console.log("Altered engineer_form.mother_moa_id to VARCHAR(255)");

    await pool.query(`
      ALTER TABLE engineer_form ALTER COLUMN supplamental_moa_id TYPE VARCHAR(255) USING supplamental_moa_id::text;
    `);
    console.log("Altered engineer_form.supplamental_moa_id to VARCHAR(255)");

    await pool.query(`
      ALTER TABLE engineer_supplamental_moa ADD CONSTRAINT engineer_supplamental_moa_mother_moa_id_fkey FOREIGN KEY (mother_moa_id) REFERENCES engineer_mother_moa(mother_moa_id) ON DELETE CASCADE;
    `);
    console.log("Re-added constraint engineer_supplamental_moa_mother_moa_id_fkey");

    console.log("Migration Complete!");
  } catch (err) {
    console.error("Migration Error:", err.message);
  } finally {
    pool.end();
  }
}

runMigration();
