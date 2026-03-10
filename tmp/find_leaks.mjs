import fs from 'fs';

const content = fs.readFileSync('api/index.js', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('pool.connect()')) {
        console.log(`Found pool.connect() on line ${i + 1}`);
        // Look ahead for release
        let foundRelease = false;
        let foundReturn = false;
        for (let j = i + 1; j < Math.min(i + 300, lines.length); j++) {
            if (lines[j].includes('.release()')) {
                foundRelease = true;
                break;
            }
            if (lines[j].includes('return res.') || lines[j].includes('res.json(') || lines[j].includes('res.status(')) {
                // If we hit a response before a release, it might be a leak
                // (unless it's in a block that eventually releases)
            }
        }
        if (!foundRelease) {
            console.log(`Potential LEAK around line ${i + 1}: No .release() found in next 300 lines.`);
        }
    }
}
