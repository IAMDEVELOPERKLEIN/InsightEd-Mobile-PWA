const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form'")
  .then(res => console.log(res.rows.map(r => r.column_name)))
  .catch(console.error)
  .finally(() => pool.end());
