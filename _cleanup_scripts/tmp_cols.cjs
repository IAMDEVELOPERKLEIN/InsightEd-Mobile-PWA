const { Client } = require('pg');
const client = new Client({ connectionString: process.env.NEW_DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form'"))
.then(res => { console.log(res.rows.map(r => r.column_name).join(', ')); client.end(); }).catch(e=>console.error(e));
