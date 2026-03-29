# Implementation Plan: Seed 1000 Test Schools with Coordinates

The goal is to seed 1000 test schools (IDs 999000–999999) in the `schools_IERN` table with "Blank" location data and random Philippines-based coordinates. This expands the previous test set and ensures all entries have valid latitude/longitude to avoid registration errors.

## Proposed Changes

### Database Updates

#### [NEW] [seed_test_schools_v2.js](file:///e:/InsightEd-Mobile-PWA/api/seed_test_schools_v2.js)
Create a script to upsert 1000 test schools with random coordinates.

```javascript
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedExpandedTestSchools() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🌱 Seeding/Updating 1000 test schools (IDs 999000–999999)...');

        for (let id = 999000; id <= 999999; id++) {
            const lat = 4.5 + (Math.random() * 16.5);
            const lng = 116.0 + (Math.random() * 11.0);
            
            await client.query(
                `INSERT INTO \"schools_IERN\"
                    (\"SchoolID\", \"School_Name\", \"Region\", \"Division\", \"District\", \"Province\", \"Municipality\", \"Legislative_District\", \"iern\", \"Latitude\", \"Longitude\")
                 VALUES ($1, $2, 'Blank Region', 'Blank Division', 'Blank District', 'Blank Province', 'Blank Municipality', 'Blank District', $1, $3, $4)
                 ON CONFLICT (\"SchoolID\") DO UPDATE SET
                    \"Latitude\" = EXCLUDED.\"Latitude\",
                    \"Longitude\" = EXCLUDED.\"Longitude\"`,
                [id.toString(), `${id} Test School`, lat, lng]
            );
        }

        await client.query('COMMIT');
        console.log(`✅ Success: 1000 test schools are now seeded with coordinates.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during seeding:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}
seedExpandedTestSchools();
```

## Verification Plan

### Automated Verification
1.  Run the script: `node api/seed_test_schools_v2.js`
2.  Verify a sample:
    `node -e \"const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); pool.query('SELECT COUNT(*) FROM \\\"schools_IERN\\\" WHERE \\\"SchoolID\\\" >= \\'999000\\' AND \\\"SchoolID\\\" <= \\'999999\\' AND \\\"Latitude\\\" IS NOT NULL').then(r => { console.log(\\\"Count with coords:\\\", r.rows[0].count); pool.end(); })\"`

### Manual Verification
1.  Ask the user to register using a school ID from the new range (e.g., 999500).
2.  Confirm the "No Detail" error is resolved.
