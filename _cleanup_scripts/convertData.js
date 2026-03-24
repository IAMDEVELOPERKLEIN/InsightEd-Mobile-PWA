const fs = require('fs');
const csv = require('csv-parser');

const results = {};
const inputFile = 'schools.csv'; // Ensure your CSV is named this
const outputFile = 'public/schools-db.json';

// Mapping based on your CSV headers
const COLUMN_MAP = {
    id: 'SchoolID',
    name: 'School.Name',
    region: 'Region',
    division: 'Division',
    district: 'District',
    province: 'Province',
    municipality: 'Municipality',
    legDistrict: 'Legislative.District',
    barangay: 'Barangay'
    // Note: Latitude, Longitude, and Street.Address are excluded 
    // from the auto-fill DB as requested (Manual Entry)
};

let rowCount = 0;

console.log("Processing CSV...");

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (data) => {
    const schoolId = data[COLUMN_MAP.id];

    if (schoolId) {
        results[schoolId] = {
            schoolName: data[COLUMN_MAP.name] || '',
            region: data[COLUMN_MAP.region] || '',
            division: data[COLUMN_MAP.division] || '',
            district: data[COLUMN_MAP.district] || '',
            province: data[COLUMN_MAP.province] || '',
            municipality: data[COLUMN_MAP.municipality] || '',
            legDistrict: data[COLUMN_MAP.legDistrict] || '',
            barangay: data[COLUMN_MAP.barangay] || ''
        };
        rowCount++;
    }
  })
  .on('end', () => {
    // Ensure directory exists
    if (!fs.existsSync('public')){
        fs.mkdirSync('public');
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(results));
    console.log(`✅ Success! Converted ${rowCount} schools.`);
    console.log(`📂 Database saved to: ${outputFile}`);
  });