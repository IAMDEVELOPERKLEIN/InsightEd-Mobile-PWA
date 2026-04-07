const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT DISTINCT table_name, column_name FROM information_schema.columns WHERE table_name = 'school_documents' OR table_name = 'pending_schools'").then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
}).catch(e => {
    console.error(e.message);
    process.exit(1);
});
