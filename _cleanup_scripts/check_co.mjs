import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/insighted' });
await client.connect();
const res = await client.query('SELECT school_id, curricular_offering FROM ph_schools ORDER BY updated_at DESC LIMIT 5');
console.log(res.rows);
await client.end();
