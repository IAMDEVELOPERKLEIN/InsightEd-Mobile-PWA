import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Robust .env parsing for UTF-16LE support (matching api/index.js logic)
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
    }
  } catch (e) {
    console.error("⚠️ Failed to manually parse .env:", e.message);
  }
}

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const CSV_PATH = path.join(__dirname, '../public/Teacher_Subject_Elem,JHS,SHS_2026.csv');

async function seed() {
  try {
    console.log('🚀 Starting Database Seeding...');

    // 1. Create Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ph_subjects (
        id SERIAL PRIMARY KEY,
        category TEXT,
        subject_name TEXT
      );
    `);
    console.log('✅ Table ph_subjects verified.');

    // 2. Truncate Table
    await pool.query('TRUNCATE TABLE ph_subjects RESTART IDENTITY CASCADE;');
    console.log('🧹 Table ph_subjects truncated.');

    // 3. Parse CSV
    const subjects = [];
    const categoriesMapping = {
      'ELEMENTARY': 'ELEMENTARY',
      'JHS': 'JHS',
      'SHS_CORE SUBJECTS': 'SHS_CORE',
      'SHS_APPLIED SUBJECTS': 'SHS_APPLIED',
      'SHS_SPECIALIZED SUBJECTS': 'SHS_SPECIALIZED'
    };

    const stream = fs.createReadStream(CSV_PATH).pipe(csv());

    for await (const row of stream) {
      for (const [csvHeader, dbCategory] of Object.entries(categoriesMapping)) {
        const value = row[csvHeader];
        if (value && value.trim()) {
          subjects.push({
            category: dbCategory,
            subject_name: value.trim()
          });
        }
      }
    }

    console.log(`📊 Parsed ${subjects.length} subject entries.`);

    // 4. Batch Insert
    if (subjects.length > 0) {
      // Build batch insert query
      const values = [];
      const placeholders = [];
      let counter = 1;

      for (const item of subjects) {
        placeholders.push(`($${counter++}, $${counter++})`);
        values.push(item.category, item.subject_name);
      }

      const query = `
        INSERT INTO ph_subjects (category, subject_name)
        VALUES ${placeholders.join(', ')};
      `;

      await pool.query(query, values);
      console.log(`✅ Successfully inserted ${subjects.length} records into ph_subjects.`);
    } else {
      console.warn('⚠️ No subjects found in CSV to insert.');
    }

  } catch (err) {
    console.error('❌ Seeding Error:', err);
  } finally {
    await pool.end();
    console.log('👋 Seeding process complete.');
  }
}

seed();
