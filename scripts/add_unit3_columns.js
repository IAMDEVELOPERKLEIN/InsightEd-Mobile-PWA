/**
 * add_unit3_columns.js
 * Adds all Unit 3 columns to ph_schools:
 *   - has_multigrade (BOOLEAN)
 *   - multigrade_details (JSONB)
 *   - Per-grade: sections_*, size_less_*, size_within_*, size_above_*
 *     for kinder, g1, g2, g3, g4, g5, g6
 *
 * Usage: node scripts/add_unit3_columns.js
 * Safe to re-run (uses IF NOT EXISTS).
 */

import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
  try {
    let envContent = fs.readFileSync('.env', 'utf16le');
    let match = envContent.match(/DATABASE_URL=(.+)/);
    if (!match) {
      envContent = fs.readFileSync('.env', 'utf8');
      match = envContent.match(/DATABASE_URL=(.+)/);
    }
    if (match) {
      dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
      process.env.DATABASE_URL = dbUrl;
    }
  } catch (e) {
    console.error('⚠️  Failed to parse .env manually:', e.message);
  }
}

if (!dbUrl) dbUrl = 'postgres://postgres:password@localhost:5432/postgres';

const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const GRADE_KEYS = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'];

const run = async () => {
  const client = await pool.connect();
  try {
    console.log('🔌  Connected. Running Unit 3 migration...');

    // 1. Multigrade flag + details
    await client.query(`
      ALTER TABLE ph_schools
        ADD COLUMN IF NOT EXISTS has_multigrade      BOOLEAN,
        ADD COLUMN IF NOT EXISTS multigrade_details  JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('✅  has_multigrade + multigrade_details ensured.');

    // 2. Per-grade section columns (sections, less-than, within, above)
    const alterParts = [];
    for (const g of GRADE_KEYS) {
      alterParts.push(
        `ADD COLUMN IF NOT EXISTS sections_${g}    INTEGER DEFAULT 0`,
        `ADD COLUMN IF NOT EXISTS size_less_${g}   INTEGER DEFAULT 0`,
        `ADD COLUMN IF NOT EXISTS size_within_${g} INTEGER DEFAULT 0`,
        `ADD COLUMN IF NOT EXISTS size_above_${g}  INTEGER DEFAULT 0`,
      );
    }
    await client.query(`ALTER TABLE ph_schools ${alterParts.join(', ')};`);
    console.log('✅  Per-grade section columns ensured (kinder – g6).');

    // 3. Verify
    const check = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ph_schools'
        AND column_name LIKE 'sections_%' OR column_name LIKE 'size_%'
           OR column_name IN ('has_multigrade','multigrade_details')
      ORDER BY column_name;
    `);
    console.log(`\n📋  Unit 3 columns in ph_schools (${check.rows.length} found):`);
    check.rows.forEach(r => console.log(`    • ${r.column_name} (${r.data_type})`));
    console.log('\n🎉  Unit 3 migration complete!\n');
  } catch (err) {
    console.error('❌  Migration error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
