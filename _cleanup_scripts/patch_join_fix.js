import fs from 'fs';

const filePath = 'api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// --- Division Stats Fix ---
// Old subquery: uses only schools_IERN as base
const divOld = `      FROM (
        SELECT 
          "SchoolID" as school_id,
          UPPER(TRIM("Region")) as region,
          UPPER(TRIM("Division")) as division,
          UPPER(TRIM("District")) as district,
          "School_Name" as school_name
        FROM "schools_IERN"
      ) s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN ph_schools ps ON s.school_id = ps.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      LEFT JOIN (
        SELECT CAST(school_id AS TEXT) as school_id
        FROM users 
        WHERE school_id IS NOT NULL 
        GROUP BY school_id
      ) ua ON s.school_id = ua.school_id
      WHERE s.region = UPPER(TRIM($1))
      GROUP BY s.division
      ORDER BY s.division`;

// New subquery: FULL OUTER JOIN so ph_schools registered are also counted
const divNew = `      FROM (
        SELECT 
          COALESCE(p_in.school_id, s_in."SchoolID") as school_id,
          UPPER(TRIM(COALESCE(p_in.region, s_in."Region"))) as region,
          UPPER(TRIM(COALESCE(p_in.division, s_in."Division"))) as division,
          UPPER(TRIM(COALESCE(p_in.district, s_in."District"))) as district,
          COALESCE(p_in.school_name, s_in."School_Name") as school_name
        FROM "schools_IERN" s_in
        FULL OUTER JOIN ph_schools p_in ON s_in."SchoolID" = p_in.school_id
      ) s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN ph_schools ps ON s.school_id = ps.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      LEFT JOIN (
        SELECT CAST(school_id AS TEXT) as school_id
        FROM users 
        WHERE school_id IS NOT NULL 
        GROUP BY school_id
      ) ua ON s.school_id = ua.school_id
      WHERE s.region = UPPER(TRIM($1))
      GROUP BY s.division
      ORDER BY s.division`;

// --- District Stats Fix ---
const distOld = `      FROM (
        SELECT 
          "SchoolID" as school_id,
          UPPER(TRIM("Region")) as region,
          UPPER(TRIM("Division")) as division,
          UPPER(TRIM("District")) as district,
          UPPER(TRIM("Legislative_District")) as legislative_district,
          UPPER(TRIM("Municipality")) as municipality,
          "School_Name" as school_name
        FROM "schools_IERN"
      ) s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN ph_schools ps ON s.school_id = ps.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      WHERE s.region = UPPER(TRIM($1)) AND
            s.division = UPPER(TRIM($2))`;

const distNew = `      FROM (
        SELECT 
          COALESCE(p_in.school_id, s_in."SchoolID") as school_id,
          UPPER(TRIM(COALESCE(p_in.region, s_in."Region"))) as region,
          UPPER(TRIM(COALESCE(p_in.division, s_in."Division"))) as division,
          UPPER(TRIM(COALESCE(p_in.district, s_in."District"))) as district,
          UPPER(TRIM(COALESCE(NULLIF(p_in.municipal, ''), s_in."Municipality"))) as municipality,
          UPPER(TRIM(s_in."Legislative_District")) as legislative_district,
          COALESCE(p_in.school_name, s_in."School_Name") as school_name
        FROM "schools_IERN" s_in
        FULL OUTER JOIN ph_schools p_in ON s_in."SchoolID" = p_in.school_id
      ) s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN ph_schools ps ON s.school_id = ps.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      WHERE s.region = UPPER(TRIM($1)) AND
            s.division = UPPER(TRIM($2))`;

if (content.includes(divOld)) {
  content = content.replace(divOld, divNew);
  console.log('✅ Division stats subquery patched.');
} else {
  console.error('❌ Division stats subquery NOT FOUND - check for whitespace differences.');
}

if (content.includes(distOld)) {
  content = content.replace(distOld, distNew);
  console.log('✅ District stats subquery patched.');
} else {
  console.error('❌ District stats subquery NOT FOUND - check for whitespace differences.');
}

fs.writeFileSync(filePath, content);
console.log('Done writing api/index.js.');
