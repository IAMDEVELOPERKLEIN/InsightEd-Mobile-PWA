import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchoolDoc(schoolId) {
  try {
    const res = await pool.query(
      'SELECT pending_id, school_id, doc_type, binary_id, file_path, file_size, original_size, hydra_manifest FROM school_documents WHERE school_id = $1',
      [schoolId]
    );
    const row = res.rows[0];
    if (row) {
      console.log(`School ID: ${row.school_id}`);
      console.log(`File Size: ${row.file_size}`);
      console.log(`Original Size: ${row.original_size}`);
      console.log(`Binary ID: ${row.binary_id}`);
      
      const binRes = await pool.query('SELECT size_bytes, mime_type FROM unified_binaries WHERE id = $1', [row.binary_id]);
      if (binRes.rows.length > 0) {
        console.log(`Unified Binaries Size: ${binRes.rows[0].size_bytes}`);
        console.log(`Mime Type: ${binRes.rows[0].mime_type}`);
      }

      if (row.hydra_manifest) {
        console.log(`Hydra Shards: ${row.hydra_manifest.length}`);
        const firstShard = row.hydra_manifest[0];
        const shardBinRes = await pool.query('SELECT size_bytes FROM unified_binaries WHERE id = $1', [firstShard.binary_id]);
        if (shardBinRes.rows.length > 0) {
          console.log(`First Shard Size: ${shardBinRes.rows[0].size_bytes}`);
        }
      }
    } else {
      console.log("No record found for School ID 999999");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchoolDoc('999999');
