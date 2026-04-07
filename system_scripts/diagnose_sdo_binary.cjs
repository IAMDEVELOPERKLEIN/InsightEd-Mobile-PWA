const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function diagnose() {
    console.log("🔍 [SDO-Diag] Starting SDO Binary Storage Health Audit...");
    try {
        // 1. Check for records with binary_id
        const res = await pool.query(`
            SELECT id, pending_id, school_id, doc_type, binary_id, file_path, file_size 
            FROM school_documents 
            WHERE binary_id IS NOT NULL 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        if (res.rows.length === 0) {
            console.log("ℹ️ [SDO-Diag] No binary records found yet. (Expected if no new uploads occurred).");
        } else {
            console.log(`✅ [SDO-Diag] Found ${res.rows.length} binary records.`);
            for (const row of res.rows) {
                console.log(`   - ID: ${row.id} | SID: ${row.school_id || 'Pending'} | Binary: ${row.binary_id} | Size: ${row.file_size}B`);
                
                // 2. Verify binary exists in unified_binaries
                const binCheck = await pool.query('SELECT id, size_bytes FROM unified_binaries WHERE id = $1', [row.binary_id]);
                if (binCheck.rows.length > 0) {
                    console.log(`     ✓ Binary verified in unified_binaries (${binCheck.rows[0].size_bytes}B)`);
                } else {
                    console.error(`     ❌ CRITICAL: Binary ID ${row.binary_id} missing from unified_binaries!`);
                }
            }
        }

        // 3. Check for legacy records
        const legacyRes = await pool.query(`
            SELECT COUNT(*) 
            FROM school_documents 
            WHERE binary_id IS NULL AND file_data IS NOT NULL
        `);
        console.log(`ℹ️ [SDO-Diag] Legacy Base64 records: ${legacyRes.rows[0].count}`);

    } catch (err) {
        console.error("❌ [SDO-Diag] Diagnostic failed:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

diagnose();
