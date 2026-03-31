
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkImages() {
  try {
    const res = await pool.query('SELECT id, project_id, image_data, category FROM engineer_image LIMIT 10');
    console.log('Sample Image Data:');
    res.rows.forEach(row => {
      console.log(`ID: ${row.id}, Project: ${row.project_id}, Category: ${row.category}`);
      console.log(`Data (first 50 chars): ${row.image_data.substring(0, 50)}...`);
      console.log('---');
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkImages();
