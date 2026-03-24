import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkData() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Checking variants in engineer_form for Bataan projects:');
        const res = await pool.query("SELECT DISTINCT region, division, is_donated FROM engineer_form WHERE division ILIKE '%Bataan%'");
        console.table(res.rows);

        console.log('\nChecking all regions and divisions in the system:');
        const allRes = await pool.query('SELECT DISTINCT region, division FROM schools WHERE region IS NOT NULL ORDER BY region, division');
        console.table(allRes.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkData();
