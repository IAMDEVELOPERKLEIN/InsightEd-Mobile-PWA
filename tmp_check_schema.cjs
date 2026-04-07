const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        const resDoc = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'school_documents'");
        console.log('school_documents:');
        console.log(JSON.stringify(resDoc.rows, null, 2));

        const resOwn = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'school_ownership_docs'");
        console.log('school_ownership_docs:');
        console.log(JSON.stringify(resOwn.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

check();
