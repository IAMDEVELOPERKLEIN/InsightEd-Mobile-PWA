const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCompressionHealth() {
  console.log("🔍 Checking Postgres Binary Storage Health (Compression Audit)...");
  
  try {
    const res = await pool.query('SELECT project_id, ipc, pow_pdf, dupa_pdf, contract_pdf FROM engineer_documents');
    let uncompressedCount = 0;
    let totalLeakedBytes = 0;

    res.rows.forEach(row => {
      ['pow_pdf', 'dupa_pdf', 'contract_pdf'].forEach(col => {
        const val = row[col];
        if (val && val.startsWith('data:application/pdf;base64,')) {
          uncompressedCount++;
          // Base64 size estimation (characters to bytes is roughly 3/4)
          const dataLength = val.split(',')[1].length;
          const estimatedBytes = Math.floor(dataLength * 0.75);
          totalLeakedBytes += estimatedBytes;
          console.warn(`⚠️ Uncompressed blob found: Project ${row.project_id} (IPC: ${row.ipc || 'N/A'}), Column: ${col}, ~${(estimatedBytes / 1024 / 1024).toFixed(2)} MB`);
        }
      });
    });

    console.log("\n--- Audit Summary ---");
    console.log(`Total Rows Analyzed: ${res.rows.length}`);
    console.log(`Uncompressed Documents: ${uncompressedCount}`);
    console.log(`Total Leaked Bytes: ${(totalLeakedBytes / 1024 / 1024).toFixed(2)} MB`);
    
    if (uncompressedCount === 0) {
      console.log("✅ All documents are correctly compressed and stored as file references.");
    } else {
      console.log("❌ Recommendation: Re-upload these documents or run a migration to compress existing blobs.");
    }
  } catch (err) {
    console.error("❌ Audit failed:", err);
  } finally {
    await pool.end();
  }
}

checkCompressionHealth();
