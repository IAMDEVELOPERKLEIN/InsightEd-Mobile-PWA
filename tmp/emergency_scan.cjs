const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function scan() {
  try {
    const res = await pool.query("SELECT * FROM engineer_form");
    console.log(`TOTAL ROWS IN TABLE: ${res.rows.length}`);
    if (res.rows.length > 0) {
      console.log("FIRST 5 ROWS:");
      res.rows.slice(0, 5).forEach((r, i) => {
        console.log(`ROW ${i}:`, JSON.stringify(r, (key, value) => value === undefined ? '__undefined__' : value));
      });
    } else {
       console.log("TABLE IS TOTALLY EMPTY ACCORDING TO SELECT *");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

scan();
