import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  console.log('=== ph_schools division names containing "lega" or "legaz" ===');
  const r1 = await pool.query(`
    SELECT division, COUNT(*) as total, COUNT(iern) as with_iern
    FROM ph_schools
    WHERE LOWER(division) LIKE '%lega%'
    GROUP BY division
  `);
  console.table(r1.rows);

  console.log('\n=== ph_schools division names for Region V ===');
  const r2 = await pool.query(`
    SELECT division, COUNT(*) as total, COUNT(iern) as with_iern
    FROM ph_schools
    WHERE UPPER(TRIM(region)) = 'REGION V'
    GROUP BY division
    ORDER BY division
  `);
  console.table(r2.rows);

  console.log('\n=== Camarines Sur iern check ===');
  const r3 = await pool.query(`
    SELECT school_id, school_name, division, iern
    FROM ph_schools
    WHERE LOWER(division) LIKE '%camarines sur%' AND iern IS NOT NULL
    LIMIT 10
  `);
  console.table(r3.rows);

  await pool.end();
}

check().catch(console.error);
