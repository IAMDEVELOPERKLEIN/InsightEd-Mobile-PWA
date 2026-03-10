import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tables in public schema:");
        console.log(res.rows.map(r => r.table_name).join(', '));

        const engForms = res.rows.find(r => r.table_name === 'engineer_forms' || r.table_name === 'engineer_form');
        if (engForms) {
            console.log(`\nSchema for ${engForms.table_name}:`);
            const schemaRes = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [engForms.table_name]);
            schemaRes.rows.forEach(col => {
                console.log(`- ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log("\nNeither 'engineer_forms' nor 'engineer_form' found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkTables();
