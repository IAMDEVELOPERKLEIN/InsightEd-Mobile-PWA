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
pool.query("SELECT school_name, ipc, actions FROM engineer_form WHERE school_id = '100722'")
    .then(r => {
        console.log(JSON.stringify(r.rows, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
