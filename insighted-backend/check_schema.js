const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: 'postgres://neondb_owner:npg_gS19JkHjUfAc@ep-floral-smoke-a1h2h4m2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'engineer_form'");
        const lines = res.rows.map(r => `${r.column_name}: ${r.data_type}`);
        fs.writeFileSync('schema_output.txt', lines.join('\n'));
        console.log("Wrote to schema_output.txt");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
