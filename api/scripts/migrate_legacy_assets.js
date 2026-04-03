import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { upsertBinary } from '../utils/binaryPipeline.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const DRY_RUN = process.argv.includes('--commit') ? false : true;
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Table Mappings
const TARGETS = [
  { table: 'engineer_image', columns: ['image_data'], idCol: 'id' },
  { table: 'project_documents', columns: ['file_data'], idCol: 'id' },
  { table: 'school_ownership_docs', columns: ['file_path'], idCol: 'id' },
  { 
    table: 'engineer_documents', 
    columns: ['pow_pdf', 'dupa_pdf', 'contract_pdf', 'rta_pdf', 'moa_pdf'], 
    idCol: 'ipc' // engineer_documents is keyed by IPC
  }
];

async function migrate() {
  console.log(`\n🚀 [Postgres Migrator] Starting Legacy Asset Migration`);
  console.log(`📂 Source Directory: ${UPLOAD_ROOT}`);
  console.log(`🛡️  Mode: ${DRY_RUN ? 'DRY RUN (No DB updates)' : 'COMMIT (Live DB updates)'}`);
  if (DRY_RUN) console.log(`💡 Tip: Run with --commit to apply changes.\n`);

  let totalMigrated = 0;
  let totalBytesSaved = 0;
  let totalErrors = 0;

  for (const target of TARGETS) {
    console.log(`\n🔍 Auditing Table: ${target.table}...`);
    
    // Fetch specific columns to be safe
    const { rows } = await pool.query(`SELECT ${target.idCol}, ${target.columns.join(', ')} FROM ${target.table}`);
    console.log(`📊 Found ${rows.length} total rows in ${target.table}`);
    
    for (const row of rows) {
      for (const col of target.columns) {
        const legacyPath = row[col];
        
        // Log EVERYTHING for the first 10 rows or if it matches uploads
        if (rows.indexOf(row) < 5 || (legacyPath && legacyPath.includes('uploads'))) {
            console.log(`[DEBUG-RAW] ${target.table}.${col} [id:${row[target.idCol]}]: type=${typeof legacyPath} value="${legacyPath}"`);
        }
        
        // Normalize path resolution
        let fsRelative = legacyPath;
        if (!fsRelative || typeof fsRelative !== 'string') continue;

        // Handle JSON encoded paths (legacy format)
        if (fsRelative.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(fsRelative);
            fsRelative = parsed.image_data || parsed.file_path || fsRelative;
          } catch (e) {}
        }
        
        if (fsRelative.startsWith('/uploads/')) fsRelative = fsRelative.substring(9);
        else if (fsRelative.startsWith('uploads/')) fsRelative = fsRelative.substring(8);
        else continue; // Skip if it doesn't match uploads/
        
        let absolutePath = path.resolve(UPLOAD_ROOT, fsRelative);
        
        const exists = fs.existsSync(absolutePath);
        if (legacyPath && legacyPath.includes('uploads')) {
            console.log(`[FLOW] ${target.table}.${col}: Path="${absolutePath}" Exists=${exists}`);
        }

        if (!exists) {
          // Fallback check for alternate locations
          const fallbackPath = path.resolve(__dirname, '../../uploads', fsRelative);
          const fallbackExists = fs.existsSync(fallbackPath);
          if (fallbackExists) {
            absolutePath = fallbackPath;
            console.log(`💡 [FLOW] Using Fallback Path: ${absolutePath}`);
          } else {
            console.warn(`[SKIP] Missing: ${absolutePath}`);
            continue;
          }
        }

        const binaryIdCol = target.table === 'engineer_documents' 
          ? col.replace('_pdf', '_binary_id') 
          : 'binary_id';

        if (DRY_RUN) console.log(`🔍 Checking ${target.table}.${col}: ${legacyPath}`);

        try {
          const buffer = fs.readFileSync(absolutePath);
          const mimeType = absolutePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
          
          if (!DRY_RUN) {
            const { binary_id, deduplicated, bytes_saved } = await upsertBinary(pool, buffer, mimeType);
            const newVal = `/api/asset/${binary_id}`;
            
            await pool.query(
              `UPDATE ${target.table} SET ${col} = $1, ${binaryIdCol} = $2 WHERE ${target.idCol} = $3`,
              [newVal, binary_id, row[target.idCol]]
            );
            
            totalMigrated++;
            totalBytesSaved += bytes_saved;
            console.log(`✅ [${target.table}] Migrated ${row[target.idCol]}: ${fsRelative} -> ${binary_id}`);
          } else {
            totalMigrated++;
            console.log(`📝 [DryRun] Would migrate ${target.table}.${col}: ${fsRelative}`);
          }
        } catch (err) {
          totalErrors++;
          console.error(`❌ [${target.table}] Error migrating ${row[target.idCol]}:`, err.message);
        }
      }
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`- Assets Processed: ${totalMigrated}`);
  console.log(`- Errors: ${totalErrors}`);
  if (!DRY_RUN) console.log(`- Bytes Saved: ${(totalBytesSaved / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`\n🎉 Done.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
