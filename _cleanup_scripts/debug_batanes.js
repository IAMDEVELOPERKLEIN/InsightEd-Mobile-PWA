
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugBatanes() {
    try {
        console.log("--- DEBUGGING BATANES SCHOOLS ---");
        const res = await pool.query(`
      SELECT school_id, school_name, region, division, district, completion_percentage 
      FROM school_profiles 
      WHERE division ILIKE '%Batanes%' OR school_name ILIKE '%Batanes%'
    `);

        console.log(`Found ${res.rows.length} schools.`);
        res.rows.forEach(r => {
            console.log(`[${r.school_id}] "${r.school_name}"`);
            console.log(`    Region: "${r.region}"`);
            console.log(`    Division: "${r.division}"`);
            console.log(`    District: "${r.district}"`);
            console.log(`    Completion: ${r.completion_percentage}%`);
            console.log('---');
        });

        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

debugBatanes();
