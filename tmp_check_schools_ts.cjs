const { Pool } = require('pg');
const DB_URL = 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchoolsTimestamps() {
  try {
    console.log(`--- Timestamp columns for ph_schools ---`);
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools' 
      AND (data_type LIKE '%timestamp%' OR column_name LIKE '%date%' OR column_name LIKE '%at%')
      ORDER BY ordinal_position
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchoolsTimestamps();
