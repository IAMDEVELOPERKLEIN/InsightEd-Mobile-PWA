import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('public/LMS-CY-2024-SAVINGS-DATABASED-as-of-March 3,UPDATED.xlsx');
const workbook = XLSX.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);

console.log('--- SHEET: LMS 2024 (First 500 rows) ---');
const ws = workbook.Sheets['LMS 2024'];
const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 });
if (sheetData.length > 0) {
    sheetData.slice(0, 500).forEach((row, i) => {
        if (row.length > 0) console.log(`Row ${i}:`, JSON.stringify(row));
    });
} else {
    console.log('No data found in sheet.');
}
process.exit(0);
