
import fs from 'fs';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/progress_utils.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace common unicode escape sequences introduced by tool
content = content.replace(/\\u003e/g, '>');
content = content.replace(/\\u003c/g, '<');
content = content.replace(/\\u0026/g, '&');
content = content.replace(/\\u003d/g, '=');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Characters Fixed.");
