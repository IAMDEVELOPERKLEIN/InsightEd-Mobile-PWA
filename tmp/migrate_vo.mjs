
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Starting database migration for 'variation_orders'...");

    // Check if columns exist before renaming to avoid errors if already migrated
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'variation_orders';
    `);
    const existingColumns = checkRes.rows.map(r => r.column_name);

    const migrate = async (oldName, newName, type) => {
        if (existingColumns.includes(oldName) && !existingColumns.includes(newName)) {
            console.log(`Renaming ${oldName} to ${newName}...`);
            await pool.query(`ALTER TABLE "variation_orders" RENAME COLUMN "${oldName}" TO "${newName}";`);
        } else if (!existingColumns.includes(newName)) {
            console.log(`Adding column ${newName} (${type})...`);
            await pool.query(`ALTER TABLE "variation_orders" ADD COLUMN "${newName}" ${type};`);
        }
    };

    // Rename existing columns
    await migrate('vo_number', 'variation_name', 'text');
    await migrate('vo_type', 'variation_type', 'text');
    await migrate('original_contract_amount', 'original_amount', 'numeric');
    await migrate('additive_amount', 'additive', 'numeric');
    await migrate('deductive_amount', 'deductive', 'numeric');
    await migrate('net_vo_amount', 'modified_amount', 'numeric');

    // Add new columns
    if (!existingColumns.includes('reused_amount')) {
        console.log("Adding column reused_amount (numeric)...");
        await pool.query('ALTER TABLE "variation_orders" ADD COLUMN "reused_amount" numeric DEFAULT 0;');
    }

    console.log("✅ Database migration for 'variation_orders' completed successfully.");
  } catch (err) {
    console.error("❌ Error during migration:", err.message);
  } finally {
    await pool.end();
  }
}

run();
