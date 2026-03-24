import fs from 'fs';
const content = fs.readFileSync('api/index.js', 'utf8');

// Find the second occurrence of the engineer_form INSERT (for update-project)
const startKeyword = 'INSERT INTO "engineer_form" (';
const firstIndex = content.indexOf(startKeyword);
const startIndex = content.indexOf(startKeyword, firstIndex + 1);

if (startIndex === -1) {
    console.error('Could not find the INSERT statement');
    process.exit(1);
}

const endOfQuery = content.indexOf(';', startIndex);
const query = content.substring(startIndex, endOfQuery);

// Extract column list (text inside first set of parentheses)
const colMatch = query.match(/\(([^)]+)\)/);
const colStr = colMatch[1];
const columns = colStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

// Extract VALUES list (text inside parentheses after VALUES)
const valMatch = query.match(/VALUES\s*\(([^)]+)\)/);
const valStr = valMatch[1];
const values = valStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

console.log('--- Engineer Form INSERT Analysis ---');
console.log('Total Columns Listed:', columns.length);
console.log('Total Placeholders Listed:', values.length);

if (columns.length !== values.length) {
    console.log('❌ MISMATCH FOUND!');
    console.log('Columns > Values:', columns.length > values.length);
} else {
    console.log('✅ Counts match!');
}

// Also check the projectValues array length in the same route
const routeStart = content.lastIndexOf('app.post(\'/api/save-project\'', startIndex);
const projectValuesStart = content.indexOf('const projectValues = [', routeStart);
const projectValuesEnd = content.indexOf('];', projectValuesStart);
const projectValuesStr = content.substring(projectValuesStart, projectValuesEnd + 2);

// Split by commas, but handle nested calls like parseNumberOrNull(a || b)
// This is a rough count
const projectValuesCount = projectValuesStr.split(',').length;
console.log('Rough projectValues array count:', projectValuesCount);
