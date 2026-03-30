import fs from 'fs';

const filePath = 'api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove all calculateSchoolProgress calls and any related single-line if blocks
// Pattern: if (condition) await calculateSchoolProgress(schoolId, pool);
content = content.replace(/if\s*\(.*?\)\s*await\s*calculateSchoolProgress\(.*?\);?/g, '/* Removed calculateSchoolProgress dual-write */');
content = content.replace(/await\s*calculateSchoolProgress\(.*?\);?/g, '/* Removed calculateSchoolProgress */');
content = content.replace(/\/\/\s*calculateSchoolProgress removed/g, '/* Truly removed now */');

// 2. Fix the specific broken if(poolNew) at line 6256 area
content = content.replace(/if\s*\(poolNew\)\s*\/\/\s*calculateSchoolProgress removed/g, '{ /* Removed dual-write calc */ }');

// 3. Remove orphaned catch blocks for calculateSchoolProgress if they are followed by nothing
// Actually, I'll just look for the pattern in 6256 more broadly.
content = content.replace(/try\s*\{\s*\/\*.*?\*\/\s*if\s*\(poolNew\)\s*\{\s*\/\*.*?\*\/\s*\}\s*\}\s*catch\s*\(calcErr\)\s*\{\s*.*?\s*\}/gs, '/* Removed progress initialization block */');

fs.writeFileSync(filePath, content);
console.log("Improved clean sweep of api/index.js completed.");
