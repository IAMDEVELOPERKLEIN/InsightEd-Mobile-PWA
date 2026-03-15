import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        console.log("--- PROJECT DATA ---");
        const projectRes = await pool.query(`
            SELECT project_id, project_name, region, implementing_agencies, implementing_agency_specific, 
                   moa_pdf, rta_pdf, tranche_1, tranche_2, tranche_3, mode_of_project
            FROM engineer_form 
            WHERE (implementing_agencies ILIKE '%Bataan%' OR implementing_agency_specific ILIKE '%Bataan%')
               OR (implementing_agencies ILIKE '%MGO%' OR implementing_agency_specific ILIKE '%MGO%')
        `);
        console.log(JSON.stringify(projectRes.rows, null, 2));

        console.log("\n--- USER DATA ---");
        const userRes = await pool.query(`
            SELECT uid, email, role, region, division FROM users WHERE email = 'testpgo@deped.gov.ph'
        `);
        console.log(JSON.stringify(userRes.rows, null, 2));

    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        process.exit(0);
    }
}
run();
