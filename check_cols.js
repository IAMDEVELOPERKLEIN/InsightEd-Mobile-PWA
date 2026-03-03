import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

let dbUrl = '';

if (fs.existsSync('.env')) {
    try {
        let envContent = fs.readFileSync('.env', 'utf16le');
        let match1 = envContent.match(/DATABASE_URL=(.*)/);
        if (!match1) {
            envContent = fs.readFileSync('.env', 'utf8');
            match1 = envContent.match(/DATABASE_URL=(.*)/);
        }
        if (match1) {
            dbUrl = match1[1].trim().replace(/^['"]|['"]$/g, '');
        }
    } catch (e) { }
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form';
        `);
        const cols = res.rows.map(r => r.column_name);

        console.log("---- CURRENT COLUMNS IN ENGINEER_FORM ----");

        const targets = ['variation_order_pdf', 'vo_number', 'vo_requested_date', 'vo_requested_by', 'update_type'];

        for (const t of targets) {
            if (cols.includes(t)) {
                console.log(`❌ COLUMN STILL EXISTS: ${t}`);
            } else {
                console.log(`✅ COLUMN COMPLETELY GONE: ${t}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
    await pool.end();
}
run();
