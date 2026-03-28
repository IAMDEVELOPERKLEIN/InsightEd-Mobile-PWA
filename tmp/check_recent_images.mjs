
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT id, project_id, category, ipc, created_at, LENGTH(image_data) as size
      FROM engineer_image
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    fs.writeFileSync('tmp/recent_images.json', JSON.stringify(res.rows, null, 2));
    console.log("✅ Recent images written to tmp/recent_images.json");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

check();
