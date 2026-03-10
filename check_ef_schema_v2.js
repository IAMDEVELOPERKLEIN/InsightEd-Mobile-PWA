import pg from 'pg';
import fs from 'fs';

let dbUrl = '';
if (fs.existsSync('.env')) {
    const content = fs.readFileSync('.env', 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && key.trim() === 'DATABASE_URL') {
            dbUrl = value.trim();
        }
    });
}

if (!dbUrl) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: false // Try without SSL first
});

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form'
            ORDER BY ordinal_position
        `);
        console.log("Columns in engineer_form:");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        if (err.message.includes('no pg_hba.conf entry for host') || err.message.includes('requires SSL')) {
            console.log("Insecure connection failed, retrying with SSL...");
            const sslPool = new pg.Pool({
                connectionString: dbUrl,
                ssl: { rejectUnauthorized: false }
            });
            try {
                const res = await sslPool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'engineer_form'
                    ORDER BY ordinal_position
                `);
                console.log("Columns in engineer_form (via SSL):");
                res.rows.forEach(row => {
                    console.log(`- ${row.column_name} (${row.data_type})`);
                });
            } catch (sslErr) {
                console.error("SSL connection also failed:", sslErr.message);
            } finally {
                await sslPool.end();
            }
        } else {
            console.error("Connection failed:", err.message);
        }
    } finally {
        await pool.end();
    }
}

checkSchema();
