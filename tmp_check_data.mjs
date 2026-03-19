import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log("Checking project_category and is_donated values...");
        const res = await pool.query(`
            SELECT 
                project_category, 
                COUNT(*) as count
            FROM engineer_form
            GROUP BY project_category
        `);
        console.log("Unique Project Categories:");
        console.log(JSON.stringify(res.rows, null, 2));

        const sourceRes = await pool.query(`
            SELECT 
                is_donated, 
                COUNT(*) as count
            FROM engineer_form
            GROUP BY is_donated
        `);
        console.log("\nis_donated values:");
        console.log(JSON.stringify(sourceRes.rows, null, 2));

    } catch (err) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
check();
