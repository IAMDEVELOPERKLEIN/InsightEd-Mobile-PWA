
import fs from 'fs';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Import
content = content.replace(
  "import { calculateSchoolProgress } from './progress_utils.js';",
  "import { calculateRigorousSchoolProgress } from './progress_utils.js';"
);

// 2. Update Calls
// We search for 'await calculateSchoolProgress(pool, schoolId)' and replace with 'await calculateRigorousSchoolProgress(pool, schoolId)'
// We use a global replace to be sure.
content = content.replace(
  /await calculateSchoolProgress\(pool, schoolId\)/g,
  "await calculateRigorousSchoolProgress(pool, schoolId)"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Renaming Complete.");
