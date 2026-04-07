import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkDistricts() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
      const region = 'Region IV-A'; // Cavite sample
      const division = 'Cavite';

      const allDistricts = await pool.query('SELECT COUNT(DISTINCT district) FROM all_locations WHERE region = $1 AND division = $2', [region, division]);
      console.log(`all_locations districts for ${division}:`, allDistricts.rows[0].count);

      const iernDistricts = await pool.query('SELECT COUNT(DISTINCT "District") FROM "schools_IERN" WHERE "Region" = $1 AND "Division" = $2', [region, division]);
      console.log(`schools_IERN districts for ${division}:`, iernDistricts.rows[0].count);

  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkDistricts();
