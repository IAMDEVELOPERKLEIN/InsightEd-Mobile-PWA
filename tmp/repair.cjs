const fs = require('fs');
const path = 'c:\\Users\\KleinZebastianCatapa\\Documents\\INSIGHTEDCODES2026\\api\\index.js';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

// Remove lines from 6033 to 6047 (1-indexed)
const startLineIdx = 6032; 
const endLineIdx = 6046;

console.log('Line ' + (startLineIdx + 1) + ': [' + lines[startLineIdx] + ']');
console.log('Line ' + (endLineIdx + 1) + ': [' + lines[endLineIdx] + ']');

const newLines = [
    ...lines.slice(0, startLineIdx),
    '',
    ...lines.slice(endLineIdx + 1)
];

fs.writeFileSync(path, newLines.join('\n'));
console.log('Done.');
