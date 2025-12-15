import dotenv from 'dotenv';
import express from 'express';
import pg from 'pg';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Destructure Pool from pg
const { Pool } = pg;

const app = express();

// --- MIDDLEWARE ---
app.use(cors({
    origin: [
        'http://localhost:5173',           // Vite Local
        'https://insight-ed-mobile-pwa.vercel.app', // Your Vercel Frontend
        'https://insight-ed-frontend.vercel.app' 
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));

// --- DATABASE CONNECTION ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ FATAL: Could not connect to Neon DB:', err.message);
  } else {
    console.log('✅ Connected to Neon Database successfully!');
    release();
  }
});

// ==================================================================
//                        HELPER FUNCTIONS
// ==================================================================

const valueOrNull = (value) => (value === '' ? null : value);

const parseNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
};

const parseIntOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
};

/** Log Activity Helper */
const logActivity = async (userUid, userName, role, actionType, targetEntity, details) => {
    const query = `
        INSERT INTO activity_logs (user_uid, user_name, role, action_type, target_entity, details)
        VALUES ($1, $2, $3, $4, $5, $6)
    `;
    try {
        await pool.query(query, [userUid, userName, role, actionType, targetEntity, details]);
        console.log(`📝 Audit Logged: ${actionType} - ${targetEntity}`);
    } catch (err) {
        console.error("❌ Failed to log activity:", err.message);
    }
};

// ==================================================================
//                        CORE ROUTES
// ==================================================================

// --- 1. GET: Fetch Recent Activities ---
app.get('/api/activities', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                log_id, user_name, role, action_type, target_entity, details, 
                TO_CHAR(timestamp, 'Mon DD, HH12:MI AM') as formatted_time 
            FROM activity_logs 
            ORDER BY timestamp DESC 
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching activities" });
    }
});

// --- 2. GET: Check School by USER ID ---
app.get('/api/school-by-user/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE submitted_by = $1', [uid]);
    if (result.rows.length > 0) {
      res.json({ exists: true, data: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error("User Check Error:", err);
    res.status(500).json({ error: "Database check failed" });
  }
});

// --- 3. GET: Check by School ID ---
app.get('/api/check-school/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE school_id = $1', [id]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Check failed" });
  }
});

// ==================================================================
//                  SCHOOL HEAD FORMS ROUTES
// ==================================================================

// --- 4. POST: Save School Profile ---
app.post('/api/save-school', async (req, res) => {
  const data = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); 

    const newLogEntry = {
      timestamp: new Date().toISOString(),
      user: data.submittedBy,
      action: "Profile Update"
    };

    const query = `
      INSERT INTO school_profiles (
        school_id, school_name, region, province, division, district, 
        municipality, leg_district, barangay, mother_school_id, 
        latitude, longitude, submitted_by, submitted_at, 
        history_logs
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, 
        jsonb_build_array($14::jsonb) 
      )
      ON CONFLICT (school_id) 
      DO UPDATE SET 
        school_name = EXCLUDED.school_name,
        region = EXCLUDED.region,
        province = EXCLUDED.province,
        division = EXCLUDED.division,
        district = EXCLUDED.district,
        municipality = EXCLUDED.municipality,
        leg_district = EXCLUDED.leg_district,
        barangay = EXCLUDED.barangay,
        mother_school_id = EXCLUDED.mother_school_id,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = CURRENT_TIMESTAMP,
        history_logs = school_profiles.history_logs || $14::jsonb;
    `;
    
    const values = [
      data.schoolId, data.schoolName, data.region, data.province, 
      data.division, data.district, data.municipality, data.legDistrict, 
      data.barangay, data.motherSchoolId, data.latitude, data.longitude, 
      data.submittedBy,
      JSON.stringify(newLogEntry) 
    ];

    await client.query(query, values);
    await client.query('COMMIT');
    res.status(200).json({ message: "Profile saved successfully!" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Save Error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    client.release();
  }
});

// --- 5. POST: Save School Head Info ---
app.post('/api/save-school-head', async (req, res) => {
  const { uid, lastName, firstName, middleName, itemNumber, positionTitle, dateHired } = req.body;
  try {
    const query = `
      INSERT INTO school_heads (
        user_uid, last_name, first_name, middle_name, 
        item_number, position_title, date_hired
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_uid) 
      DO UPDATE SET 
        last_name = EXCLUDED.last_name,
        first_name = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        item_number = EXCLUDED.item_number,
        position_title = EXCLUDED.position_title,
        date_hired = EXCLUDED.date_hired,
        updated_at = CURRENT_TIMESTAMP;
    `;
    
    await pool.query(query, [uid, lastName, firstName, middleName, itemNumber, positionTitle, dateHired]);
    res.json({ success: true, message: "School Head saved successfully" });

  } catch (err) {
    console.error("Save Head Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 6. GET: Get School Head Info ---
app.get('/api/school-head/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_heads WHERE user_uid = $1', [uid]);
    
    if (result.rows.length > 0) {
      res.json({ exists: true, data: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error("Get Head Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- 7. POST: Save Enrolment ---
app.post('/api/save-enrolment', async (req, res) => {
  const data = req.body;
  
  const newLogEntry = {
    timestamp: new Date().toISOString(),
    user: data.submittedBy,
    action: "Enrolment Update",
    offering: data.curricularOffering
  };

  try {
    const query = `
      UPDATE school_profiles 
      SET 
        curricular_offering = $2,
        es_enrollment = $3, jhs_enrollment = $4, 
        shs_enrollment = $5, total_enrollment = $6,
        grade_kinder = $7, grade_1 = $8, grade_2 = $9, grade_3 = $10,
        grade_4 = $11, grade_5 = $12, grade_6 = $13,
        grade_7 = $14, grade_8 = $15, grade_9 = $16, grade_10 = $17,
        grade_11 = $18, grade_12 = $19,
        abm_11=$20, abm_12=$21, stem_11=$22, stem_12=$23,
        humss_11=$24, humss_12=$25, gas_11=$26, gas_12=$27,
        tvl_ict_11=$28, tvl_ict_12=$29, tvl_he_11=$30, tvl_he_12=$31,
        tvl_ia_11=$32, tvl_ia_12=$33, tvl_afa_11=$34, tvl_afa_12=$35,
        arts_11=$36, arts_12=$37, sports_11=$38, sports_12=$39,
        submitted_at = CURRENT_TIMESTAMP,
        history_logs = history_logs || $40::jsonb
      WHERE school_id = $1;
    `;
    
    const values = [
      data.schoolId, data.curricularOffering,
      data.esTotal, data.jhsTotal, data.shsTotal, data.grandTotal,
      data.gradeKinder, data.grade1, data.grade2, data.grade3, 
      data.grade4, data.grade5, data.grade6,
      data.grade7, data.grade8, data.grade9, data.grade10,
      data.grade11, data.grade12,
      data.abm11, data.abm12, data.stem11, data.stem12,
      data.humss11, data.humss12, data.gas11, data.gas12,
      data.ict11, data.ict12, data.he11, data.he12,
      data.ia11, data.ia12, data.afa11, data.afa12,
      data.arts11, data.arts12, data.sports11, data.sports12,
      JSON.stringify(newLogEntry)
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "School Profile not found." });
    }

    res.status(200).json({ message: "Enrolment updated successfully!" });

  } catch (err) {
    console.error("Enrolment Save Error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// ==================================================================
//                    ENGINEER FORMS ROUTES
// ==================================================================

// --- 8. POST: Save New Project ---
app.post('/api/save-project', async (req, res) => {
  const data = req.body;

  if (!data.schoolName || !data.projectName || !data.schoolId) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  const values = [
    data.projectName, data.schoolName, data.schoolId, 
    valueOrNull(data.region), valueOrNull(data.division),
    data.status || 'Not Yet Started', parseIntOrNull(data.accomplishmentPercentage), 
    valueOrNull(data.statusAsOfDate), valueOrNull(data.targetCompletionDate),        
    valueOrNull(data.actualCompletionDate), valueOrNull(data.noticeToProceed),             
    valueOrNull(data.contractorName), parseNumberOrNull(data.projectAllocation),      
    valueOrNull(data.batchOfFunds), valueOrNull(data.otherRemarks)
  ];

  const query = `
    INSERT INTO "engineer_form" (
      project_name, school_name, school_id, region, division,
      status, accomplishment_percentage, status_as_of,
      target_completion_date, actual_completion_date, notice_to_proceed,
      contractor_name, project_allocation, batch_of_funds, other_remarks
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING project_id, project_name;
  `;

  try {
    const result = await pool.query(query, values);
    const newProject = result.rows[0];

    await logActivity(
        data.uid, 
        data.modifiedBy, 
        'Engineer', 
        'CREATE', 
        `Project: ${newProject.project_name}`, 
        `Created new project for ${data.schoolName}`
    );

    res.status(200).json({ message: "Project saved!", project: newProject });
  } catch (err) {
    console.error("❌ SQL ERROR:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// --- 9. PUT: Update Project ---
app.put('/api/update-project/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const query = `
    UPDATE "engineer_form"
    SET status = $1, accomplishment_percentage = $2, status_as_of = $3, other_remarks = $4
    WHERE project_id = $5
    RETURNING *;
  `;

  const values = [
    data.status, parseIntOrNull(data.accomplishmentPercentage),
    valueOrNull(data.statusAsOfDate), valueOrNull(data.otherRemarks), id
  ];

  try {
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) return res.status(404).json({ message: "Project not found" });

    await logActivity(
        data.uid, 
        data.modifiedBy, 
        'Engineer', 
        'UPDATE', 
        `Project ID: ${id}`, 
        `Updated status to ${data.status} (${data.accomplishmentPercentage}%)`
    );

    res.json({ message: "Update successful", project: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating project:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 10. GET: Get All Projects ---
app.get('/api/projects', async (req, res) => {
  try {
    const query = `
      SELECT 
        project_id AS "id", school_name AS "schoolName", project_name AS "projectName",
        school_id AS "schoolId", division, region, status,
        accomplishment_percentage AS "accomplishmentPercentage",
        project_allocation AS "projectAllocation", batch_of_funds AS "batchOfFunds",
        contractor_name AS "contractorName", other_remarks AS "otherRemarks",
        TO_CHAR(status_as_of, 'YYYY-MM-DD') AS "statusAsOfDate",
        TO_CHAR(target_completion_date, 'YYYY-MM-DD') AS "targetCompletionDate",
        TO_CHAR(actual_completion_date, 'YYYY-MM-DD') AS "actualCompletionDate",
        TO_CHAR(notice_to_proceed, 'YYYY-MM-DD') AS "noticeToProceed"
      FROM "engineer_form"
      ORDER BY project_id DESC; 
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching projects" });
  }
});

// --- 11. GET: Get Single Project ---
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        project_id AS "id", school_name AS "schoolName", project_name AS "projectName",
        school_id AS "schoolId", division, region, status,
        accomplishment_percentage AS "accomplishmentPercentage",
        project_allocation AS "projectAllocation", batch_of_funds AS "batchOfFunds",
        contractor_name AS "contractorName", other_remarks AS "otherRemarks",
        TO_CHAR(status_as_of, 'YYYY-MM-DD') AS "statusAsOfDate",
        TO_CHAR(target_completion_date, 'YYYY-MM-DD') AS "targetCompletionDate",
        TO_CHAR(actual_completion_date, 'YYYY-MM-DD') AS "actualCompletionDate",
        TO_CHAR(notice_to_proceed, 'YYYY-MM-DD') AS "noticeToProceed"
      FROM "engineer_form" WHERE project_id = $1;
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Project not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ==================================================================
//                        SERVER STARTUP
// ==================================================================

// 1. FOR LOCAL DEVELOPMENT (runs when you type 'node api/index.js')
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on http://localhost:${PORT}`);
  });
}

// 2. FOR VERCEL (Production)
// Export default is required for ESM in Vercel
export default app;