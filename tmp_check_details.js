
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

async function checkDetails() {
  try {
    const divisions = ['Oroquieta City', 'Iriga City'];
    for (const div of divisions) {
      console.log(`\n--- Details for ${div} ---`);
      
      const masterCount = await pool.query(`
        SELECT COUNT(*) as total FROM "schools_IERN" WHERE "Division" = $1
      `, [div]);
      
      const registeredCount = await pool.query(`
        SELECT COUNT(*) as registered FROM ph_schools WHERE division = UPPER($1)
      `, [div]);

      const userCount = await pool.query(`
        SELECT COUNT(*) as users FROM users WHERE division = UPPER($1)
      `, [div]);

      console.log(`Total Schools (Masterlist): ${masterCount.rows[0].total}`);
      console.log(`Registered Schools (ph_schools): ${registeredCount.rows[0].registered}`);
      console.log(`User Accounts (users): ${userCount.rows[0].users}`);
    }

    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDetails();
