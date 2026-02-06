
import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE_PATH = path.join(__dirname, '../public/schools.csv');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sanitizeColumnName = (name) => {
    return name.trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_') // Replace non-alphanumeric with _
        .replace(/_+/g, '_')         // Collapse multiple _
        .replace(/^_|_$/g, '');      // Trim _
};

const importSchools = async () => {
    const client = await pool.connect();
    console.log("🔌 Connected to Database");

    const results = [];
    let headers = [];

    // 1. Read CSV to get Headers and Data
    console.log(`📖 Reading CSV from ${CSV_FILE_PATH}...`);

    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('headers', (headerList) => {
            headers = headerList.map(h => ({
                original: h,
                sanitized: sanitizeColumnName(h)
            }));
            console.log("📝 Detected Headers:", headers.map(h => h.sanitized).join(', '));
        })
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log(`✅ CSV Read Complete. Rows: ${results.length}`);

            try {
                // 2. Create Table
                // Ensure school_id is primary key if present
                const columnDefs = headers.map(h => {
                    const type = h.sanitized === 'school_id' ? 'TEXT PRIMARY KEY' : 'TEXT';
                    return `${h.sanitized} ${type}`;
                });

                const createTableSQL = `
                    DROP TABLE IF EXISTS schools;
                    CREATE TABLE schools (
                        ${columnDefs.join(',\n                        ')}
                    );
                `;

                console.log("🛠 Creating Table `schools`...");
                await client.query(createTableSQL);
                console.log("✅ Table Created!");

                // 3. Insert Data
                // Batch insert logic could be added here, but for simplicity we'll do single inserts or large INSERT statement.
                // Given ~47k rows, single INSERTs might be slow. Let's do batches of 1000.

                const BATCH_SIZE = 500;
                let insertedCount = 0;

                for (let i = 0; i < results.length; i += BATCH_SIZE) {
                    const batch = results.slice(i, i + BATCH_SIZE);
                    const values = [];
                    const valuePlaceholders = [];

                    batch.forEach((row, rowIndex) => {
                        const rowValues = headers.map(h => row[h.original]);

                        // Construct ($1, $2, ...), ($10, $11, ...)
                        const placeholders = headers.map((_, colIndex) => `$${(rowIndex * headers.length) + colIndex + 1}`);
                        valuePlaceholders.push(`(${placeholders.join(', ')})`);
                        values.push(...rowValues);
                    });

                    const batchInsertSQL = `
                        INSERT INTO schools (${headers.map(h => h.sanitized).join(', ')})
                        VALUES ${valuePlaceholders.join(', ')}
                    `;

                    await client.query(batchInsertSQL, values);
                    insertedCount += batch.length;
                    process.stdout.write(`\r📥 Imported ${insertedCount} / ${results.length} schools...`);
                }

                console.log("\n✅ Import Finished Successfully!");

            } catch (err) {
                console.error("\n❌ Import Failed:", err);
            } finally {
                client.release();
                pool.end();
            }
        });
};

importSchools();
