import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        console.log("--- ALL PROJECTS WITH AGENCY ---");
        const projectRes = await pool.query(`
            SELECT project_id, project_name, region, implementing_agencies, implementing_agency_specific, 
                   LENGTH(COALESCE(moa_pdf, '')) as moa_len, LENGTH(COALESCE(rta_pdf, '')) as rta_len, 
                   tranche_1, tranche_2, tranche_3, mode_of_project
            FROM engineer_form 
            WHERE implementing_agencies IS NOT NULL OR implementing_agency_specific IS NOT NULL
        `);
        console.table(projectRes.rows);

        console.log("\n--- USERS WITH AGENCY ROLES ---");
        const userRes = await pool.query(`
            SELECT uid, email, role, region, division 
            FROM users 
            WHERE role IN ('Implementing Agency', 'PGO', 'CGO', 'MGO', 'DPWH', 'CSO')
        `);
        console.table(userRes.rows);

    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        process.exit(0);
    }
}
run();
