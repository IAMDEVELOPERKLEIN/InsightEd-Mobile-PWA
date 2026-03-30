
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const locationsJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'locations.json'), 'utf8'));

async function compareLocations() {
    try {
        console.log('Fetching all unique location combinations from schools_IERN...');
        const res = await pool.query('SELECT DISTINCT "Region", "Province", "Municipality", "Barangay" FROM "schools_IERN"');
        const dbLocations = res.rows.map(r => ({
            region: (r.Region || '').trim().toUpperCase(),
            province: (r.Province || '').trim().toUpperCase(),
            municipality: (r.Municipality || '').trim().toUpperCase(),
            barangay: (r.Barangay || '').trim().toUpperCase()
        }));

        console.log(`DB unique combinations: ${dbLocations.length}`);

        let jsonTotalCombinations = 0;
        let missingCount = 0;
        const missingExamples = [];

        for (const [region, provinces] of Object.entries(locationsJson)) {
            const upRegion = region.toUpperCase();
            for (const [province, cities] of Object.entries(provinces)) {
                const upProvince = province.toUpperCase();
                for (const [city, barangays] of Object.entries(cities)) {
                    const upCity = city.toUpperCase();
                    for (const barangay of barangays) {
                        const upBarangay = barangay.toUpperCase();
                        jsonTotalCombinations++;

                        const match = dbLocations.find(db => 
                            db.region === upRegion && 
                            db.province === upProvince && 
                            db.municipality === upCity && 
                            db.barangay === upBarangay
                        );

                        if (!match) {
                            missingCount++;
                            if (missingExamples.length < 10) {
                                missingExamples.push({ region, province, city, barangay });
                            }
                        }
                    }
                }
            }
        }

        console.log(`JSON total combinations: ${jsonTotalCombinations}`);
        console.log(`Combinations in JSON but NOT in DB: ${missingCount}`);
        console.log('Examples of missing locations:', missingExamples);

        // Also check naming mismatches for Regions
        const jsonRegions = Object.keys(locationsJson).map(r => r.toUpperCase());
        const dbRegionsRes = await pool.query('SELECT DISTINCT "Region" FROM "schools_IERN"');
        const dbRegions = dbRegionsRes.rows.map(r => (r.Region || '').trim().toUpperCase());

        console.log('\nRegion Naming Check:');
        console.log('JSON Regions:', jsonRegions);
        console.log('DB Regions:', dbRegions);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

compareLocations();
