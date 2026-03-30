/**
 * MIGRATION: Backfill users.school_id + users.iern from email prefix
 *
 * Phase 1 of registration_restructuring_plan.md
 *
 * Targets School Head users whose email is <schoolID>@deped.gov.ph
 * but whose school_id / iern columns were never populated.
 *
 * Run in DRY RUN mode first (default), then pass --execute to commit.
 *
 * Usage:
 *   node tmp/migrate_backfill_users.js           # dry-run
 *   node tmp/migrate_backfill_users.js --execute  # live run
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
        console.log(`\n=== BACKFILL MIGRATION: users.school_id + users.iern ===`);
        console.log(`Mode: ${isDryRun ? 'DRY RUN (pass --execute to apply)' : '*** LIVE EXECUTION ***'}\n`);

        // --- AUDIT: Show current state ---
        const auditRes = await client.query(`
            SELECT count(*) AS total_school_heads,
                   count(*) FILTER (WHERE school_id IS NOT NULL) AS already_has_school_id,
                   count(*) FILTER (WHERE school_id IS NULL AND email LIKE '%@deped.gov.ph') AS candidates
            FROM users
            WHERE role = 'School Head'
        `);
        const audit = auditRes.rows[0];
        console.log(`Current state:`);
        console.log(`  Total School Heads:          ${audit.total_school_heads}`);
        console.log(`  Already have school_id:      ${audit.already_has_school_id}`);
        console.log(`  Candidates (email-prefix):   ${audit.candidates}\n`);

        // --- FIND MAPPABLE USERS ---
        const mappableRes = await client.query(`
            SELECT u.uid, u.email, SPLIT_PART(u.email, '@', 1) AS email_prefix,
                   s."SchoolID" AS school_id, s.iern,
                   s."School_Name" AS school_name, s."Region" AS region,
                   s."Division" AS division, s."Province" AS province,
                   s."Municipality" AS municipality, s."District" AS district,
                   s."Latitude" AS latitude, s."Longitude" AS longitude
            FROM users u
            JOIN "schools_IERN" s ON s."SchoolID" = SPLIT_PART(u.email, '@', 1)
            WHERE u.role = 'School Head'
              AND u.school_id IS NULL
              AND u.email LIKE '%@deped.gov.ph'
            ORDER BY u.email
        `);

        console.log(`Mappable users found: ${mappableRes.rows.length}`);
        if (mappableRes.rows.length === 0) {
            console.log('Nothing to backfill. Exiting.');
            return;
        }

        // Show a sample
        const sample = mappableRes.rows.slice(0, 5);
        console.log('\nSample (first 5):');
        sample.forEach(r => console.log(`  ${r.email} → school_id: ${r.school_id}, iern: ${r.iern}, name: ${r.school_name}`));
        console.log('');

        if (isDryRun) {
            console.log('DRY RUN: No changes made. Run with --execute to apply.');
            return;
        }

        // --- EXECUTE: Backfill users ---
        await client.query('BEGIN');

        const updateRes = await client.query(`
            UPDATE users u
            SET school_id = s."SchoolID",
                iern      = s.iern
            FROM "schools_IERN" s
            WHERE s."SchoolID" = SPLIT_PART(u.email, '@', 1)
              AND u.role = 'School Head'
              AND u.school_id IS NULL
              AND u.email LIKE '%@deped.gov.ph'
        `);
        console.log(`✅ Updated users.school_id / iern: ${updateRes.rowCount} rows`);

        // --- EXECUTE: Hydrate ph_schools for newly-linked users ---
        // Insert ph_schools entries for any backfilled user that doesn't already have one.
        const hydrateRes = await client.query(`
            INSERT INTO ph_schools (
                school_id, school_name, region, province, municipality,
                division, district, iern, updated_at, unit1, unit1_completed
            )
            SELECT s."SchoolID", s."School_Name", s."Region", s."Province", s."Municipality",
                   s."Division", s."District", s.iern, CURRENT_TIMESTAMP, 0, FALSE
            FROM "schools_IERN" s
            JOIN users u ON u.school_id = s."SchoolID"
            WHERE u.role = 'School Head'
            ON CONFLICT (school_id) DO NOTHING
        `);
        console.log(`✅ Hydrated ph_schools (new entries): ${hydrateRes.rowCount} rows`);

        await client.query('COMMIT');
        console.log('\n✅ Migration complete. Verify with: node tmp/check_mapping_final.js');

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
