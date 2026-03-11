const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function scan() {
  try {
    const res = await pool.query("SELECT project_id, engineer_id, engineer_name FROM engineer_form");
    console.log(`Total rows fetched: ${res.rows.length}`);
    
    let nullCount = 0;
    let emptyCount = 0;
    let nullStringCount = 0;

    res.rows.forEach(r => {
      if (r.engineer_id === null) nullCount++;
      else if (r.engineer_id === '') emptyCount++;
      else if (String(r.engineer_id).toLowerCase() === 'null') nullStringCount++;
    });

    console.log(`Actual NULLs: ${nullCount}`);
    console.log(`Empty strings: ${emptyCount}`);
    console.log(`"null" strings: ${nullStringCount}`);

    const sampleNull = res.rows.filter(r => r.engineer_id === null).slice(0, 5);
    console.log("Sample NULL rows:", JSON.stringify(sampleNull, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

scan();
