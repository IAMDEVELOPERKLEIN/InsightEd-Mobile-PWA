/**
 * MIGRATION: Cull orphaned ph_schools rows
 *
 * Phase 3 of registration_restructuring_plan.md
 *
 * Removes ph_schools rows that have NO registered School Head
 * AND have no data entered (all unit columns = 0 / null).
 *
 * IMPORTANT: Run migrate_backfill_users.js --execute FIRST so that
 * email-prefix-matched users are linked before this cull runs.
 *
 * Run in DRY RUN mode first (default), then pass --execute to commit.
 *
 * Usage:
 *   node tmp/migrate_cull_ph_schools.js           # dry-run
 *   node tmp/migrate_cull_ph_schools.js --execute  # live run
 */

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

const isDryRun = !process.argv.includes('--execute');

async function run() {
    const client = await pool.connect();
    try {
        console.log(`\n=== CULL MIGRATION: orphaned ph_schools rows ===`);
        console.log(`Mode: ${isDryRun ? 'DRY RUN (pass --execute to apply)' : '*** LIVE EXECUTION ***'}\n`);

        // --- AUDIT: Current state ---
        const countRes = await client.query(`
            SELECT
                (SELECT count(*) FROM ph_schools) AS total_ph_schools,
                (SELECT count(*) FROM users WHERE role = 'School Head' AND school_id IS NOT NULL) AS registered_heads
        `);
        const { total_ph_schools, registered_heads } = countRes.rows[0];
        console.log(`Current state:`);
        console.log(`  ph_schools total:            ${total_ph_schools}`);
        console.log(`  Registered School Heads:     ${registered_heads}\n`);

        // --- IDENTIFY ORPHANS ---
        // Safe orphan = no registered head AND no data entered (unit1 through unit10 all 0/null)
        const orphanRes = await client.query(`
            SELECT count(*) AS orphan_count
            FROM ph_schools p
            WHERE p.school_id NOT IN (
                SELECT school_id FROM users
                WHERE role = 'School Head' AND school_id IS NOT NULL
            )
            AND COALESCE(p.unit1, 0) = 0
            AND COALESCE(p.unit2, 0) = 0
            AND COALESCE(p.unit3, 0) = 0
            AND COALESCE(p.unit4, 0) = 0
            AND COALESCE(p.unit5, 0) = 0
            AND COALESCE(p.unit6, 0) = 0
            AND COALESCE(p.unit7, 0) = 0
            AND COALESCE(p.unit8, 0) = 0
            AND COALESCE(p.unit9, 0) = 0
            AND COALESCE(p.unit10, 0) = 0
        `);
        const orphanCount = Number(orphanRes.rows[0].orphan_count);
        console.log(`Safe-to-delete orphans (no head, no data): ${orphanCount}`);

        // Also report schools with no head BUT with data (these will be KEPT)
        const hasDataNoHeadRes = await client.query(`
            SELECT count(*) AS count
            FROM ph_schools p
            WHERE p.school_id NOT IN (
                SELECT school_id FROM users
                WHERE role = 'School Head' AND school_id IS NOT NULL
            )
            AND (
                COALESCE(p.unit1, 0) > 0 OR COALESCE(p.unit2, 0) > 0 OR
                COALESCE(p.unit3, 0) > 0 OR COALESCE(p.unit4, 0) > 0 OR
                COALESCE(p.unit5, 0) > 0 OR COALESCE(p.unit6, 0) > 0 OR
                COALESCE(p.unit7, 0) > 0 OR COALESCE(p.unit8, 0) > 0 OR
                COALESCE(p.unit9, 0) > 0 OR COALESCE(p.unit10, 0) > 0
            )
        `);
        console.log(`Orphans with data (will be KEPT):          ${hasDataNoHeadRes.rows[0].count}\n`);

        if (orphanCount === 0) {
            console.log('No safe-to-delete orphans found. Exiting.');
            return;
        }

        // Show a sample of what would be deleted
        const sampleRes = await client.query(`
            SELECT p.school_id, p.school_name, p.division, p.region
            FROM ph_schools p
            WHERE p.school_id NOT IN (
                SELECT school_id FROM users
                WHERE role = 'School Head' AND school_id IS NOT NULL
            )
            AND COALESCE(p.unit1, 0) = 0
            AND COALESCE(p.unit2, 0) = 0
            AND COALESCE(p.unit3, 0) = 0
            AND COALESCE(p.unit4, 0) = 0
            AND COALESCE(p.unit5, 0) = 0
            AND COALESCE(p.unit6, 0) = 0
            AND COALESCE(p.unit7, 0) = 0
            AND COALESCE(p.unit8, 0) = 0
            AND COALESCE(p.unit9, 0) = 0
            AND COALESCE(p.unit10, 0) = 0
            LIMIT 5
        `);
        console.log('Sample orphans (first 5 that would be deleted):');
        sampleRes.rows.forEach(r =>
            console.log(`  ${r.school_id} | ${r.school_name} | ${r.division}`)
        );

        if (isDryRun) {
            console.log(`\nDRY RUN: Would delete ${orphanCount} rows from ph_schools.`);
            console.log('Run with --execute to apply. Ensure migrate_backfill_users.js ran first.');
            return;
        }

        // --- EXECUTE: Delete orphans ---
        await client.query('BEGIN');

        const deleteRes = await client.query(`
            DELETE FROM ph_schools
            WHERE school_id NOT IN (
                SELECT school_id FROM users
                WHERE role = 'School Head' AND school_id IS NOT NULL
            )
            AND COALESCE(unit1, 0) = 0
            AND COALESCE(unit2, 0) = 0
            AND COALESCE(unit3, 0) = 0
            AND COALESCE(unit4, 0) = 0
            AND COALESCE(unit5, 0) = 0
            AND COALESCE(unit6, 0) = 0
            AND COALESCE(unit7, 0) = 0
            AND COALESCE(unit8, 0) = 0
            AND COALESCE(unit9, 0) = 0
            AND COALESCE(unit10, 0) = 0
        `);

        await client.query('COMMIT');
        console.log(`\n✅ Deleted ${deleteRes.rowCount} orphaned rows from ph_schools.`);
        console.log('Verify with: node tmp/check_orphans.js');

    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Migration failed, rolled back:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
