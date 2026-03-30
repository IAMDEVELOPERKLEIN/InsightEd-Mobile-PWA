import fs from 'fs';
const content = fs.readFileSync('api/index.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('school_profiles')) {
    console.log(`${i+1}: ${line}`);
  }
});
