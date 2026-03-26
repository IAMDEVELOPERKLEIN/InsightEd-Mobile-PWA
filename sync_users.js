import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

async function syncSchema() {
    const pools = [new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })];
    if (process.env.NEW_DATABASE_URL) {
        pools.push(new Pool({ connectionString: process.env.NEW_DATABASE_URL, ssl: { rejectUnauthorized: false } }));
    }

    for (const pool of pools) {
        const dbLabel = pool.options.connectionString === process.env.DATABASE_URL ? "Primary" : "Secondary";
        console.log(`\nSyncing ${dbLabel} Database...`);
        
        try {
            // Check if table exists
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'users'
                );
            `);
            if (!tableCheck.rows[0].exists) {
                console.log("❌ Table 'users' DOES NOT EXIST! Creating it...");
                await pool.query(`
                    CREATE TABLE users (
                        uid TEXT PRIMARY KEY,
                        email TEXT,
                        role TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);
            }

            // Check existing columns
            const res = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'users'
            `);
            const columns = res.rows.map(r => r.column_name);
            console.log(`Existing columns: ${columns.length}`);

            const migrations = [
                { name: 'first_name', type: 'TEXT' },
                { name: 'last_name', type: 'TEXT' },
                { name: 'region', type: 'TEXT' },
                { name: 'division', type: 'TEXT' },
                { name: 'province', type: 'TEXT' },
                { name: 'city', type: 'TEXT' },
                { name: 'barangay', type: 'TEXT' },
                { name: 'office', type: 'TEXT' },
                { name: 'position', type: 'TEXT' },
                { name: 'contact_number', type: 'TEXT' },
                { name: 'alt_email', type: 'TEXT' },
                { name: 'account_category', type: 'TEXT' },
                { name: 'iern', type: 'TEXT' },
                { name: 'school_id', type: 'TEXT' },
                { name: 'registrant_type', type: 'TEXT' },
                { name: 'password_hash', type: 'TEXT' },
                { name: 'password_salt', type: 'TEXT' },
                { name: 'hash_version', type: 'TEXT' },
                { name: 'passcode', type: 'TEXT' },
                { name: 'disabled', type: 'BOOLEAN DEFAULT FALSE' }
            ];

            for (const mig of migrations) {
                if (!columns.includes(mig.name)) {
                    console.log(` -> Adding column: ${mig.name}`);
                    await pool.query(`ALTER TABLE users ADD COLUMN "${mig.name}" ${mig.type}`);
                }
            }

            // Ensure division is TEXT (legacy might have it as something else)
            try {
                await pool.query('ALTER TABLE users ALTER COLUMN division TYPE TEXT');
            } catch (err) {
                console.log(` -> Note on division type: ${err.message}`);
            }

            console.log(`✅ ${dbLabel} Sync Complete.`);
        } catch (err) {
            console.error(`❌ ${dbLabel} Sync Error [${err.name}]: ${err.message}`);
            if (err.stack) console.error(err.stack);
        } finally {
            await pool.end();
        }
    }
}

syncSchema();
