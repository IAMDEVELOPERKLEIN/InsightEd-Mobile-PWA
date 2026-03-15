
import fs from 'fs';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/index.js';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// We want to remove the old dangling code.
// Based on the last view_file:
// Line 157: }); (Keep, ends the new endpoint)
// Line 158: \n (Remove)
// Lines 159-206: old code (Remove)
// Line 207: \n (Remove or Keep one)
// Line 208: // Health Check (Keep)

// Splitting by \n makes it 0-indexed.
// Line 158 is index 157.
// Line 207 is index 206.
// We want to remove indices 157 through 206.

lines.splice(157, 207 - 158 + 1); 

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log("Cleanup Complete.");
