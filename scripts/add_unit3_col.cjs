const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/insighted' });

async function run() {
    await client.connect();
    try {
        await client.query('ALTER TABLE ph_schools ADD COLUMN unit3_sections JSONB');
        console.log('Column added successfully');
    } catch (err) {
        console.error('Error (might already exist):', err.message);
    }
    await client.end();
}
run();
