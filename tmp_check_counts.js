
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkCounts() {
  try {
    console.log("--- Total Schools per Division (schools_IERN) with count = 51 ---");
    const masterCounts = await pool.query(`
      SELECT "Division" as division, COUNT(*) as count 
      FROM "schools_IERN" 
      GROUP BY "Division" 
      HAVING COUNT(*) = 51
    `);
    console.table(masterCounts.rows);

    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCounts();
