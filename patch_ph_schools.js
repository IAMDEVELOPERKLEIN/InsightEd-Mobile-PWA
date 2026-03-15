/**
 * Simpler patch: use regex with flexible whitespace to replace FROM schools_IERN sections
 */
import fs from 'fs';

const FILENAME = 'api/index.js';
let content = fs.readFileSync(FILENAME, 'utf8');

// Use regex with \s* to handle mixed \r\n and \n line endings
// Regex flags: 's' for dotall (dot matches newlines)

// ========== DIVISION STATS FIX ==========
// Match the FROM...schools_IERN...GROUP BY s.division block in division-stats
// We look for a unique anchor: the group by s.division near the ORDER BY s.division in that section

const divPattern = /FROM \(\s+SELECT\s+"SchoolID" as school_id,\s+UPPER\(TRIM\("Region"\)\) as region,\s+UPPER\(TRIM\("Division"\)\) as division,\s+UPPER\(TRIM\("District"\)\) as district,\s+"School_Name" as school_name\s+FROM "schools_IERN"\s+\) s\s+LEFT JOIN school_profiles sp ON s\.school_id = sp\.school_id\s+LEFT JOIN ph_schools ps ON s\.school_id = ps\.school_id\s+LEFT JOIN school_summary ss ON s\.school_id = ss\.school_id\s+LEFT JOIN \(\s+SELECT CAST\(school_id AS TEXT\) as school_id\s+FROM users\s+WHERE school_id IS NOT NULL\s+GROUP BY school_id\s+\) ua ON s\.school_id = ua\.school_id\s+WHERE s\.region = UPPER\(TRIM\(\$1\)\)\s+GROUP BY s\.division\s+ORDER BY s\.division/s;

const divReplacement = `FROM ph_schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      LEFT JOIN (
        SELECT CAST(school_id AS TEXT) as school_id
        FROM users 
        WHERE school_id IS NOT NULL 
        GROUP BY school_id
      ) ua ON s.school_id = ua.school_id
      WHERE UPPER(TRIM(s.region)) = UPPER(TRIM($1))
      GROUP BY s.division
      ORDER BY s.division`;

// ========== DISTRICT STATS FIX ==========
const distPattern = /FROM \(\s+SELECT\s+"SchoolID" as school_id,\s+UPPER\(TRIM\("Region"\)\) as region,\s+UPPER\(TRIM\("Division"\)\) as division,\s+UPPER\(TRIM\("District"\)\) as district,\s+UPPER\(TRIM\("Legislative_District"\)\) as legislative_district,\s+UPPER\(TRIM\("Municipality"\)\) as municipality,\s+"School_Name" as school_name\s+FROM "schools_IERN"\s+\) s\s+LEFT JOIN school_profiles sp ON s\.school_id = sp\.school_id\s+LEFT JOIN ph_schools ps ON s\.school_id = ps\.school_id\s+LEFT JOIN school_summary ss ON s\.school_id = ss\.school_id\s+WHERE s\.region = UPPER\(TRIM\(\$1\)\) AND\s+s\.division = UPPER\(TRIM\(\$2\)\)/s;

const distReplacement = `FROM ph_schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      WHERE UPPER(TRIM(s.region)) = UPPER(TRIM($1)) AND
            UPPER(TRIM(s.division)) = UPPER(TRIM($2))`;

// Apply
if (divPattern.test(content)) {
  content = content.replace(divPattern, divReplacement);
  console.log('✅ Division stats FROM block replaced.');
} else {
  console.error('❌ Division stats pattern NOT MATCHED. Check whitespace.');
}

if (distPattern.test(content)) {
  content = content.replace(distPattern, distReplacement);
  console.log('✅ District stats FROM block replaced.');
} else {
  console.error('❌ District stats pattern NOT MATCHED. Check whitespace.');
}

// Fix SELECT references
const selectFixes = [
  [/COUNT\(ps\.iern\) as completed_schools/g, 'COUNT(s.iern) as completed_schools'],
  [/COALESCE\(AVG\(ps\.unit_completion\)/g, 'COALESCE(AVG(s.unit_completion)'],
  [/ps\.unit_completion >= 100/g, 's.unit_completion >= 100'],
  [/COALESCE\(SUM\(ps\.unit1\)/g, 'COALESCE(SUM(s.unit1)'],
  [/COALESCE\(SUM\(ps\.unit2\)/g, 'COALESCE(SUM(s.unit2)'],
  [/COALESCE\(SUM\(ps\.unit3\)/g, 'COALESCE(SUM(s.unit3)'],
  [/COALESCE\(SUM\(ps\.unit4\)/g, 'COALESCE(SUM(s.unit4)'],
  [/COALESCE\(SUM\(ps\.unit5\)/g, 'COALESCE(SUM(s.unit5)'],
  [/COALESCE\(SUM\(ps\.unit6\)/g, 'COALESCE(SUM(s.unit6)'],
  [/COALESCE\(SUM\(ps\.unit7\)/g, 'COALESCE(SUM(s.unit7)'],
  [/COALESCE\(SUM\(ps\.unit8\)/g, 'COALESCE(SUM(s.unit8)'],
];

let totalReplaced = 0;
for (const [pattern, replacement] of selectFixes) {
  const matches = content.match(pattern);
  if (matches) {
    content = content.replace(pattern, replacement);
    console.log(`  ✅ Replaced ${matches.length}x: ${pattern.source}`);
    totalReplaced += matches.length;
  }
}

fs.writeFileSync(FILENAME, content);
console.log(`\n✅ Done. ${totalReplaced} SELECT references updated.`);
