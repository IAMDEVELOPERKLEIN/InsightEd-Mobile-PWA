
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchemas() {
    try {
        console.log("--- Schema Check ---");
        
        const tables = ['ph_schools', 'school_profiles', 'users'];
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table]);
            res.rows.forEach(row => {
                console.log(` - ${row.column_name} (${row.data_type})`);
            });
        }

    } catch (err) {
        console.error("Schema check failed:", err.message);
    } finally {
        await pool.end();
    }
}

checkSchemas();
