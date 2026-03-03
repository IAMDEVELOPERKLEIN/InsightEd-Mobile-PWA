import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    connectionString: 'postgres://neondb_owner:npg_gS19JkHjUfAc@ep-floral-smoke-a1h2h4m2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Cleaning engineer_form...");
        await client.query(`
      ALTER TABLE engineer_form
      DROP COLUMN IF EXISTS funds_utilized,
      DROP COLUMN IF EXISTS variation_order_pdf,
      DROP COLUMN IF EXISTS vo_number,
      DROP COLUMN IF EXISTS vo_requested_date,
      DROP COLUMN IF EXISTS vo_requested_by,
      DROP COLUMN IF EXISTS has_variation_order,
      DROP COLUMN IF EXISTS variation_order_amount,
      DROP COLUMN IF EXISTS variation_order_remarks,
      DROP COLUMN IF EXISTS variation_order_no,
      DROP COLUMN IF EXISTS variation_order_date;
    `);
        console.log("✅ Dropped old VO and Realignment columns from engineer_form (if they existed).");

        console.log("Creating variation_orders table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS variation_orders (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL,
          ipc TEXT,
          vo_number TEXT,
          requested_date DATE,
          requested_by TEXT,
          original_contract_amount NUMERIC,
          vo_amount NUMERIC,
          revised_contract_amount NUMERIC,
          original_target_completion_date DATE,
          revised_target_completion_date DATE,
          justification TEXT,
          status TEXT DEFAULT 'Pending',
          document_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT
      );
    `);
        console.log("✅ Created variation_orders table.");

        console.log("Creating realignments table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS realignments (
          id SERIAL PRIMARY KEY,
          source_project_id INTEGER,
          target_project_id INTEGER,
          source_ipc TEXT,
          target_ipc TEXT,
          realignment_amount NUMERIC,
          request_date DATE,
          justification TEXT,
          approving_authority TEXT,
          status TEXT DEFAULT 'Pending',
          document_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT
      );
    `);
        console.log("✅ Created realignments table.");

        await client.query('COMMIT');
        console.log("🎉 Migration completed successfully.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
