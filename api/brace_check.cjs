
const fs = require('fs');
const code = fs.readFileSync('e:/InsightEd-Mobile-PWA/api/index.js', 'utf8');

let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Very naive: doesn't handle strings/comments, but might give a clue
    // Let's filter out comments
    const cleanLine = line.split('//')[0];
    
    for (let char of cleanLine) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
    }
    
    if (braceCount < 0) {
        console.log(`Extra closing brace at line ${i + 1}`);
        braceCount = 0; // reset
    }
}

console.log(`Final brace count: ${braceCount}`);
console.log(`Final paren count: ${parenCount}`);
console.log(`Final bracket count: ${bracketCount}`);
