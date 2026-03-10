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

    const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
        console.log(`\n--- Columns for engineer_form ---`);
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form' 
            ORDER BY ordinal_position;
        `);
        res.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });
    } catch (e) {
        console.error("Query failed:", e.message);
    } finally {
        await pool.end();
    }
}

run();
