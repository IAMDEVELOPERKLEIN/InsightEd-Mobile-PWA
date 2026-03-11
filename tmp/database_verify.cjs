const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    console.log('--- Final Database Verification ---');
    try {
        // 1. Check Project Linking for DepEd Engineer
        const engUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
        const projectRes = await pool.query('SELECT COUNT(*) FROM engineer_form WHERE engineer_id = $1', [engUid]);
        console.log(`Projects linked to DepEd Engineer (${engUid}): ${projectRes.rows[0].count}`);

        // 2. Check for remaining orphans
        const orphanRes = await pool.query('SELECT COUNT(*) FROM engineer_form WHERE engineer_id IS NULL OR engineer_id = \'\'');
        console.log(`Orphan projects remaining: ${orphanRes.rows[0].count}`);

        // 3. Check User profile for Engineer
        const userRes = await pool.query('SELECT uid, email, role, first_name, last_name FROM users WHERE uid = $1', [engUid]);
        console.log('Engineer User Account:', userRes.rows[0] ? 'Found' : 'NOT FOUND');
        if (userRes.rows[0]) console.log(userRes.rows[0]);

        // 4. Check for HRODI accounts
        const hrodiRes = await pool.query('SELECT uid, email, role, first_name, last_name FROM users WHERE role IN (\'HRODI\', \'HRODI Engineer\', \'EFD\')');
        console.log(`\nHRODI/EFD Accounts Found: ${hrodiRes.rows.length}`);
        hrodiRes.rows.forEach(r => console.log(`- ${r.email} (${r.role}) [${r.uid}]`));

    } catch (err) {
        console.error('Verification failed:', err.message);
    } finally {
        await pool.end();
    }
}

verify();
