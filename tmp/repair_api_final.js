
import fs from 'fs';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/index.js';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Standard login old block: 3832 to 3878 inclusive
// Actually, let's look at the content to be sure.
// Line 3832 is usually blank or a stray brace.
// Line 3833 is "  let targetEmail = email.trim();"
// Line 3877 is "});"

const linesToRemove = new Set();
for (let i = 3832; i <= 3878; i++) linesToRemove.add(i);

const newLines = lines.filter((_, index) => !linesToRemove.has(index + 1));

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log("Old standard login block removed.");
