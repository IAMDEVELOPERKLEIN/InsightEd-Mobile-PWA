const pg = require('pg');
const fs = require('fs');

async function run() {
    let dbUrl;
    try {
        const raw = fs.readFileSync('.env');
        let content;
        if (raw[0] === 0xFF && raw[1] === 0xFE) {
            content = raw.toString('utf16le');
        } else {
            content = raw.toString('utf8');
        }
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
            if (line.trim().startsWith('DATABASE_URL=')) {
                dbUrl = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
                break;
            }
        }
    } catch (e) {
        console.error("Error reading .env:", e.message);
        process.exit(1);
    }

    if (!dbUrl) {
        console.error("DATABASE_URL not found");
        process.exit(1);
    }

    console.log("Connecting to:", dbUrl.replace(/:[^:@]*@/, ':****@'));
    const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
        console.log("Querying engineer_form count...");
        const start = Date.now();
        const res = await pool.query('SELECT COUNT(*) FROM engineer_form');
        console.log(`Rows in engineer_form: ${res.rows[0].count} (took ${Date.now() - start}ms)`);

        console.log("Querying school_profiles count...");
        const start2 = Date.now();
        const res2 = await pool.query('SELECT COUNT(*) FROM school_profiles');
        console.log(`Rows in school_profiles: ${res2.rows[0].count} (took ${Date.now() - start2}ms)`);

        console.log("Testing /api/engineers query...");
        const startEng = Date.now();
        const resEng = await pool.query(`
            SELECT uid, first_name AS "firstName", last_name AS "lastName", division, position 
            FROM users 
            WHERE role = 'Division Engineer'
            ORDER BY first_name ASC;
        `);
        console.log(`/api/engineers: ${resEng.rows.length} rows (took ${Date.now() - startEng}ms)`);

        console.log("Testing /api/reference/funding-years query...");
        const startFY = Date.now();
        const resFY = await pool.query(`
            SELECT DISTINCT funding_year 
            FROM engineer_form 
            WHERE funding_year IS NOT NULL 
            ORDER BY funding_year DESC;
        `);
        console.log(`/api/reference/funding-years: ${resFY.rows.length} rows (took ${Date.now() - startFY}ms)`);

        console.log("Testing /api/reference/efd-locations query...");
        const startLoc = Date.now();
        const resLoc = await pool.query(`
            SELECT DISTINCT region, division 
            FROM engineer_form 
            WHERE region IS NOT NULL AND division IS NOT NULL
            ORDER BY region, division;
        `);
        console.log(`/api/reference/efd-locations: ${resLoc.rows.length} rows (took ${Date.now() - startLoc}ms)`);

        console.log("Querying regions in engineer_form...");
        const resReg = await pool.query('SELECT region, COUNT(*) FROM engineer_form GROUP BY region');
        console.log("Regions in engineer_form:", JSON.stringify(resReg.rows, null, 2));

        console.log("Querying EFD users...");
        const resUsers = await pool.query("SELECT uid, email, role, region, division FROM users WHERE role = 'EFD' OR email LIKE '%efd%'");
        console.log("EFD/efd users found:", JSON.stringify(resUsers.rows, null, 2));

    } catch (e) {
        console.error("Query failed:", e.message);
    } finally {
        await pool.end();
    }
}

run();
