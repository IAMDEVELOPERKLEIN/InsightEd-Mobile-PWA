
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log("Checking columns in engineer_form...");
    
    const columns = [
      { name: 'actions', type: 'TEXT' },
      { name: 'uploader_id_update_moa_rta', type: 'TEXT' }
    ];

    for (const col of columns) {
      const checkRes = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'engineer_form' AND column_name = $1
      `, [col.name]);

      if (checkRes.rowCount === 0) {
        console.log(`Adding column ${col.name}...`);
        await pool.query(`ALTER TABLE engineer_form ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }

    console.log("Migration finished successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
