import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Canonical category mapping: variant → standard name
const CATEGORY_MAP = {
    // New Construction
    'NEW CONSTRUCTION': 'New Construction',
    'new construction': 'New Construction',

    // Repair and Rehab
    'REPAIR': 'Repair and Rehab',
    'REPAIR AND REHAB': 'Repair and Rehab',
    'repair': 'Repair and Rehab',
    'repair and rehab': 'Repair and Rehab',

    // Last Mile Schools
    'LMS': 'Last Mile Schools',
    'LAST MILE SCHOOLS': 'Last Mile Schools',
    'last mile schools': 'Last Mile Schools',

    // Health facilities
    'HEALTH FACILITIES': 'Health facilities',
    'SCHOOL HEALTH FACILITIES': 'Health facilities',
    'health facilities': 'Health facilities',
    'school health facilities': 'Health facilities',

    // Gabaldon Restoration
    'GABALDON': 'Gabaldon Restoration',
    'GABALDON RESTORATION': 'Gabaldon Restoration',
    'gabaldon': 'Gabaldon Restoration',
    'gabaldon restoration': 'Gabaldon Restoration',

    // Library Hub
    'LIBRARY HUB': 'Library Hub',
    'library hub': 'Library Hub',

    // SpEd / ILRC
    'ILRC': 'SpEd Inclusive Learning Resource Centers (ILRC)',
    'ilrc': 'SpEd Inclusive Learning Resource Centers (ILRC)',
    'SPED INCLUSIVE LEARNING RESOURCE CENTERS (ILRC)': 'SpEd Inclusive Learning Resource Centers (ILRC)',

    // ALS-CLC
    'ALS-CLC': 'Alternative Learning System - Community Based Learning Centers (ALS-CLC)',
    'als-clc': 'Alternative Learning System - Community Based Learning Centers (ALS-CLC)',
    'ALS CLC': 'Alternative Learning System - Community Based Learning Centers (ALS-CLC)',

    // Electrification
    'ELECTRIFICATION': 'Electrification',
    'electrification': 'Electrification',

    // QRF (Quick Response Fund) - keep as standardized
    'QRF': 'QRF',
    'qrf': 'QRF',

    // Midrise School Building
    'MIDRISE SCHOOL BUILDING': 'Midrise School Building',
    'midrise school building': 'Midrise School Building',
};

async function run() {
    try {
        // Step 1: Show current state
        console.log('\n📊 BEFORE — Current distinct project_category values:');
        const before = await pool.query(
            `SELECT project_category, COUNT(*) as cnt 
             FROM engineer_form 
             WHERE project_category IS NOT NULL AND TRIM(project_category) != ''
             GROUP BY project_category ORDER BY project_category`
        );
        before.rows.forEach(r => console.log(`   [${r.cnt}] "${r.project_category}"`));
        console.log(`   Total distinct values: ${before.rows.length}\n`);

        // Step 2: Build and execute UPDATE statements
        let totalUpdated = 0;
        for (const [variant, canonical] of Object.entries(CATEGORY_MAP)) {
            // Skip if the variant IS the canonical (no change needed)
            if (variant === canonical) continue;

            const result = await pool.query(
                `UPDATE engineer_form SET project_category = $1 WHERE TRIM(project_category) = $2 AND project_category != $1`,
                [canonical, variant]
            );
            if (result.rowCount > 0) {
                console.log(`   ✅ "${variant}" → "${canonical}" (${result.rowCount} rows updated)`);
                totalUpdated += result.rowCount;
            }
        }

        // Step 3: Catch any remaining non-standard values via case-insensitive matching
        // Build a reverse lookup for case-insensitive matching
        const canonicalValues = [...new Set(Object.values(CATEGORY_MAP))];
        for (const canonical of canonicalValues) {
            const result = await pool.query(
                `UPDATE engineer_form SET project_category = $1 
                 WHERE UPPER(TRIM(project_category)) = UPPER($1) AND project_category != $1`,
                [canonical]
            );
            if (result.rowCount > 0) {
                console.log(`   ✅ Case-fix → "${canonical}" (${result.rowCount} rows updated)`);
                totalUpdated += result.rowCount;
            }
        }

        console.log(`\n🔧 Total rows updated: ${totalUpdated}`);

        // Step 4: Show final state
        console.log('\n📊 AFTER — Normalized project_category values:');
        const after = await pool.query(
            `SELECT project_category, COUNT(*) as cnt 
             FROM engineer_form 
             WHERE project_category IS NOT NULL AND TRIM(project_category) != ''
             GROUP BY project_category ORDER BY project_category`
        );
        after.rows.forEach(r => console.log(`   [${r.cnt}] "${r.project_category}"`));
        console.log(`   Total distinct values: ${after.rows.length}\n`);

        console.log('✅ Category normalization complete!');
    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
run();
