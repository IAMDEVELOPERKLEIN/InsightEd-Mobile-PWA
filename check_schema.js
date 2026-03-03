const { Pool } = require('pg');
require('dotenv').config({ path: './api/.env' }); // try api/.env first

const pool = new Pool({
    connectionString: 'postgres://neondb_owner:npg_gS19JkHjUfAc@ep-floral-smoke-a1h2h4m2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form';
    `);
        console.log("Columns in engineer_form:");
        res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
