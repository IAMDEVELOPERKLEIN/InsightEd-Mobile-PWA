import pg from 'pg';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/InsightEd-Mobile-PWA/.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting schools_IERN migration and data import...");

    // 1. Expand schema: Ensure all columns are TEXT to avoid truncation, add missing ones
    await client.query(`
      ALTER TABLE "schools_IERN" 
      ALTER COLUMN "Region" TYPE TEXT,
      ALTER COLUMN "Division" TYPE TEXT,
      ALTER COLUMN "District" TYPE TEXT,
      ALTER COLUMN "Barangay" TYPE TEXT,
      ALTER COLUMN "iern" TYPE TEXT,
      ALTER COLUMN "SchoolID" TYPE TEXT;

      ALTER TABLE "schools_IERN" 
      ADD COLUMN IF NOT EXISTS "Street_Address" TEXT,
      ADD COLUMN IF NOT EXISTS "Mother_School_ID" TEXT,
      ADD COLUMN IF NOT EXISTS "Province" TEXT,
      ADD COLUMN IF NOT EXISTS "Municipality" TEXT,
      ADD COLUMN IF NOT EXISTS "Legislative_District" TEXT;
    `);
    console.log("✅ Schema updated (all types to TEXT).");

    // 2. Clear existing table
    await client.query('TRUNCATE TABLE "schools_IERN" RESTART IDENTITY');
    console.log("✅ Table truncated.");

    // 3. Parse CSV
    const rows = [];
    const csvPath = 'e:/InsightEd-Mobile-PWA/public/schools_with_IERN.csv';

    await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('error', reject)
          .on('end', resolve);
    });

    console.log(`📦 Parsed ${rows.length} rows. Importing in batches of 50...`);

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const values = [];
      const placeholders = [];
      
      batch.forEach((row, idx) => {
        const baseIdx = idx * 14;
        placeholders.push(`($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, $${baseIdx + 8}, $${baseIdx + 9}, $${baseIdx + 10}, $${baseIdx + 11}, $${baseIdx + 12}, $${baseIdx + 13}, $${baseIdx + 14})`);
        
        const lat = row['Latitude'] && row['Latitude'].trim() !== '' ? parseFloat(row['Latitude']) : null;
        const lng = row['Longitude'] && row['Longitude'].trim() !== '' ? parseFloat(row['Longitude']) : null;

        values.push(
          row['iern'] || '',
          row['SchoolID'] || '',
          row['Region'] || '',
          row['Division'] || '',
          row['District'] || '',
          row['School.Name'] || '',
          row['Street.Address'] || '',
          row['Mother.School.ID'] || '',
          row['Province'] || '',
          row['Municipality'] || '',
          row['Legislative.District'] || '',
          row['Barangay'] || '',
          lat,
          lng
        );
      });

      const sql = `
        INSERT INTO "schools_IERN" (
          "iern", "SchoolID", "Region", "Division", "District", 
          "School_Name", "Street_Address", "Mother_School_ID", 
          "Province", "Municipality", "Legislative_District", 
          "Barangay", "Latitude", "Longitude"
        ) VALUES ${placeholders.join(', ')}
      `;

      try {
        await client.query(sql, values);
        if (i % 5000 === 0) console.log(`Processed ${i} rows...`);
      } catch (batchErr) {
        console.error(`❌ Error in batch starting at row ${i}:`, batchErr.message);
        throw batchErr;
      }
      
      // Keep connection fresh but don't overwhelm
      if (i % 1000 === 0) await new Promise(resolve => setTimeout(resolve, 20));
    }

    console.log("✨ Data import completed successfully!");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
