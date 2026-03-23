const pg = require('pg');
const fs = require('fs');

const pool = new pg.Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('school_profiles', 'ph_schools')
      ORDER BY table_name, column_name
    `);
    fs.writeFileSync('tmp/columns_dump.json', JSON.stringify(res.rows, null, 2), 'utf8');
    console.log('✅ Columns dumped specifically to tmp/columns_dump.json in UTF-8');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
