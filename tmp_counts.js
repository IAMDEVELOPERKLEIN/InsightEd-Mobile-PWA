import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function check() {
  try {
    console.log('--- Database Connection Check ---');
    console.log('DB_URL:', process.env.DATABASE_URL ? 'FOUND' : 'MISSING');

    // 1. Ph Schools where region/division is 'test' or empty
    const ph = await pool.query(`
      SELECT count(*) FROM ph_schools 
      WHERE (region IS NULL OR region = '' OR region = 'TEST REGION')
      OR (division IS NULL OR division = '' OR division = 'TEST DIVISION')
    `);
    console.log(`TOTAL PH (TEST/BLANK): ${ph.rows[0].count}`);

    // 2. IERN Schools where region/division is 'test' or empty
    const iern = await pool.query(`
      SELECT count(*) FROM "schools_IERN"
      WHERE ("Region" IS NULL OR "Region" = '' OR "Region" = 'TEST REGION')
      OR ("Division" IS NULL OR "Division" = '' OR "Division" = 'TEST DIVISION')
    `);
    console.log(`TOTAL IERN (TEST/BLANK): ${iern.rows[0].count}`);

    // 3. Joint count (how many of those PH schools are actually in IERN)
    const joint = await pool.query(`
      SELECT count(*) 
      FROM "schools_IERN" s 
      JOIN ph_schools sp ON s."SchoolID" = sp.school_id
      WHERE (s."Region" IS NULL OR s."Region" = '' OR s."Region" = 'TEST REGION')
      OR (s."Division" IS NULL OR s."Division" = '' OR s."Division" = 'TEST DIVISION')
    `);
    console.log(`TOTAL REGISTERED IN IERN (TEST/BLANK): ${joint.rows[0].count}`);

    // 4. List the IDs that are in PH but NOT in IERN
    const phIds = await pool.query(`
      SELECT school_id, school_name FROM ph_schools 
      WHERE (region IS NULL OR region = '' OR region = 'TEST REGION')
      OR (division IS NULL OR division = '' OR division = 'TEST DIVISION')
    `);
    
    if (phIds.rows.length > 0) {
      const ids = phIds.rows.map(r => `'${r.school_id}'`).join(',');
      const iernCheck = await pool.query(`
        SELECT "SchoolID" FROM "schools_IERN" WHERE "SchoolID" IN (${ids})
      `);
      const iernIdSet = new Set(iernCheck.rows.map(r => r.SchoolID));
      const missing = phIds.rows.filter(r => !iernIdSet.has(r.school_id));
      
      console.log(`\nSchools in ph_schools but NOT in schools_IERN: ${missing.length}`);
      missing.forEach(m => console.log(` - ${m.school_id}: ${m.school_name}`));
    }

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await pool.end();
  }
}
check();
