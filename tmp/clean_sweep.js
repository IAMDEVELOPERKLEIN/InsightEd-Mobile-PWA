import fs from 'fs';

const filePath = 'api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove all calculateSchoolProgress calls
content = content.replace(/await calculateSchoolProgress\(.*?\);?/g, '// calculateSchoolProgress removed');
content = content.replace(/calculateSchoolProgress\(.*?\)\.catch\(.*?\);?/g, '// calculateSchoolProgress removed');

// 2. Fix the specific mess around line 10335
const messTarget = `// --- 19. GET: Get Learning Modalities (DECOMMISSIONED) ---
app.post('/api/save-learning-modalities', async (req, res) => {`;
const messFix = `// --- 19. GET: Get Learning Modalities (DECOMMISSIONED) ---
app.get('/api/learning-modalities/:uid', async (req, res) => {
  res.status(410).json({ error: "Endpoint decommissioned. Modalities now part of Unit 4." });
});

// --- 20. POST: Save Learning Modalities (DECOMMISSIONED PRIMARY WRITE) ---
app.post('/api/save-learning-modalities', async (req, res) => {`;

if (content.includes(messTarget)) {
    content = content.replace(messTarget, messFix);
}

// 3. Comment out primary school_profiles updates (but keep them if they are in poolNew block for now)
// We'll just fix the ones we know about
content = content.replace(/UPDATE school_profiles/g, 'UPDATE ph_schools /* school_profiles decommissioned */');
content = content.replace(/SELECT \* FROM school_profiles/g, 'SELECT * FROM ph_schools /* school_profiles decommissioned */');

fs.writeFileSync(filePath, content);
console.log("Clean sweep of api/index.js completed.");
