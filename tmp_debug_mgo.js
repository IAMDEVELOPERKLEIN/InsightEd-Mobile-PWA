import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        console.log("Searching for projects possibly related to MGO Bataan...");
        const res = await pool.query(`
            SELECT project_id, project_name, region, implementing_agencies, implementing_agency_specific, 
                   moa_pdf, rta_pdf, tranche_1, tranche_2, tranche_3, mode_of_project
            FROM engineer_form 
            WHERE (implementing_agencies ILIKE '%Bataan%' OR implementing_agency_specific ILIKE '%Bataan%')
               OR (implementing_agencies ILIKE '%MGO%' OR implementing_agency_specific ILIKE '%MGO%')
            LIMIT 10
        `);
        console.log("Results found:", res.rows.length);
        console.table(res.rows);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        process.exit(0);
    }
}
run();
