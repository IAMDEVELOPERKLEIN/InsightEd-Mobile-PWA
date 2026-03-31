import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: 'api/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDiscrepancy() {
  try {
    console.log('--- Checking ph_schools ---');
    // Using a broad check for "test" or "blank"
    const phRes = await pool.query(`
      SELECT count(*) as count FROM ph_schools 
      WHERE region IS NULL OR region = '' OR region = 'TEST REGION' OR division = 'TEST DIVISION'
    `);
    console.log('Total in ph_schools (test/blank):', phRes.rows[0].count);

    const phList = await pool.query(`
      SELECT school_id, school_name, region, division FROM ph_schools 
      WHERE region IS NULL OR region = '' OR region = 'TEST REGION' OR division = 'TEST DIVISION'
      LIMIT 20
    `);
    console.log('Sample from ph_schools:', phList.rows);

    const ids = phList.rows.map(r => `'${r.school_id}'`).join(',');
    if (ids) {
      console.log('\n--- Checking schools_IERN matching those IDs ---');
      const iernRes = await pool.query(`
        SELECT "SchoolID", "School_Name", "Region", "Division" FROM "schools_IERN" 
        WHERE "SchoolID" IN (${ids})
      `);
      console.log('Found in schools_IERN:', iernRes.rows.length);
      console.log('Sample from schools_IERN:', iernRes.rows);
      
      const missing = phList.rows.filter(p => !iernRes.rows.some(i => i.SchoolID === p.school_id));
      console.log('Missing from schools_IERN:', missing.map(m => m.school_id));
    }

    console.log('\n--- Checking total schools_IERN in test/blank ---');
    const iernCount = await pool.query(`
      SELECT count(*) as count FROM "schools_IERN"
      WHERE "Region" IS NULL OR "Region" = '' OR "Region" = 'TEST REGION'
    `);
    console.log('Total in schools_IERN (test/blank):', iernCount.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkDiscrepancy();
