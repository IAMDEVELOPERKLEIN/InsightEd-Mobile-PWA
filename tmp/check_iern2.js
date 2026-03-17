/**
 * Direct DB check: what does ph_schools.iern store for Region V schools?
 * Uses the insightEd secondary DB connection (pool from azureDb.js config)
 */
import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';
config();

// Use same connection string as the server
const DATABASE_URL = process.env.DATABASE_URL;
console.log('Using DB:', DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown');

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // Check 1: ph_schools.iern distribution for Region V
  const r1 = await pool.query(`
    SELECT 
      division,
      COUNT(*) as total_schools,
      COUNT(iern) as iern_not_null,
      SUM(CASE WHEN iern IS NULL THEN 1 ELSE 0 END) as iern_null
    FROM ph_schools
    WHERE UPPER(TRIM(region)) = 'REGION V'
    GROUP BY division
    ORDER BY iern_not_null DESC, division
  `);
  console.log('\n=== ph_schools iern counts by division (Region V) ===');
  console.table(r1.rows);

  // Check 2: Show actual schools with non-null iern
  const r2 = await pool.query(`
    SELECT school_id, school_name, division, iern
    FROM ph_schools
    WHERE UPPER(TRIM(region)) = 'REGION V' AND iern IS NOT NULL
    ORDER BY division, school_name
  `);
  console.log('\n=== Schools with non-null iern in Region V ===');
  console.table(r2.rows);

  // Check 3: schools_IERN table reference - how many Legaspi schools there
  const r3 = await pool.query(`
    SELECT "Division", COUNT(*) as count
    FROM schools_iern
    WHERE "Region" = 'Region V'
    GROUP BY "Division"
    ORDER BY count DESC
  `).catch(e => ({ rows: [], error: e.message }));
  console.log('\n=== schools_iern division counts (Region V) ===');
  if (r3.rows) console.table(r3.rows);
  else console.log('Error:', r3.error);

  await pool.end();
}

run().catch(e => console.error('Fatal:', e.message));
