import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        let output = "";
        output += "--- ALL PROJECTS WITH AGENCY ---\n";
        const projectRes = await pool.query(`
            SELECT project_id, project_name, region, implementing_agencies, implementing_agency_specific, 
                   LENGTH(COALESCE(moa_pdf, '')) as moa_len, LENGTH(COALESCE(rta_pdf, '')) as rta_len, 
                   tranche_1, tranche_2, tranche_3, mode_of_project
            FROM engineer_form 
            WHERE implementing_agencies IS NOT NULL OR implementing_agency_specific IS NOT NULL
        `);
        output += JSON.stringify(projectRes.rows, null, 2) + "\n\n";

        output += "--- USERS WITH AGENCY ROLES ---\n";
        const userRes = await pool.query(`
            SELECT uid, email, role, region, division 
            FROM users 
            WHERE role IN ('Implementing Agency', 'PGO', 'CGO', 'MGO', 'DPWH', 'CSO')
        `);
        output += JSON.stringify(userRes.rows, null, 2) + "\n";

        fs.writeFileSync('debug_output.txt', output);
        console.log("Results written to debug_output.txt");

    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        process.exit(0);
    }
}
run();
