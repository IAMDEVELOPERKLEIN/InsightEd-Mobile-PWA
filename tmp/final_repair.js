const fs = require('fs');
const path = 'c:\\Users\\KleinZebastianCatapa\\Documents\\INSIGHTEDCODES2026\\api\\index.js';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

let startIdx = -1;
let endIdx = -1;

// Look for the corruption bridge around 6030
for (let i = 6020; i < 6080; i++) {
    if (lines[i].includes('});') && lines[i+1].trim() === '' && lines[i+4].includes('res.json({')) {
        startIdx = i + 1;
    }
    if (lines[i].includes('app.get(\'/api/users/:uid\'')) {
        endIdx = i - 1;
    }
}

console.log(`Computed startIdx: ${startIdx}, endIdx: ${endIdx}`);

if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    console.log('Confirmed! Removing lines...');
    const newLines = [
        ...lines.slice(0, startIdx),
        '',
        '// --- 3f. GET: Fetch User Profile by UID ---',
        ...lines.slice(endIdx + 1)
    ];
    fs.writeFileSync(path, newLines.join('\n'));
    console.log('Success: api/index.js repaired.');
} else {
    console.log('Printing lines 6020-6060 for debug:');
    for (let i = 6020; i < 6060; i++) {
        console.log(`${i+1}: [${lines[i]}]`);
    }
    process.exit(1);
}
