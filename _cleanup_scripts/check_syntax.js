import fs from 'fs';
const content = fs.readFileSync('api/index.js', 'utf8');

let braces = 0;
let brackets = 0;
let parens = 0;
let backticks = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '[') brackets++;
    if (char === ']') brackets--;
    if (char === '(') parens++;
    if (char === ')') parens--;
    if (char === '`') backticks++;
}

console.log('Braces balance:', braces);
console.log('Brackets balance:', brackets);
console.log('Parens balance:', parens);
console.log('Backticks balance:', backticks % 2 === 0 ? 'even' : 'ODD!');
