const fs = require('fs');

let content = fs.readFileSync('api/index.js', 'utf8');

// Update Registered Count in Stats
content = content.replace(
  'COUNT(CASE WHEN c.registration_date IS NOT NULL THEN 1 END) as registered_schools_count',
  'COUNT(CASE WHEN s.school_id IS NOT NULL THEN 1 END) as registered_schools_count'
);

// Update Registered Count in Division Stats
content = content.replace(
  'COUNT(CASE WHEN c.registration_date IS NOT NULL THEN 1 END) as registered_schools',
  'COUNT(CASE WHEN s.school_id IS NOT NULL THEN 1 END) as registered_schools'
);

// Update Regex matching to ILIKE for Region
content = content.replace(
  /WHERE UPPER\(TRIM\(i\."Region"\)\) ~\* \('\^' \|\| \$1 \|\| '\(\$\|\[\^a-zA-Z0-9\]\)'\)/g,
  'WHERE i."Region" ILIKE \'%\' || $1 || \'%\''
);

content = content.replace(
  'statsQuery += ` AND UPPER(TRIM(i."Division")) = UPPER(TRIM($2))`',
  'statsQuery += ` AND i."Division" ILIKE \\\'%\\\' || $${params.length + 1} || \\\'%\\\'`'
);

content = content.replace(
  'statsQuery += ` AND UPPER(TRIM(i."District")) = UPPER(TRIM($${params.length + 1}))`',
  'statsQuery += ` AND i."District" ILIKE \\\'%\\\' || $${params.length + 1} || \\\'%\\\'`'
);

// We need to replace the legacy support R2 query in division-stats to use ILIKE and joining correctly
const legacySupportTarget = `    // Legacy support for school list detail if needed
    const r2 = await pool.query(\`
      SELECT s.school_id, s.school_name, s.division, c.total_completion as completion_percentage 
      FROM ph_schools s
      JOIN ph_school_completion c ON s.school_id = c.school_id
      WHERE UPPER(TRIM(s.region)) ~* ('^' || $1 || '($|[^a-zA-Z0-9])')
      ORDER BY division, school_name
    \`, [region]);`;

const legacySupportReplacement = `    // Legacy support for school list detail if needed
    const r2 = await pool.query(\`
      SELECT i."SchoolID" as school_id, i."SchoolName" as school_name, i."Division" as division, c.total_completion as completion_percentage,
             CASE WHEN s.school_id IS NOT NULL THEN true ELSE false END as is_registered
      FROM "schools_IERN" i
      LEFT JOIN ph_school_completion c ON i."SchoolID" = c.school_id
      LEFT JOIN ph_schools s ON i."SchoolID" = s.school_id
      WHERE i."Region" ILIKE '%' || $1 || '%'
      ORDER BY i."Division", i."SchoolName"
    \`, [region]);`;

content = content.replace(legacySupportTarget, legacySupportReplacement);

// Append the Schools endpoint right below division stats
const newEndpoint = `
// --- 27. GET: Monitoring Schools List ---
app.get('/api/monitoring/schools', async (req, res) => {
  const { region, division, district, page = 1, limit = 50, search = '' } = req.query;
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let params = [];
    let whereClause = "WHERE 1=1";

    if (region) {
      whereClause += \` AND i."Region" ILIKE '%' || $\${params.length + 1} || '%'\`;
      params.push(region);
    }
    if (division) {
      whereClause += \` AND i."Division" ILIKE '%' || $\${params.length + 1} || '%'\`;
      params.push(division);
    }
    if (district) {
      whereClause += \` AND i."District" ILIKE '%' || $\${params.length + 1} || '%'\`;
      params.push(district);
    }
    if (search) {
      whereClause += \` AND (i."SchoolName" ILIKE '%' || $\${params.length + 1} || '%' OR i."SchoolID"::text ILIKE '%' || $\${params.length + 1} || '%')\`;
      params.push(search);
    }

    const countQuery = \`
      SELECT COUNT(i."SchoolID") as total 
      FROM "schools_IERN" i
      \${whereClause}
    \`;
    const countRes = await pool.query(countQuery, params);
    const totalItems = parseInt(countRes.rows[0].total) || 0;

    const dataQuery = \`
      SELECT 
        i."SchoolID" as school_id,
        i."SchoolName" as school_name,
        i."Region" as region,
        i."Division" as division,
        i."District" as district,
        c.total_completion as completion_percentage,
        CASE WHEN s.school_id IS NOT NULL THEN true ELSE false END as is_registered,
        s.date_registered
      FROM "schools_IERN" i
      LEFT JOIN ph_school_completion c ON i."SchoolID" = c.school_id
      LEFT JOIN ph_schools s ON i."SchoolID" = s.school_id
      \${whereClause}
      ORDER BY i."SchoolName" ASC
      LIMIT $\${params.length + 1} OFFSET $\${params.length + 2}
    \`;
    params.push(parseInt(limit), offset);

    const dataRes = await pool.query(dataQuery, params);

    res.json({
      success: true,
      data: dataRes.rows,
      pagination: {
        total: totalItems,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalItems / parseInt(limit))
      }
    });

  } catch (err) {
    console.error("Monitoring Schools Error:", err);
    res.status(500).json({ error: "Failed to fetch schools", details: err.message });
  }
});
`;

const divisionStatsErrorTarget = `    console.error("Division Stats Error:", err);\n    res.status(500).json({ error: "Failed to fetch division stats", details: err.message });\n  }\n});`;

content = content.replace(divisionStatsErrorTarget, divisionStatsErrorTarget + '\n' + newEndpoint);

fs.writeFileSync('api/index.js', content);
console.log('Update script finished successfully.');
