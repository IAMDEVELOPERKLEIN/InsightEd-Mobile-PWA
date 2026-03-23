const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ph_schools';"))
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    return client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
