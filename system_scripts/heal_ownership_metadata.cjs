#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log('🚀 Starting forensic healing of school_ownership_docs metadata...');

        // 1. Backfill school_id from ph_schools
        console.log('--- Step 1: Backfilling school_id ---');
        const schoolIdUpdate = await pool.query(`
            UPDATE school_ownership_docs d
            SET school_id = s.school_id
            FROM ph_schools s
            WHERE (d.iern = s.iern OR d.iern = s.school_id)
              AND d.school_id IS NULL;
        `);
        console.log(`✅ Updated ${schoolIdUpdate.rowCount} rows with missing school_id.`);

        // 2. Backfill file_size from unified_binaries (stored/compressed size)
        console.log('--- Step 2: Backfilling file_size ---');
        const fileSizeUpdate = await pool.query(`
            UPDATE school_ownership_docs d
            SET file_size = b.size_bytes
            FROM unified_binaries b
            WHERE d.binary_id = b.id
              AND d.file_size IS NULL
              AND b.size_bytes IS NOT NULL;
        `);
        console.log(`✅ Updated ${fileSizeUpdate.rowCount} rows with missing file_size (from binaries).`);

        // 3. Backfill original_size directly from unified_binaries where binary_id is known.
        //    This is the most accurate path: binary reference → stored size → original_size.
        //    For legacy data we have no pre-compression size, so stored size is the best proxy.
        console.log('--- Step 3: Backfilling original_size via binary_id (direct path) ---');
        const origFromBinaryUpdate = await pool.query(`
            UPDATE school_ownership_docs d
            SET original_size = b.size_bytes
            FROM unified_binaries b
            WHERE d.binary_id = b.id
              AND d.original_size IS NULL
              AND b.size_bytes IS NOT NULL;
        `);
        console.log(`✅ Updated ${origFromBinaryUpdate.rowCount} rows with missing original_size (direct from binaries).`);

        // 4. Backfill original_size from file_size for any remaining NULL rows
        //    (covers rows that have file_size but no binary_id, e.g. legacy disk storage)
        console.log('--- Step 4: Backfilling original_size from file_size (fallback path) ---');
        const originalSizeUpdate = await pool.query(`
            UPDATE school_ownership_docs
            SET original_size = file_size
            WHERE original_size IS NULL AND file_size IS NOT NULL;
        `);
        console.log(`✅ Updated ${originalSizeUpdate.rowCount} rows with missing original_size (copied from file_size).`);

        // 5. Final Audit
        const audit = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE school_id IS NULL) as missing_sid,
                COUNT(*) FILTER (WHERE file_size IS NULL) as missing_fs,
                COUNT(*) FILTER (WHERE original_size IS NULL) as missing_os,
                COUNT(*) FILTER (WHERE binary_id IS NULL) as no_binary,
                COUNT(*) FILTER (WHERE original_size IS NULL AND binary_id IS NULL AND file_size IS NULL) as unrecoverable,
                COUNT(*) FILTER (WHERE hydra_manifest IS NULL AND (file_size > 1572864 OR original_size > 1572864)) as missing_hydra_large
            FROM school_ownership_docs;
        `);

        console.log('\n--- Final Audit Report ---');
        console.table(audit.rows);

        const { missing_fs, missing_os, unrecoverable } = audit.rows[0];
        if (missing_fs > 0) {
            console.warn(`⚠️  ${missing_fs} rows still missing file_size (likely legacy disk storage with no binary reference).`);
        }
        if (missing_os > 0) {
            console.warn(`⚠️  ${missing_os} rows still missing original_size.`);
        }
        if (unrecoverable > 0) {
            console.error(`❌ ${unrecoverable} rows are unrecoverable: no binary_id AND no file_size. These were stored via disk fallback and the file metadata was never recorded.`);
        }

    } catch (e) {
        console.error('❌ Forensic healing failed:', e.message);
    } finally {
        await pool.end();
    }
}

main();
