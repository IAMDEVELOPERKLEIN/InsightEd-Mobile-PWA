
import fs from 'fs';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/index.js';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Duplicates are:
// setup-pin block from near 1582 to 1601
// pin-login block from near 1661 to 1722

// Let's remove them by checking for the specific dangling brace and surrounding context
// or just by line number ranges if they are stable.

// I'll use a more robust way: search for the specific markers.

const content = lines.join('\n');

// The problematic blocks start with "  }\n  \n  try {\n    const normalizedEmail = email.trim().toLowerCase();"
// and ends with "});"

// Let's just remove the exact ranges I identified from the view_file output.
// Lines are 1-indexed in view_file.

// First duplicate block: lines 1582 to 1602 (inclusive)
// Second duplicate block: lines 1661 to 1723 (inclusive)

// Note: after removing the first block, the second block's line numbers will shift.
// Or I can filter them out in one go.

const linesToRemove = new Set();
for (let i = 1582; i <= 1602; i++) linesToRemove.add(i);
for (let i = 1661; i <= 1723; i++) linesToRemove.add(i);

const newLines = lines.filter((_, index) => !linesToRemove.has(index + 1));

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log("Duplicated blocks removed successfully.");
