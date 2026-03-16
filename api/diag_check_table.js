
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/postgres';
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function check() {
  try {
    const resCount = await pool.query(`SELECT count(*) FROM "schools_IERN"`);
    console.log('Row count in schools_IERN:', resCount.rows[0].count);

    const resRegions = await pool.query(`
      SELECT MAX("Region") as region 
      FROM "schools_IERN" 
      WHERE "Region" IS NOT NULL AND "Region" != '' 
      GROUP BY UPPER(TRIM("Region"))
      ORDER BY region ASC
    `);
    console.log('Distinct regions found:', resRegions.rows.length);
    if (resRegions.rows.length > 0) {
        console.log('Sample regions:', resRegions.rows.slice(0, 5).map(r => r.region));
    }
  } catch (err) {
    console.error('Error querying table:', err.message);
    if (err.message.includes('column "Region" does not exist')) {
        const resCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'schools_IERN'
        `);
        console.log('Columns in schools_IERN:', resCols.rows.map(r => r.column_name));
    }
  } finally {
    await pool.end();
  }
}

check();
