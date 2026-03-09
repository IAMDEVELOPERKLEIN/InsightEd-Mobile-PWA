import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkBataan() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Querying Bataan projects in engineer_form:');
        const res = await pool.query("SELECT project_id, project_name, region, division, is_donated, project_category, funding_year FROM engineer_form WHERE division ILIKE '%Bataan%'");
        console.table(res.rows);

        if (res.rows.length > 0) {
            const first = res.rows[0];
            console.log('\nDetails of first project:');
            console.log('Region Type:', typeof first.region, `Value: "${first.region}"`);
            console.log('Division Type:', typeof first.division, `Value: "${first.division}"`);
            console.log('is_donated Type:', typeof first.is_donated, `Value: "${first.is_donated}"`);
        } else {
            console.log('No Bataan projects found with ILIKE.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkBataan();
