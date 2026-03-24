import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

let dbUrl = '';
let dbUrlNew = '';

if (fs.existsSync('.env')) {
    try {
        let envContent = fs.readFileSync('.env', 'utf16le');

        // Handle DATABASE_URL
        let match1 = envContent.match(/DATABASE_URL=(.*)/);
        if (!match1) {
            envContent = fs.readFileSync('.env', 'utf8');
            match1 = envContent.match(/DATABASE_URL=(.*)/);
        }
        if (match1) {
            dbUrl = match1[1].trim().replace(/^['"]|['"]$/g, '');
        }

        // Handle NEW_DATABASE_URL
        let match2 = envContent.match(/NEW_DATABASE_URL=(.*)/);
        if (match2) {
            dbUrlNew = match2[1].trim().replace(/^['"]|['"]$/g, '');
        }
    } catch (e) {
        console.error("Failed to parse .env:", e.message);
    }
}

console.log("DB URL Found:", dbUrl ? "YES" : "NO");
console.log("NEW DB URL Found:", dbUrlNew ? "YES" : "NO");

const dropQuery = `
  ALTER TABLE engineer_form
  DROP COLUMN IF EXISTS update_type,
  DROP COLUMN IF EXISTS variation_order_pdf,
  DROP COLUMN IF EXISTS vo_number,
  DROP COLUMN IF EXISTS vo_requested_date,
  DROP COLUMN IF EXISTS vo_requested_by;
`;

async function run() {
    // 1. Primary DB
    if (dbUrl) {
        const pool = new Pool({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });
        try {
            console.log("Dropping from Primary DB...");
            await pool.query(dropQuery);
            console.log("✅ Primary Dropped!");
        } catch (e) {
            console.error("❌ Primary Error:", e.message);
        }
        await pool.end();
    }

    // 2. Secondary DB
    if (dbUrlNew) {
        const poolNew = new Pool({
            connectionString: dbUrlNew,
            ssl: { rejectUnauthorized: false }
        });
        try {
            console.log("Dropping from Secondary DB...");
            await poolNew.query(dropQuery);
            console.log("✅ Secondary Dropped!");
        } catch (e) {
            console.error("❌ Secondary Error:", e.message);
        }
        await poolNew.end();
    }
}
run();
