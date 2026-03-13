
import fs from 'fs';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// --- Helper to replace an endpoint body ---
function replaceEndpointBody(routePath, newFunctionBody) {
    const routeStart = "app.get('" + routePath + "'";
    const startIndex = content.indexOf(routeStart);
    if (startIndex === -1) {
        console.error("Endpoint NOT found: " + routePath);
        return false;
    }

    // Find the end of the route (});)
    // We assume the route ends with }); at the start of a line or after some spacing
    // Looking for the NEXT }); after the startIndex
    const nextEnd = content.indexOf("});", startIndex);
    if (nextEnd === -1) {
        console.error("End of endpoint NOT found for: " + routePath);
        return false;
    }

    const fullOld = content.substring(startIndex, nextEnd + 3);
    
    // Construct the new endpoint
    // We keep the first part (header) if it contains middleware, etc.
    // The header ends at the start of the arrow function body
    const bodyStart = content.indexOf("=> {", startIndex);
    if (bodyStart === -1 || bodyStart > nextEnd) {
        console.error("Body start NOT found for: " + routePath);
        return false;
    }
    
    const header = content.substring(startIndex, bodyStart + 4);
    const fullNew = header + newFunctionBody + "\n});";
    
    content = content.replace(fullOld, fullNew);
    console.log("Successfully patched: " + routePath);
    return true;
}

// --- 1. Patch Activity Endpoint ---
const activityBody = `
  const { schoolId } = req.params;
  try {
    const progress = await calculateSchoolProgress(pool, schoolId);
    if (!progress) return res.status(404).json({ error: "School not found" });

    const totalUnits = 9; 
    let completedFlags = {};
    for (let i = 1; i <= totalUnits; i++) {
        completedFlags[\`unit\${i}\`] = progress.completedUnits.includes(i);
    }

    const sprintRes = await pool.query(
      \`SELECT unit_id, duration_seconds FROM ph_performance_logs 
       WHERE school_id = $1 ORDER BY duration_seconds ASC LIMIT 1\`,
      [schoolId]
    );
    let fastest_sprint = null;
    if (sprintRes.rows.length > 0) {
      const r = sprintRes.rows[0];
      fastest_sprint = { unit: r.unit_id, time_text: \`\${Math.floor(r.duration_seconds / 60)}m \${r.duration_seconds % 60}s\` };
    }

    const divRes = await pool.query(\`SELECT AVG(COALESCE(unit_completion, 0)) as avg FROM ph_schools WHERE division = $1\`, [progress.division]);
    const regRes = await pool.query(\`SELECT AVG(COALESCE(unit_completion, 0)) as avg FROM ph_schools WHERE region = $1\`, [progress.region]);

    res.json({
      success: true,
      data: {
        progress: { 
            completedUnits: progress.completedUnits.length, 
            completedUnitsArray: progress.completedUnits,
            totalUnits, 
            percentage: progress.percentage, 
            flags: completedFlags,
            xp: progress.xp
        },
        gamification: { fastest_sprint },
        comparative: [
          { name: 'My School', completed: progress.percentage },
          { name: 'Division Avg', completed: parseFloat(parseFloat(divRes.rows[0]?.avg || 0).toFixed(1)) },
          { name: 'Region Avg', completed: parseFloat(parseFloat(regRes.rows[0]?.avg || 0).toFixed(1)) }
        ]
      }
    });
  } catch (err) {
    console.error("GET activity error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }`;

replaceEndpointBody('/api/schools/:schoolId/activity', activityBody);

// --- 2. Patch Modular Progress Endpoint ---
const progressBody = `
  const { schoolId } = req.params;
  try {
    const progress = await calculateSchoolProgress(pool, schoolId);
    if (!progress) {
        return res.json({ success: true, progress: { completedUnits: [], incompleteUnits: [], xp: 0, curricular_offering: null } });
    }
    res.json({ success: true, progress });
  } catch (err) {
    console.error("Fetch Quest Progress Error:", err);
    res.json({ success: true, progress: { completedUnits: [], incompleteUnits: [], xp: 0, curricular_offering: null } });
  }`;

replaceEndpointBody('/api/ph_schools/progress/:schoolId', progressBody);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patching Complete.");
