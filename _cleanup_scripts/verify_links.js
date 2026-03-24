import pg from 'pg';
import fs from 'fs';

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
    let envContent = fs.readFileSync('.env', 'utf8');
    let match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
}
if (!dbUrl) dbUrl = 'postgres://postgres:password@localhost:5432/postgres';

const pool = new pg.Pool({ connectionString: dbUrl });
async function check() {
    const res = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id IS NOT NULL AND actions = 'Imported from Excel'");
    console.log(`Projects with linked Engineer IDs: ${res.rows[0].count}`);
    process.exit(0);
}
check();
