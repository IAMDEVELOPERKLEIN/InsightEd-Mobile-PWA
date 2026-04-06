#!/usr/bin/env node
/**
 * binary_health_audit.cjs
 * Unified Binary Storage Health Audit
 *
 * Reports:
 *  1. Compression Dividend  — total bytes saved by WebP conversion
 *  2. Deduplication Efficiency — duplicate uploads prevented by SHA-256
 *  3. MIME-type consistency across the binary registry
 *  4. Linkage integrity — engineer_image rows pointing to /api/asset/ with valid binary_id
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('\n=== Unified Binary Storage Health Audit ===\n');

        // 1. Compression Dividend
        const compressionRes = await client.query(`
            SELECT
                COUNT(*) AS total_binaries,
                SUM(size_bytes) AS total_stored_bytes,
                AVG(size_bytes) AS avg_size_bytes,
                MIN(size_bytes) AS min_size_bytes,
                MAX(size_bytes) AS max_size_bytes
            FROM unified_binaries
        `);
        const cr = compressionRes.rows[0];
        console.log('--- 1. Binary Registry Summary ---');
        console.log(`  Total binaries:    ${cr.total_binaries}`);
        console.log(`  Total stored:      ${(cr.total_stored_bytes / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Avg size:          ${(cr.avg_size_bytes / 1024).toFixed(1)} KB`);
        console.log(`  Min / Max:         ${(cr.min_size_bytes / 1024).toFixed(1)} KB / ${(cr.max_size_bytes / 1024).toFixed(1)} KB`);

        // 2. Deduplication Efficiency (engineer_image rows that resolved to existing hash)
        const dedupRes = await client.query(`
            SELECT
                COUNT(*) AS total_image_rows,
                COUNT(binary_id) AS rows_with_binary_id,
                COUNT(*) - COUNT(DISTINCT binary_id) AS potential_deduplicated_rows
            FROM engineer_image
            WHERE binary_id IS NOT NULL
        `);
        const dr = dedupRes.rows[0];
        console.log('\n--- 2. Deduplication Efficiency ---');
        console.log(`  Total image rows with binary_id: ${dr.rows_with_binary_id}`);
        console.log(`  Potential dedup saves:           ${dr.potential_deduplicated_rows} rows pointing to reused binaries`);

        // 3. MIME-type Consistency
        const mimeRes = await client.query(`
            SELECT mime_type, COUNT(*) AS count
            FROM unified_binaries
            GROUP BY mime_type
            ORDER BY count DESC
        `);
        console.log('\n--- 3. MIME-type Distribution ---');
        mimeRes.rows.forEach(r => {
            console.log(`  ${r.mime_type.padEnd(25)} ${r.count} entries`);
        });

        const nonWebpImages = mimeRes.rows.filter(r =>
            r.mime_type.startsWith('image/') && r.mime_type !== 'image/webp'
        );
        if (nonWebpImages.length > 0) {
            console.log('\n  ⚠️  Non-WebP images detected (should have been converted):');
            nonWebpImages.forEach(r => console.log(`     ${r.mime_type}: ${r.count}`));
        } else {
            console.log('\n  ✅ All images stored as WebP.');
        }

        // 4. Linkage Integrity
        const linkageRes = await client.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(CASE WHEN image_data LIKE '/api/asset/%' AND binary_id IS NOT NULL THEN 1 END) AS linked_correctly,
                COUNT(CASE WHEN image_data LIKE '/api/asset/%' AND binary_id IS NULL   THEN 1 END) AS asset_url_no_binary_id,
                COUNT(CASE WHEN image_data NOT LIKE '/api/asset/%'                     THEN 1 END) AS legacy_paths
            FROM engineer_image
        `);
        const lr = linkageRes.rows[0];
        console.log('\n--- 4. engineer_image Linkage Integrity ---');
        console.log(`  Total rows:                 ${lr.total}`);
        console.log(`  Linked to unified_binaries: ${lr.linked_correctly}`);
        console.log(`  /api/asset/ but no binary_id: ${lr.asset_url_no_binary_id}`);
        console.log(`  Legacy paths (Azure/disk/b64): ${lr.legacy_paths}`);

        // 5. Orphan check — unified_binaries not referenced by any engineer_image
        const orphanRes = await client.query(`
            SELECT COUNT(*) AS orphans
            FROM unified_binaries ub
            LEFT JOIN engineer_image ei ON ei.binary_id = ub.id
            WHERE ei.binary_id IS NULL
        `);
        console.log(`\n  Orphaned binaries (no image row): ${orphanRes.rows[0].orphans}`);

        console.log('\n=== Audit Complete ===\n');
    } catch (err) {
        console.error('❌ Audit failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
