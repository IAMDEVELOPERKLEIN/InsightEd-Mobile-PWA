/**
 * InsightEd - School Status Management Tool
 * 
 * Allows updating a school's status (Active, Archived, Inactive).
 * If status is set to non-Active, operational data is purged from linked tables.
 * 
 * Usage: node system_scripts/manage_school_status.js
 */

import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const TABLES_TO_CLEAN = [
    'ph_buildings_demolition',
    'ph_buildings_inventory',
    'ph_buildings_repairs',
    'ph_ecart_batches',
    'ph_school_buildable_spaces',
    'school_location_profiles',
    'school_ownership_docs',
    'ph_school_completion',
    'pending_schools',
    'users',
    'ph_schools'
];

const STATUS_OPTIONS = {
    1: 'Active',
    2: 'Archived',
    3: 'Inactive'
};

async function updateStatus(schoolId, choice) {
    const newStatus = STATUS_OPTIONS[choice];
    if (!newStatus) {
        console.error("❌ Error: Invalid status choice.");
        rl.close();
        process.exit(1);
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Verify existence in schools_IERN
        const checkRes = await client.query('SELECT "SchoolID", "status", "School_Name" FROM "schools_IERN" WHERE "SchoolID" = $1', [schoolId]);
        
        if (checkRes.rowCount === 0) {
            console.error(`❌ Error: School ID ${schoolId} not found in schools_IERN.`);
            await client.query('ROLLBACK');
            return;
        }

        const school = checkRes.rows[0];
        console.log(`\nFound: ${school.School_Name} (${school.SchoolID})`);
        console.log(`Current Status: ${school.status}`);
        console.log(`Target Status: ${newStatus}\n`);

        // 2. If setting to Active, check for existing Active record with same ID
        if (newStatus === 'Active') {
            const activeCheck = await client.query('SELECT 1 FROM "schools_IERN" WHERE "SchoolID" = $1 AND "status" = \'Active\'', [schoolId]);
            if (activeCheck.rowCount > 0 && school.status !== 'Active') {
                console.error(`❌ Error: Another record with School ID ${schoolId} is already Active.`);
                console.log("Only one record can be Active at a time due to database constraints.");
                await client.query('ROLLBACK');
                return;
            }
        }

        // 3. Update status in schools_IERN
        console.log(`🔄 Updating status in [schools_IERN] to ${newStatus}...`);
        await client.query('UPDATE "schools_IERN" SET "status" = $1, "updated_at" = CURRENT_TIMESTAMP WHERE "SchoolID" = $2', [newStatus, schoolId]);

        // 4. If new status is NOT Active, purge data
        if (newStatus !== 'Active') {
            console.log(`🧹 Status is ${newStatus}. Purging operational data from linked tables...`);
            for (const table of TABLES_TO_CLEAN) {
                try {
                    const res = await client.query(`DELETE FROM "${table}" WHERE school_id = $1`, [schoolId]);
                    if (res.rowCount > 0) {
                        console.log(` ✅ [${table}] Deleted ${res.rowCount} records.`);
                    }
                } catch (err) {
                    console.error(` ❌ [${table}] Error: ${err.message}`);
                    throw err;
                }
            }
        }

        await client.query('COMMIT');
        console.log(`\n✨ Successfully updated ${schoolId} to ${newStatus}.`);
        if (newStatus !== 'Active') {
            console.log("   Note: Operational data has been purged.");
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("\n💥 Transaction rolled back due to error:", err.message);
    } finally {
        client.release();
        await pool.end();
        rl.close();
    }
}

console.log("--- InsightEd School Status Management ---");
rl.question("Enter the School ID: ", (schoolId) => {
    if (!schoolId.trim()) {
        console.error("❌ School ID is required.");
        rl.close();
        process.exit(1);
    }

    console.log("\nSelect Status:");
    console.log("1: Active");
    console.log("2: Archived");
    console.log("3: Inactive");
    
    rl.question("\nChoice (1-3): ", (choice) => {
        updateStatus(schoolId.trim(), choice.trim());
    });
});
