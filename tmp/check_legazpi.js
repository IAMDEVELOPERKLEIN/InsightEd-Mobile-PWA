import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkLegazpi() {
  try {
    console.log('--- Checking ph_schools ---');
    const phRes = await pool.query(`
      SELECT 
        division, 
        COUNT(*) as total, 
        COUNT(iern) as registered 
      FROM ph_schools 
      WHERE division ILIKE '%Lega%pi%' 
      GROUP BY division
    `);
    console.table(phRes.rows);

    console.log('\n--- Checking schools_IERN ---');
    const iernRes = await pool.query(`
      SELECT 
        "Division", 
        COUNT(*) as total 
      FROM "schools_IERN" 
      WHERE "Division" ILIKE '%Lega%pi%' 
      GROUP BY "Division"
    `);
    console.table(iernRes.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkLegazpi();
