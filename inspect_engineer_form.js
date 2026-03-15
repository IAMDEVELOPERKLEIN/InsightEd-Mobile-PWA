import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    console.log('🔍 Inspecting engineer_form table...');
    try {
        console.log('\n--- Columns ---');
        const colRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'engineer_form'");
        console.log(colRes.rows);

        console.log('\n--- Large Column Lengths (First 5 rows) ---');
        const lengthRes = await pool.query(`
            SELECT 
                project_id,
                LENGTH(pow_pdf) as pow_len, 
                LENGTH(dupa_pdf) as dupa_len, 
                LENGTH(contract_pdf) as contract_len,
                LENGTH(rta) as rta_len
            FROM engineer_form 
            WHERE pow_pdf IS NOT NULL OR dupa_pdf IS NOT NULL OR contract_pdf IS NOT NULL OR rta IS NOT NULL
            LIMIT 5
        `);
        console.log(lengthRes.rows);

        console.log('\n--- Indexes ---');
        const indexRes = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'engineer_form'");
        console.log(indexRes.rows);

        console.log('\n--- Table Size ---');
        const countRes = await pool.query("SELECT count(*) FROM engineer_form");
        console.log(`Total rows: ${countRes.rows[0].count}`);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspect();
