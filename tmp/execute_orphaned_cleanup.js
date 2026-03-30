import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function executeDeletion() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('--- Executing Orphaned Child Data Deletion ---');

        // Condition for valid school_ids: 
        // SELECT school_id FROM users WHERE registrant_type IS NOT NULL AND school_id IS NOT NULL

        const tablesWithSchoolId = [
            'ph_teachers_list',
            'ph_performance_logs',
            'ph_buildings_inventory',
            'ph_inventory_repairs'
        ];

        for (const table of tablesWithSchoolId) {
            const res = await client.query(`
                DELETE FROM "${table}" 
                WHERE school_id NOT IN (
                    SELECT school_id FROM users WHERE registrant_type IS NOT NULL AND school_id IS NOT NULL
                )
            `);
            console.log(`Deleted ${res.rowCount} orphaned records from ${table}`);
        }

        // Tables with iern
        const tablesWithIern = [
            'ph_school_buildable_spaces',
            'ph_ecart_batches'
        ];
        
        for (const table of tablesWithIern) {
            const res = await client.query(`
                DELETE FROM "${table}" 
                WHERE iern NOT IN (
                    SELECT iern FROM users WHERE registrant_type IS NOT NULL AND iern IS NOT NULL
                )
            `);
            console.log(`Deleted ${res.rowCount} orphaned records from ${table}`);
        }

        // Finally, clean up ph_schools (Parent Table)
        const phSchoolsRes = await client.query(`
            DELETE FROM ph_schools 
            WHERE school_id NOT IN (
                SELECT school_id FROM users WHERE registrant_type IS NOT NULL AND school_id IS NOT NULL
            )
        `);
        console.log(`Deleted ${phSchoolsRes.rowCount} orphaned records from ph_schools`);

        await client.query('COMMIT');
        console.log('--- Deletion Completed Successfully ---');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('DELETION ERROR:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

executeDeletion();
