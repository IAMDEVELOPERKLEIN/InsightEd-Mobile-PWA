import dotenv from 'dotenv';
import express from 'express';
console.log("📌 >>> RUNNING: [ROOT]/api/index.js <<< 📌");

import { google } from 'googleapis';
// Force restart to pick up .env changes - Robust Login Fix v1
import pg from 'pg';
import cors from 'cors';
// import cron from 'node-cron'; // REMOVED for Vercel
// --- LEGACY FIREBASE (DISABLED) ---
const admin = { 
  apps: [], 
  auth: () => ({ 
    getUser: () => Promise.resolve({}), 
    updateUser: () => Promise.resolve({}), 
    deleteUser: () => Promise.resolve({}), 
    getUserByEmail: () => Promise.resolve(null), 
    createCustomToken: () => Promise.resolve("") 
  }), 
  messaging: () => ({ 
    sendEachForMulticast: () => Promise.resolve({ successCount: 0, failureCount: 0 }) 
  }), 
  credential: { cert: () => ({}) }, 
  initializeApp: () => ({}) 
};
import nodemailer from 'nodemailer'; // --- NODEMAILER ---
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initOtpTable, runMigrations } from './db_init.js';

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs'; // Added for seed
import csv from 'csv-parser'; // Added for seed
import { BlobServiceClient } from '@azure/storage-blob'; // --- AZURE BLOB STORAGE ---
import busboy from 'busboy'; // --- FAST FILE PARSER ---
import multer from 'multer';
import { createRequire } from "module"; // Added for JSON import
const require = createRequire(import.meta.url);
import { exec } from 'child_process';
import util from 'util';
import { FirebaseScrypt } from 'firebase-scrypt'; // For lazy migration
import bcrypt from 'bcrypt'; // For new standard hashes
import { teachChatbot, chatWithKnowledge, setPool, updateKnowledgeEntry, deleteKnowledgeEntry } from './chatbot.js';
import { v4 as uuidv4 } from 'uuid';
import { calculateRiskIndex } from './utils/safetyScore.js';
import { z } from 'zod'; // For validation
import jwt from 'jsonwebtoken';
import authMiddleware from './middleware/authMiddleware.js';
import XLSX from 'xlsx';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// --- ZOD VALIDATION SCHEMAS (Resilience v6.0) ---
const PasscodeSchema = z.string().length(6).regex(/^\d+$/, "Passcode must be exactly 6 digits.");

const RegisterUserSchema = z.object({
  email: z.string().email().transform(e => e.trim().toLowerCase()),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.string().min(1, "Role is required."),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  region: z.string().optional(),
  division: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  barangay: z.string().optional(),
  office: z.string().optional(),
  position: z.string().optional(),
  contactNumber: z.string().optional(),
  altEmail: z.string().email().optional().or(z.literal("")),
  accountCategory: z.string().optional(),
  passcode: PasscodeSchema.optional()
});

const RegisterSchoolSchema = z.object({
  email: z.string().email().transform(e => e.trim().toLowerCase()),
  password: z.string().min(6),
  schoolData: z.object({
    school_id: z.string().min(1),
    school_name: z.string().min(1),
    region: z.string().optional(),
    province: z.string().optional(),
    division: z.string().optional(),
    district: z.string().optional(),
    municipality: z.string().optional(),
    legislative_district: z.string().optional(),
    barangay: z.string().optional(),
    mother_school_id: z.string().optional(),
    latitude: z.union([z.number(), z.string()]).optional(),
    longitude: z.union([z.number(), z.string()]).optional(),
    curricular_offering: z.string().optional()
  }),
  contactNumber: z.string().optional(),
  role: z.string().optional(),
  passcode: PasscodeSchema
});

const RegisterBetaSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6),
  schoolData: z.object({
    school_id: z.string().min(1),
    school_name: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    division: z.string().optional().nullable(),
    province: z.string().optional().nullable(),
    municipality: z.string().optional().nullable(),
    district: z.string().optional().nullable(),
    legislative_district: z.string().optional().nullable(),
    barangay: z.string().optional().nullable(),
    latitude: z.union([z.number(), z.string()]).optional().nullable(),
    longitude: z.union([z.number(), z.string()]).optional().nullable()
  }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  contactNumber: z.string().optional(),
  passcode: PasscodeSchema.optional()
});

console.log('✅ [Env] DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

/* --- LEGACY FIREBASE INIT REMOVED --- */

// --- EMAIL TRANSPORTER ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- AZURE BLOB CLIENT ---
let blobServiceClient;
try {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONNECTION_STRING !== "ReplaceWithYourAzureStorageConnectionString") {
    blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    console.log("✅ Azure Blob Storage Client Initialized");
  } else {
    console.warn("⚠️ AZURE_STORAGE_CONNECTION_STRING missing or invalid. PDF Streaming will be disabled.");
  }
} catch (error) {
  console.error("❌ Failed to initialize Azure Blob Storage:", error.message);
}

// --- GOOGLE DRIVE CLIENT ---
let drive;
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
    });
    drive = google.drive({ version: 'v3', auth });
    console.log("✅ Google Drive API Initialized");
  }
} catch (error) {
  console.error("❌ Failed to initialize Google Drive API:", error.message);
}

// Destructure Pool from pg
const { Pool } = pg;

// --- STATE ---
let isDbConnected = false;

const app = express();




// --- AUTH MIDDLEWARE ---
app.use(cors({
  origin: [
    'http://localhost:5173',           // Vite Local Default
    'http://localhost:5174',           // Vite Local Alternate
    'https://insight-ed-mobile-pwa.vercel.app', // Your Vercel Frontend
    'https://insight-ed-frontend.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// --- PDF COMPRESSION COMPATIBILITY ---
const execAsync = util.promisify(exec);

// --- SCHOOL DOCS STORAGE ---
const schoolDocsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path for production consistency
    const dir = path.join(__dirname, '..', 'uploads/school_docs/');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.error("Critical: Failed to create upload directory:", e.message);
      }
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `iern_${req.params.iern}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const schoolDocsUpload = multer({ 
  storage: schoolDocsStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed!'), false);
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const upload = multer({ dest: 'uploads/' });

// --- Multer: Project Photos (file-path storage) ---
const projectPhotosStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads/project_photos/');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`);
    }
});
const projectPhotosUpload = multer({
    storage: projectPhotosStorage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// --- UPLOAD ROUTE: SCHOOL OWNERSHIP DOCUMENTS ---
app.post('/api/schools/:iern/ownership-docs', schoolDocsUpload.single('file'), async (req, res) => {
  const { iern } = req.params;
  const { doc_type } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  const relativePath = `/uploads/school_docs/${req.file.filename}`;
  
  try {
    // 1. Save to database
    const dbRes = await pool.query(
      `INSERT INTO school_ownership_docs (iern, file_path, file_name, doc_type) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [iern, relativePath, req.file.originalname, doc_type]
    );

    // 2. Respond immediately (Background task starts later)
    res.status(200).json({ 
      success: true, 
      message: 'Upload successful. Optimization starting in background.',
      data: { id: dbRes.rows[0].id, filePath: relativePath }
    });

    // 3. Background Compression (96 DPI)
    const inputPath = path.resolve(req.file.path);
    const outputPath = path.resolve(req.file.path.replace('.pdf', '_opt.pdf'));
    const scriptPath = path.resolve(__dirname, '..', 'compress_pdf.py');
    
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const cmd = `"${pythonCmd}" "${scriptPath}" "${inputPath}" "${outputPath}" 96`;

    exec(cmd, async (err, stdout, stderr) => {
        if (err) {
            console.error(`❌ Background Compression Failed for ${iern}:`);
            console.error(`Command: ${cmd}`);
            console.error(`Error: ${err.message}`);
            console.error(`Stderr: ${stderr}`);
            console.error(`Stdout: ${stdout}`);
            return;
        }
        
        try {
            // Replace original with optimized one
            if (fs.existsSync(outputPath)) {
                fs.renameSync(outputPath, inputPath);
                console.log(`✅ Background Compression Success for ${iern} (96 DPI)`);
                await pool.query('UPDATE school_ownership_docs SET status = $1 WHERE id = $2', ['optimized', dbRes.rows[0].id]);
            }
        } catch (renameErr) {
            console.error(`❌ Failed to replace compressed file for ${iern}:`, renameErr.message);
        }
    });

  } catch (err) {
    console.error('Database Error during upload:', err);
    res.status(500).json({ error: 'Failed to record document metadata' });
  }
});

// --- DELETE ROUTE: SCHOOL OWNERSHIP DOCUMENTS ---
app.delete('/api/schools/:iern/ownership-docs/:id', async (req, res) => {
  const { iern, id } = req.params;
  
  try {
    // 1. Get file path from DB
    const dbRes = await pool.query(
      'SELECT file_path FROM school_ownership_docs WHERE id = $1 AND iern = $2',
      [id, iern]
    );

    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const relativePath = dbRes.rows[0].file_path;
    const absolutePath = path.join(__dirname, '..', relativePath);

    // 2. Delete file from disk using promises for robustness
    try {
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
      }
    } catch (unlinkErr) {
      // Graceful error handling if file is missing or locked
      console.warn(`⚠️ Warning: Physical file not found or could not be deleted at ${absolutePath}:`, unlinkErr.message);
    }

    // 3. Delete from database (only after physical file attempt)
    await pool.query('DELETE FROM school_ownership_docs WHERE id = $1', [id]);

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

const processPdfFile = async (file) => {
    if (!file) return null;

    // Multer saves files WITHOUT extensions - PyMuPDF needs .pdf to detect format
    const renamedInput = file.path + '.pdf';
    fs.renameSync(file.path, renamedInput);

    // Permanent output path in uploads/project_docs/
    const docsDir = path.resolve(__dirname, '..', 'uploads/project_docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    const outputFilename = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`;
    const outputPath = path.join(docsDir, outputFilename);

    const inputPath = path.resolve(renamedInput);
    const scriptPath = path.resolve(__dirname, '..', 'compress_pdf.py');

    console.log(`📄 Processing PDF: ${inputPath}`);

    try {
        const cmd = (pythonCmd) => `${pythonCmd} "${scriptPath}" "${inputPath}" "${outputPath}"`;

        let stdout = '';
        try {
            const res = await execAsync(cmd('python'));
            stdout = res.stdout;
        } catch (err1) {
            try {
                const res = await execAsync(cmd('py'));
                stdout = res.stdout;
            } catch (err2) {
                try {
                    const res = await execAsync(cmd('python3'));
                    stdout = res.stdout;
                } catch (err3) {
                    throw err1;
                }
            }
        }

        console.log("✅ PDF Compression Output:", stdout);
        return `/uploads/project_docs/${outputFilename}`;
    } catch (err) {
        console.error("PDF Compression Error - Message:", err.message);
        console.error("PDF Compression Error - Stderr:", err.stderr);
        console.error("PDF Compression Error - Stdout:", err.stdout);
        throw new Error("PDF compression failed: " + (err.stderr || err.message));
    } finally {
        // Always clean up the temp input; output is now the permanent stored file
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
};

const processPdfInBackground = (file, projectId, type, ipc, uid, isLgu = false) => {
    const fieldMap = {
        'POW': 'pow_pdf',
        'DUPA': 'dupa_pdf',
        'CONTRACT': 'contract_pdf',
        'RTA': 'rta_pdf',
        'MOA': 'moa_pdf'
    };
    const field = fieldMap[type];
    if (!field) return;

    processPdfFile(file).then(async (base64) => {
        if (!base64) return;
        try {
            const table = isLgu ? 'lgu_forms' : 'engineer_documents';
            await pool.query(`UPDATE ${table} SET ${field} = $1 WHERE project_id = $2`, [base64, projectId]);
            console.log(`✅ [BG] ${type} compressed and saved for ${isLgu ? 'LGU ' : ''}Project ${projectId}`);
            
            if (poolNew) {
                try {
                    const targetId = isLgu ? (ipc || projectId) : projectId;
                    const targetCol = isLgu ? (ipc ? 'ipc' : 'project_id') : 'project_id';
                    await poolNew.query(`UPDATE ${table} SET ${field} = $1 WHERE ${targetCol} = $2`, [base64, targetId]);
                } catch (dwErr) {
                    console.error(`❌ [BG] Dual-Write Update Failed for ${field}:`, dwErr.message);
                }
            }
        } catch (err) {
            console.error(`❌ [BG] DB Update Failed for ${field}:`, err.message);
        }
    }).catch(err => {
        console.error(`❌ [BG] Compression Failed for ${field}:`, err.message);
    });
};
//               CORE DASHBOARD ENDPOINTS
// ==================================================================

// PATCH /api/schools/:school_id/units/:unit_number/complete
app.patch('/api/schools/:school_id/units/:unit_number/complete', async (req, res) => {
  const { school_id, unit_number } = req.params;
  const unitNum = parseInt(unit_number, 10);
  if (isNaN(unitNum) || unitNum < 1 || unitNum > 8) {
    return res.status(400).json({ error: `Invalid unit_number "${unit_number}"` });
  }
  const col = `unit${unitNum}`;
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `UPDATE ph_schools SET ${col} = 1 WHERE school_id = $1
       RETURNING unit1, unit2, unit3, unit4, unit5, unit7, unit8, unit9, unit_completion`,
      [school_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "School not found" });
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        unit1: row.unit1, unit2: row.unit2, unit3: row.unit3, unit4: row.unit4,
        unit5: row.unit5, unit6: row.unit7, unit7: row.unit8, unit8: row.unit9,
        unit_completion: parseFloat(parseFloat(row.unit_completion || 0).toFixed(2))
      }
    });
  } catch (err) {
    console.error('PATCH unit complete error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (client) client.release();
  }
});

// GET /api/schools/:schoolId/activity
app.get('/api/schools/:schoolId/activity', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const schoolRes = await pool.query(
      `SELECT 
        unit1, unit2, unit3, unit4, unit5, unit7, unit8, unit9,
        unit1_completed, unit2_completed, unit3_completed, unit4_completed,
        unit5_completed, unit7_completed, unit8_completed, unit9_completed,
        unit_completion, region, division
       FROM ph_schools WHERE school_id = $1`,
      [schoolId]
    );
    if (schoolRes.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const row = schoolRes.rows[0];
    const totalUnits = 8;
    let completedUnitsCount = 0;
    let completedFlags = {};

    // Unit 6 (Teaching Personnel) has been removed; map old units 7,8,9 to new IDs 6,7,8
    const unitMapping = [1, 2, 3, 4, 5, 7, 8, 9]; // old DB column -> new display ID
    for (let i = 0; i < unitMapping.length; i++) {
      const dbIdx = unitMapping[i];
      const displayId = i + 1;
      const intVal = parseInt(row[`unit${dbIdx}`]) || 0;
      const boolVal = row[`unit${dbIdx}_completed`] === true;
      const isDone = (intVal === 1 || boolVal);

      completedFlags[`unit${displayId}`] = isDone;
      if (isDone) completedUnitsCount++;
    }

    // Dynamic calculation is more reliable than the stale unit_completion column
    const overall_progress_percentage = parseFloat(((completedUnitsCount / totalUnits) * 100).toFixed(2));

    const sprintRes = await pool.query(
      `SELECT unit_id, duration_seconds FROM ph_performance_logs 
       WHERE school_id = $1 ORDER BY duration_seconds ASC LIMIT 1`,
      [schoolId]
    );
    let fastest_sprint = null;
    if (sprintRes.rows.length > 0) {
      const r = sprintRes.rows[0];
      fastest_sprint = { unit: r.unit_id, time_text: `${Math.floor(r.duration_seconds / 60)}m ${r.duration_seconds % 60}s` };
    }

    const divRes = await pool.query(`SELECT AVG(COALESCE(unit_completion, 0)) as avg FROM ph_schools WHERE division = $1`, [row.division]);
    const regRes = await pool.query(`SELECT AVG(COALESCE(unit_completion, 0)) as avg FROM ph_schools WHERE region = $1`, [row.region]);

    res.json({
      success: true,
      data: {
        progress: { completedUnits: completedUnitsCount, totalUnits, percentage: overall_progress_percentage, flags: completedFlags },
        gamification: { fastest_sprint },
        comparative: [
          { name: 'My School', completed: overall_progress_percentage },
          { name: 'Division Avg', completed: parseFloat(parseFloat(divRes.rows[0]?.avg || 0).toFixed(1)) },
          { name: 'Region Avg', completed: parseFloat(parseFloat(regRes.rows[0]?.avg || 0).toFixed(1)) }
        ]
      }
    });
  } catch (err) {
    console.error("GET activity error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', pid: process.pid });
});

// Pool Status Debug
app.get('/api/pool-status', (req, res) => {
  res.json({
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

app.use(express.urlencoded({ limit: '500mb', extended: true }));

// --- DATABASE CONNECTION ---
const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/postgres';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

console.log(`🔌 Database Connection: ${isLocal ? 'Local' : 'Remote'} (${dbUrl.replace(/:[^:@]*@/, ':****@')})`);

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 50, // Resilient v6.0: Support 1000+ concurrent users
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, 
  statement_timeout: 30000, // Increased for heavy report generation
  application_name: 'InsightEd_API_Primary'
});

pool.on('error', (err) => {
  console.error('💥 Unexpected error on idle database client:', err.message);
});

// Inject pool into chatbot module
setPool(pool);

// --- SECONDARY DATABASE CONNECTION (Dual-Write) ---
let poolNew = null;
if (process.env.NEW_DATABASE_URL) {
  console.log('”Œ Initializing Secondary Database Connection...');
  poolNew = new Pool({
    connectionString: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20, // Resilient v6.0: Scaled for secondary sync
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    application_name: 'InsightEd_API_Secondary'
  });

  poolNew.on('error', (err) => {
    console.error('💥 Unexpected error on idle Secondary DB client:', err.message);
  });

  // Test Connection
  poolNew.connect()
    .then(client => {
      console.log('… Connected to Secondary Database (ICTS) successfully!');
      client.release();
    })
    .catch(err => console.error('âŒ Failed to connect to Secondary Database:', err.message));
}

// --- DATABASE INIT HELPERS ---
const tableExists = async (tableName) => {
  const res = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [tableName]);
  return res.rowCount > 0;
};

const checkAndAddColumn = async (tableName, columnName, columnDefinition, targetClient = null) => {
  const queryExecutor = targetClient || pool;
  const res = await queryExecutor.query(`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = $2
  `, [tableName, columnName.replace(/"/g, '')]); // Remove quotes for metadata check

  if (res.rowCount === 0) {
    console.log(`       -> Adding column ${columnName} to ${tableName}...`);
    // Use double quotes for column name in ALTER TABLE to support names like "7x9"
    const safeColumnName = columnName.startsWith('"') ? columnName : `"${columnName}"`;
    await queryExecutor.query(`ALTER TABLE ${tableName} ADD COLUMN ${safeColumnName} ${columnDefinition}`);
  }
};

const checkAndDropColumn = async (tableName, columnName) => {
  const res = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [tableName, columnName]);

  if (res.rowCount > 0) {
    console.log(`       -> Dropping column ${columnName} from ${tableName}...`);
    await pool.query(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
  }
};

// --- MIGRATION TRACKER ---
const ensureMigrationTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ph_migrations (
            id SERIAL PRIMARY KEY,
            migration_name TEXT UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `).catch(e => console.warn('Migration table check failed:', e));
};

const hasMigrationRun = async (migrationName) => {
    try {
        const res = await pool.query('SELECT 1 FROM ph_migrations WHERE migration_name = $1', [migrationName]);
        return res.rowCount > 0;
    } catch { return false; }
};

const markMigrationDone = async (migrationName) => {
    await pool.query('INSERT INTO ph_migrations (migration_name) VALUES ($1) ON CONFLICT DO NOTHING', [migrationName]).catch(() => {});
};

// --- DATABASE INIT ---
const runAutoMigrations = async () => {
  console.log("   [Auto-Migrate] Starting loose migrations...");
  try {
    await ensureMigrationTable();

    const migrationPromises = [
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit10_completed BOOLEAN DEFAULT FALSE'),
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS school_head TEXT;'),
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS contact_number TEXT;'),
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit2_simplified_enrollment JSONB'),
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS sned_self_contained_count INTEGER DEFAULT 0'),
      // New SNED Redesign Columns
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS has_sned BOOLEAN DEFAULT FALSE'),
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS sned_total_count INTEGER DEFAULT 0'),
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS sned_program_type TEXT'),
      pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS sned_organized_class_count INTEGER DEFAULT 0')
    ];

    // Multi-grade columns
    const mgCols = ['multigrade_groupings_1', 'multigrade_groupings_2', 'multigrade_groupings_3'];
    for (const col of mgCols) {
      migrationPromises.push(pool.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS ${col} TEXT`));
    }
    const mgEnrCols = ['multigrade_enrollment_1', 'multigrade_enrollment_2', 'multigrade_enrollment_3'];
    for (const col of mgEnrCols) {
      migrationPromises.push(pool.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS ${col} INTEGER DEFAULT 0`));
    }

    await Promise.all(migrationPromises);

    // Unit 4
    await unit4MigrateCols();

    // Unit 1: Ownership Document Type
    const columnPromises = [
      checkAndAddColumn('ph_schools', 'ownership_document_type', 'TEXT', pool)
    ];
    if (poolNew) columnPromises.push(checkAndAddColumn('ph_schools', 'ownership_document_type', 'TEXT', poolNew));
    
    // Unit Updated At Timestamps
    for (let i = 1; i <= 10; i++) {
      const colName = `unit${i}_updated_at`;
      columnPromises.push(checkAndAddColumn('ph_schools', colName, 'TIMESTAMPTZ', pool));
      if (poolNew) columnPromises.push(checkAndAddColumn('ph_schools', colName, 'TIMESTAMPTZ', poolNew));
      
      // Convert existing TIMESTAMP columns to TIMESTAMPTZ to fix timezone issues
      columnPromises.push(pool.query(`ALTER TABLE ph_schools ALTER COLUMN "${colName}" TYPE TIMESTAMPTZ USING "${colName}"::TIMESTAMPTZ`).catch(() => {}));
      if (poolNew) columnPromises.push(poolNew.query(`ALTER TABLE ph_schools ALTER COLUMN "${colName}" TYPE TIMESTAMPTZ USING "${colName}"::TIMESTAMPTZ`).catch(() => {}));
    }

    // Unit 1: Year Established
    columnPromises.push(checkAndAddColumn('ph_schools', 'established_month', 'TEXT', pool));
    columnPromises.push(checkAndAddColumn('ph_schools', 'established_year', 'INTEGER', pool));
    if (poolNew) {
      columnPromises.push(checkAndAddColumn('ph_schools', 'established_month', 'TEXT', poolNew));
      columnPromises.push(checkAndAddColumn('ph_schools', 'established_year', 'INTEGER', poolNew));
    }

    await Promise.all(columnPromises);

    await checkAndAddColumn('ownership_documents', 'ownership_document_type', 'TEXT', pool);
    if (poolNew) columnPromises.push(checkAndAddColumn('ownership_documents', 'ownership_document_type', 'TEXT', poolNew));

    // --- IERN MIGRATION PHASE ---
    if (!(await hasMigrationRun('iern_migration_v2'))) {
      console.log("   [Auto-Migrate] Running IERN Migration...");
      
      // 1. Ensure ph_schools has iern and it's UNIQUE
      await pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS iern TEXT');
      await pool.query('ALTER TABLE ph_schools ADD CONSTRAINT ph_schools_iern_unique UNIQUE (iern)').catch(() => {});
    
    // 2. Backfill ph_schools.iern from "schools_IERN"
    await pool.query(`
      UPDATE ph_schools p
      SET iern = s.iern
      FROM "schools_IERN" s
      WHERE s."SchoolID" = p.school_id AND p.iern IS NULL
    `).catch(e => console.warn("Backfill ph_schools failed:", e.message));

    // 3. Add iern column to all child tables and backfill
    const childTables = [
      'ph_school_buildable_spaces',
      'school_location_profiles',
      'ownership_documents',
      'ph_buildings_repairs',
      'ph_buildings_inventory',
      'ph_buildings_demolition',
      'ph_ecart_batches',
      'users'
    ];

    for (const table of childTables) {
      // Add column if not exists
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS iern TEXT`).catch(() => {});
      
      // Backfill from ph_schools (now that ph_schools has iern)
      await pool.query(`
        UPDATE ${table} t
        SET iern = p.iern
        FROM ph_schools p
        WHERE t.school_id = p.school_id AND t.iern IS NULL AND p.iern IS NOT NULL
      `).catch(e => console.warn(`Backfill ${table} failed:`, e.message));

      // 3c. Add INDEX on iern for performance (Fixes "delay" reported by user)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_${table}_iern ON ${table} (iern)`).catch(() => {});
    }
    
    // 3b. Add UNIQUE constraints for IERN-based UPSERTs (Hardening)
    console.log("   [Auto-Migrate] Hardening UNIQUE constraints for IERN UPSERTs...");
    
    // -- school_location_profiles --
    // Deduplicate: Keep latest record per IERN
    await pool.query(`
      DELETE FROM school_location_profiles WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY iern ORDER BY updated_at DESC) as rn
          FROM school_location_profiles WHERE iern IS NOT NULL
        ) s WHERE s.rn = 1
      )
    `).catch(() => {});
    await pool.query('ALTER TABLE school_location_profiles ADD CONSTRAINT school_location_profiles_iern_unique UNIQUE (iern)').catch(() => {});

    // -- ph_school_buildable_spaces --
    // Deduplicate: Keep latest record per (IERN, space_name)
    await pool.query(`
      DELETE FROM ph_school_buildable_spaces WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY iern, space_name ORDER BY created_at DESC) as rn
          FROM ph_school_buildable_spaces WHERE iern IS NOT NULL AND space_name IS NOT NULL
        ) s WHERE s.rn = 1
      )
    `).catch(() => {});
    await pool.query('ALTER TABLE ph_school_buildable_spaces ADD CONSTRAINT ph_school_buildable_spaces_iern_name_unique UNIQUE (iern, space_name)').catch(() => {});

    // -- ownership_documents --
    // Deduplicate: Keep latest record per IERN
    await pool.query(`
      DELETE FROM ownership_documents WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY iern ORDER BY updated_at DESC) as rn
          FROM ownership_documents WHERE iern IS NOT NULL
        ) s WHERE s.rn = 1
      )
    `).catch(() => {});
    await pool.query('ALTER TABLE ownership_documents ADD CONSTRAINT ownership_documents_iern_unique UNIQUE (iern)').catch(() => {});


    // 4. Drop problematic Foreign Key constraints that rely on school_id
    console.log("   [Auto-Migrate] Dropping school_id Foreign Key constraints...");
    const fkQuery = `
      SELECT
          tc.table_name, 
          tc.constraint_name
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'ph_schools' 
        AND ccu.column_name = 'school_id';
    `;
    
    try {
      const fkRes = await pool.query(fkQuery);
      for (const row of fkRes.rows) {
        console.log(`     - Dropping FK: ${row.constraint_name} on ${row.table_name}`);
        await pool.query(`ALTER TABLE ${row.table_name} DROP CONSTRAINT IF EXISTS ${row.constraint_name}`).catch(err => {
          console.warn(`       ! Failed to drop ${row.constraint_name}:`, err.message);
        });
      }

      if (poolNew) {
          const fkResNew = await poolNew.query(fkQuery);
          for (const row of fkResNew.rows) {
            console.log(`     - [Secondary] Dropping FK: ${row.constraint_name} on ${row.table_name}`);
            await poolNew.query(`ALTER TABLE ${row.table_name} DROP CONSTRAINT IF EXISTS ${row.constraint_name}`).catch(() => {});
          }
      }
    } catch (fkErr) {
      console.warn("   [Auto-Migrate] FK Drop process failed:", fkErr.message);
    }

      console.log("   [Auto-Migrate] IERN Migration finished.");
      await markMigrationDone('iern_migration_v2');
    } else {
      console.log("   [Auto-Migrate] Skipped IERN Migration (Already Run)");
    }

    console.log("   [Auto-Migrate] Finished.");
  } catch (e) {
    console.error("❌ Auto-Migrate Fail:", e.message);
  }
};

const initDB = async () => {
  let currentSegment = "Start";
  try {
    console.log("   [initDB] Starting...");

    const poolsToInit = [pool];
    if (poolNew) poolsToInit.push(poolNew);

    for (const targetPool of poolsToInit) {
      const dbLabel = targetPool === pool ? "Primary" : "Secondary";
      try {
        console.log(`     -> Initializing ${dbLabel} Database...`);
        // Set a lock timeout to prevent hanging forever on busy tables
        await targetPool.query('SET lock_timeout = 15000').catch(() => {});

        currentSegment = `${dbLabel} Seg 0.1: project_documents table`;
        await targetPool.query(`
          CREATE TABLE IF NOT EXISTS project_documents (
            id SERIAL PRIMARY KEY,
            project_id INT, 
            doc_type TEXT NOT NULL,
            file_data TEXT, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS engineer_documents (
            doc_id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL,
            ipc TEXT,
            pow_pdf TEXT,
            dupa_pdf TEXT,
            contract_pdf TEXT,
            rta_pdf TEXT,
            moa_pdf TEXT,
            uploader_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_project_docs_${dbLabel} UNIQUE(project_id)
          );


          CREATE TABLE IF NOT EXISTS engineer_mother_moa (
            mother_moa_id TEXT PRIMARY KEY,
            region TEXT,
            province TEXT,
            municipality_city TEXT,
            lgu_type TEXT NOT NULL,
            lgu_name TEXT NOT NULL,
            moa_pdf TEXT,
            sangguniang_resolution_id TEXT,
            sangguniang_resolution TEXT,
            uploaded_by TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Drop duplicate improperly spelled/duplicate tables if they exist
          DROP TABLE IF EXISTS engineer_suplamental_moa CASCADE;
          DROP TABLE IF EXISTS engineer_supplemental_moa CASCADE;

          CREATE TABLE IF NOT EXISTS engineer_supplamental_moa (
            supplamental_moa_id TEXT PRIMARY KEY,
            mother_moa_id TEXT REFERENCES engineer_mother_moa(mother_moa_id) ON DELETE CASCADE,
            moa_pdf TEXT,
            ipc_ids JSONB DEFAULT '[]',
            uploaded_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Migration: Ensure all columns exist in engineer_supplamental_moa (Robust)
          ALTER TABLE engineer_supplamental_moa ADD COLUMN IF NOT EXISTS mother_moa_id TEXT;
          ALTER TABLE engineer_supplamental_moa ADD COLUMN IF NOT EXISTS moa_pdf TEXT;
          ALTER TABLE engineer_supplamental_moa ADD COLUMN IF NOT EXISTS ipc_ids JSONB DEFAULT '[]';
          ALTER TABLE engineer_supplamental_moa ADD COLUMN IF NOT EXISTS uploaded_by TEXT;

          -- Migration: Ensure all columns exist in engineer_mother_moa (Robust)
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS region TEXT;
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS province TEXT;
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS municipality_city TEXT;
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS lgu_type TEXT;
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS lgu_name TEXT;
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS moa_pdf TEXT;
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS sangguniang_resolution_id TEXT;
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS sangguniang_resolution TEXT;
          ALTER TABLE engineer_mother_moa ADD COLUMN IF NOT EXISTS uploaded_by TEXT;

          -- Migration: Rename id to mother_moa_id if it exists
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='engineer_mother_moa' AND column_name='id') THEN
              ALTER TABLE engineer_mother_moa RENAME COLUMN id TO mother_moa_id;
            END IF;
          END $$;

          -- Migration: Force TEXT types on MOA ID columns
          ALTER TABLE engineer_supplamental_moa DROP CONSTRAINT IF EXISTS engineer_supplamental_moa_mother_moa_id_fkey;

          ALTER TABLE engineer_mother_moa ALTER COLUMN mother_moa_id TYPE TEXT USING mother_moa_id::text;
          ALTER TABLE engineer_mother_moa ALTER COLUMN sangguniang_resolution_id TYPE TEXT USING sangguniang_resolution_id::text;
          ALTER TABLE engineer_supplamental_moa ALTER COLUMN mother_moa_id TYPE TEXT USING mother_moa_id::text;
          ALTER TABLE engineer_supplamental_moa ALTER COLUMN supplamental_moa_id TYPE TEXT USING supplamental_moa_id::text;

          ALTER TABLE engineer_supplamental_moa ADD CONSTRAINT engineer_supplamental_moa_mother_moa_id_fkey FOREIGN KEY (mother_moa_id) REFERENCES engineer_mother_moa(mother_moa_id) ON DELETE CASCADE;
        `);

        currentSegment = `${dbLabel} Seg 0.2: engineer_form schema updates`;
        await targetPool.query(`
          CREATE TABLE IF NOT EXISTS co_finance (
            finance_id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL,
            ipc TEXT,
            tranche_1 NUMERIC DEFAULT 0,
            tranche_2 NUMERIC DEFAULT 0,
            tranche_3 NUMERIC DEFAULT 0,
            liquidated_tranche_1 NUMERIC DEFAULT 0,
            liquidated_tranche_2 NUMERIC DEFAULT 0,
            liquidated_tranche_3 NUMERIC DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_project_finance_${dbLabel} UNIQUE(project_id)
          );

          -- Legacy migration: columns moved to co_finance are already dropped.
        `).catch(() => {});

        // NOTE: 40+ legacy checkAndAddColumn calls for engineer_form were removed here
        // The engineer_form table was reconstructed on 2026-03-28 to permanently fix the 1600-column PostgreSQL limit.
        // Future dynamic fields must be stored in JSONB to avoid physical column catalog bloat.
        
        currentSegment = `${dbLabel} Seg 5: variation_orders table`;
        await targetPool.query(`
          CREATE TABLE IF NOT EXISTS variation_orders (
              id SERIAL PRIMARY KEY,
              project_id INTEGER NOT NULL,
              ipc TEXT,
              vo_number TEXT,
              vo_sequence_no INTEGER,
              vo_type TEXT,
              requested_date DATE,
              requested_by TEXT,
              original_contract_amount NUMERIC,
              additive_amount NUMERIC DEFAULT 0,
              deductive_amount NUMERIC DEFAULT 0,
              net_vo_amount NUMERIC DEFAULT 0,
              revised_contract_amount NUMERIC,
              original_target_completion_date DATE,
              revised_target_completion_date DATE,
              time_extension_days INTEGER DEFAULT 0,
              revised_expiry_date DATE,
              justification TEXT,
              caf_reference TEXT,
              status_of_construction_phase TEXT DEFAULT 'Pending',
              revised_pow_pdf TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_by TEXT
          );
        `);

        await checkAndAddColumn('variation_orders', 'justification_category', 'TEXT', targetPool);
        await checkAndAddColumn('variation_orders', 'justification_details', 'TEXT', targetPool);
        await checkAndAddColumn('variation_orders', 'previous_vo_total', 'NUMERIC DEFAULT 0', targetPool);
        await checkAndAddColumn('variation_orders', 'original_expiry_date', 'DATE', targetPool);

        currentSegment = `${dbLabel} Seg 6: realignments table`;
        await targetPool.query(`
          CREATE TABLE IF NOT EXISTS realignments (
              id SERIAL PRIMARY KEY,
              source_project_id INTEGER,
              target_project_id INTEGER,
              source_ipc TEXT,
              target_ipc TEXT,
              realignment_amount NUMERIC,
              request_date DATE,
              justification TEXT,
              approving_authority TEXT,
              status TEXT DEFAULT 'Pending',
              document_url TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_by TEXT
          );
        `).catch(() => {});

      } catch (poolErr) {
        console.error(`❌ [initDB] ${dbLabel} Initialization Failed at [${currentSegment}]:`, poolErr.message);
        if (dbLabel === "Primary") throw poolErr; 
      }
    }

    // console.log("   [initDB] Completed dual-sync initialization. Finalizing primary database...");

    currentSegment = "Segment 8: backfill time_lapsed_days";
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='engineer_form' AND column_name='time_lapsed') THEN
          UPDATE engineer_form SET time_lapsed_days = time_lapsed WHERE time_lapsed_days IS NULL;
          ALTER TABLE engineer_form DROP COLUMN time_lapsed;
        END IF;
      END $$;
    `).catch(() => {});

    currentSegment = "Segment 9: engineer_form extra columns";
    await checkAndAddColumn('engineer_form', 'number_of_classrooms', 'INTEGER DEFAULT 0');
    await checkAndAddColumn('engineer_form', 'number_of_sites', 'INTEGER DEFAULT 1');
    await checkAndAddColumn('engineer_form', 'number_of_storeys', 'INTEGER DEFAULT 0');
    await checkAndAddColumn('engineer_form', 'program_type', 'TEXT');

    // Migration: Rename status to status_of_construction_phase (Teammate consistency)
    await pool.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='engineer_form' AND column_name='status') THEN
          ALTER TABLE engineer_form RENAME COLUMN status TO status_of_construction_phase;
        END IF;
      END $$;
    `).catch(err => console.error("Migration Error (status rename):", err.message));

    currentSegment = "Segment 12: buildable_spaces and facility tables";
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buildable_spaces (
        space_id SERIAL PRIMARY KEY,
        school_id TEXT REFERENCES school_profiles(school_id),
        iern TEXT,
        space_number INTEGER,
        latitude NUMERIC,
        longitude NUMERIC,
        length NUMERIC,
        width NUMERIC,
        total_area NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await checkAndAddColumn('school_profiles', 'has_buildable_space', 'BOOLEAN');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS facility_repairs (
        repair_id SERIAL PRIMARY KEY,
        school_id TEXT REFERENCES school_profiles(school_id),
        iern TEXT,
        building_no TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS facility_demolitions (
        demolition_id SERIAL PRIMARY KEY,
        school_id TEXT REFERENCES school_profiles(school_id),
        iern TEXT,
        building_no TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS facility_inventory(
        id SERIAL PRIMARY KEY,
        school_id TEXT,
        iern TEXT,
        building_name TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    currentSegment = "Segment 13: teaching_personnel tables";
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teaching_personnel (
        school_id TEXT PRIMARY KEY,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS ph_teachers_list (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure Unit 5 Shifting & Modality columns exist on ph_schools
    const levels = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
    const shiftingPromises = [];
    for (const lvl of levels) {
      shiftingPromises.push(checkAndAddColumn('ph_schools', `shift_${lvl}`, 'TEXT'));
      shiftingPromises.push(checkAndAddColumn('ph_schools', `mode_${lvl}`, 'TEXT'));
    }
    await Promise.all(shiftingPromises);

    // --- New: Integer-based Unit Completion Tracking ---
    const unitCols = ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6', 'unit7', 'unit8'];
    const unitPromises = unitCols.map(col => checkAndAddColumn('ph_schools', col, 'SMALLINT DEFAULT 0'));
    await Promise.all(unitPromises);

    await checkAndAddColumn('ph_teachers_list', 'designations', 'TEXT');

    console.log("✅ DB Init: All migrations completed successfully.");

  } catch (err) {
    console.error(`❌ DB Init Error in segment [${currentSegment}]:`, err.message);
  }
};

// initDB(); // Moved to awaited startup

// --- DATABASE INIT (EXTENDED FOR FINANCE) ---
const initFinanceDB = async () => {
  console.log("   [initFinanceDB] Starting...");
  try {
    // 1. Create Finance Projects Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finance_projects (
        finance_id SERIAL PRIMARY KEY,
        root_id TEXT, 
        region TEXT,
        division TEXT,
        district TEXT,
        legislative_district TEXT,
        school_id TEXT,
        school_name TEXT,
        project_name TEXT,
        total_funds NUMERIC,
        fund_released NUMERIC,
        date_of_release DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // --- MIGRATION: Add root_id to finance_projects if missing ---
    await checkAndAddColumn('finance_projects', 'root_id', 'TEXT');

    // Backfill root_id for existing
    await pool.query(`UPDATE finance_projects SET root_id = 'FIN-' || finance_id WHERE root_id IS NULL;`);

    console.log("✅ DB Init: Finance Projects table verified.");
    console.log("   [initFinanceDB] Completed.");

    // 2. DROP OBSOLETE TABLES
    await pool.query(`DROP TABLE IF EXISTS lgu_forms CASCADE; `);
    await pool.query(`DROP TABLE IF EXISTS functional_divisions CASCADE; `);
    console.log("✅ DB Init: Dropped obsolete 'lgu_forms' and 'functional_divisions' tables.");

    // 3. Create/Update LGU Finance Projects Table (lgu_projects)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lgu_projects (
        lgu_project_id SERIAL PRIMARY KEY,
        region TEXT,
        division TEXT,
        district TEXT,
        legislative_district TEXT,
        school_id TEXT,
        school_name TEXT,
        project_name TEXT,
        total_funds NUMERIC,
        fund_released NUMERIC,
        date_of_release DATE,
        liquidated_amount NUMERIC DEFAULT 0,
        liquidation_date DATE,
        percentage_liquidated NUMERIC DEFAULT 0,
        finance_id INTEGER, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source_agency TEXT,
        contractor_name TEXT,
        lsb_resolution_no TEXT,
        moa_ref_no TEXT,
        moa_date DATE,
        validity_period TEXT,
        contract_duration TEXT,
        date_approved_pow DATE,
        approved_contract_budget NUMERIC,
        schedule_of_fund_release TEXT,
        number_of_tranches INTEGER,
        amount_per_tranche NUMERIC,
        mode_of_procurement TEXT,
        philgeps_ref_no TEXT,
        pcab_license_no TEXT,
        date_contract_signing DATE,
        date_notice_of_award DATE,
        bid_amount NUMERIC,
        latitude TEXT,
        longitude TEXT,
        pow_pdf TEXT,
        dupa_pdf TEXT,
        contract_pdf TEXT,
        project_status TEXT DEFAULT 'Not Yet Started',
        accomplishment_percentage NUMERIC DEFAULT 0,
        status_as_of_date DATE,
        amount_utilized NUMERIC DEFAULT 0,
        nature_of_delay TEXT
      );
    `);

    // Migration for lgu_projects
    await checkAndAddColumn('lgu_projects', 'source_agency', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'contractor_name', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'lsb_resolution_no', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'moa_ref_no', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'moa_date', 'DATE');
    await checkAndAddColumn('lgu_projects', 'validity_period', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'contract_duration', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'date_approved_pow', 'DATE');
    await checkAndAddColumn('lgu_projects', 'approved_contract_budget', 'NUMERIC');
    await checkAndAddColumn('lgu_projects', 'schedule_of_fund_release', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'number_of_tranches', 'INTEGER');
    await checkAndAddColumn('lgu_projects', 'amount_per_tranche', 'NUMERIC');
    await checkAndAddColumn('lgu_projects', 'mode_of_procurement', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'philgeps_ref_no', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'pcab_license_no', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'date_contract_signing', 'DATE');
    await checkAndAddColumn('lgu_projects', 'date_notice_of_award', 'DATE');
    await checkAndAddColumn('lgu_projects', 'bid_amount', 'NUMERIC');
    await checkAndAddColumn('lgu_projects', 'latitude', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'longitude', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'pow_pdf', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'dupa_pdf', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'contract_pdf', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'project_status', "TEXT DEFAULT 'Not Yet Started'");
    await checkAndAddColumn('lgu_projects', 'accomplishment_percentage', 'NUMERIC DEFAULT 0');
    await checkAndAddColumn('lgu_projects', 'status_as_of_date', 'DATE');
    await checkAndAddColumn('lgu_projects', 'amount_utilized', 'NUMERIC DEFAULT 0');
    await checkAndAddColumn('lgu_projects', 'nature_of_delay', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'root_project_id', 'INTEGER');
    await checkAndAddColumn('lgu_projects', 'finance_id', 'INTEGER');

    await pool.query(`
        UPDATE lgu_projects 
        SET root_project_id = lgu_project_id 
        WHERE root_project_id IS NULL;
    `);

    // --- LGU MIGRATIONS: Add missing columns for custom forms ---
    await checkAndAddColumn('lgu_projects', 'ipc', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'lgu_id', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'lgu_name', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'batch_of_funds', 'TEXT');
    await checkAndAddColumn('lgu_projects', 'target_completion_date', 'DATE');
    await checkAndAddColumn('lgu_projects', 'actual_completion_date', 'DATE');
    await checkAndAddColumn('lgu_projects', 'notice_to_proceed', 'DATE');

    // --- LGU IMAGES TABLE ---
    await pool.query(`
        CREATE TABLE IF NOT EXISTS lgu_image (
            id SERIAL PRIMARY KEY,
            project_id INT REFERENCES lgu_projects(lgu_project_id) ON DELETE CASCADE,
            image_data TEXT,
            uploaded_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log("✅ Finance DB Init: lgu_projects schema verified.");

  } catch (err) {
    console.error("❌ Finance DB Init Error:", err.message);
  }
};

// --- PSIP DATABASE INIT ---
const initMasterlistDB = async () => {
  console.log("   [initMasterlistDB] Starting...");
  try {
    await pool.query('SET lock_timeout = 15000');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS masterlist_26_30 (
          "Index" integer PRIMARY KEY,
          "congressman" character varying(255),
          "governor" character varying(255),
          "mayor" character varying(255),
          "region" character varying(100),
          "division" character varying(100),
          "school_id" character varying(50),
          "lis_nsbi_school_id_24_25" character varying(50),
          "in_masterlist_with_gov" character varying(50),
          "school_name" text,
          "municipality" character varying(100),
          "legislative_district" character varying(100),
          "priority_index" numeric,
          "cl_requirement" integer,
          "est_classroom_shortage" integer,
          "no_of_sites" integer,
          "proposed_no_of_cl" integer,
          "no_of_unit" integer,
          "sty_count" integer,
          "cl_count" integer,
          "proposed_scope_of_work" text,
          "number_of_workshops" text,
          "workshop_types" text,
          "other_design_configurations" text,
          "proposed_funding_year" integer,
          "est_classroom_cost" numeric,
          "project_implementor" character varying(255),
          "cl_sty_ratio" character varying(50),
          "province" character varying(100)
      );
    `);

    // Migration: Rename leg_district to legislative_district
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'masterlist_26_30' AND column_name = 'leg_district') THEN
          ALTER TABLE masterlist_26_30 RENAME COLUMN leg_district TO legislative_district;
        END IF;
      END $$;
    `);
    await checkAndAddColumn('masterlist_26_30', 'province', 'character varying(100)');
    await checkAndAddColumn('masterlist_26_30', 'sty_count', 'integer');
    await checkAndAddColumn('masterlist_26_30', 'cl_count', 'integer');

    console.log("     [Segment: masterlist province sync]");
    // Optimization: Add index on school_id first if not present
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_masterlist_school_id ON masterlist_26_30(school_id);`);

    if (!(await hasMigrationRun('masterlist_province_sync_v1'))) {
      // Only update if there are NULL provinces to avoid long scans on every restart
      const nullCheck = await pool.query(`SELECT 1 FROM masterlist_26_30 WHERE province IS NULL LIMIT 1`);
      if (nullCheck.rowCount > 0) {
        console.log("     -> Backfilling provinces in masterlist_26_30...");
        await pool.query(`
          UPDATE masterlist_26_30 m
          SET province = s.province
          FROM schools s
          WHERE m.school_id::text = s.school_id::text
          AND m.province IS NULL;
        `);
        console.log("     -> Province backfill completed.");
      }
      await markMigrationDone('masterlist_province_sync_v1');
    } else {
      console.log("     -> Skipped Province backfill (Already Run).");
    }

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_masterlist_region ON masterlist_26_30("region");`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_masterlist_funding_year ON masterlist_26_30("proposed_funding_year");`);
    console.log("✅ DB Init: Masterlist (Cloned) table verified.");
    console.log("   [initMasterlistDB] Completed.");
  } catch (err) {
    console.error("❌ Masterlist DB Init Error:", err.message);
  }
};
// initMasterlistDB(); // Moved to awaited startup

// --- PSIP IMPORT ENDPOINT (One-Time) ---
/* app.get('/api/psip/import', async (req, res) => {
  const client = await pool.connect();
  try {
    // Check if already imported
    const countResult = await client.query('SELECT COUNT(*) FROM psip_masterlist');
    const existingCount = parseInt(countResult.rows[0].count);
    if (existingCount > 0) {
      return res.json({ message: `Already imported. ${existingCount} rows exist. Add ?force=true to re-import.`, count: existingCount });
    }

    // Dynamic import of xlsx
    const { createRequire: cr } = await import('module');
    const requireSync = cr(import.meta.url);
    const XLSX = requireSync('xlsx');

    // Find the file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '..', 'public', 'Masterlist 2026-2030 139706 CL - with Cong-Gov-Mayor.xlsx');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Excel file not found at: ' + filePath });
    }

    console.log('📥 PSIP Import: Reading Excel file...');
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['MASTERLIST'];
    if (!ws) return res.status(400).json({ error: 'MASTERLIST sheet not found' });

    console.log('📥 PSIP Import: Converting to JSON...');
    const data = XLSX.utils.sheet_to_json(ws);
    console.log(`📥 PSIP Import: ${data.length} rows parsed.`);

    // Truncate if force
    if (req.query.force === 'true') {
      await client.query('TRUNCATE TABLE psip_masterlist RESTART IDENTITY');
      console.log('🗑️ PSIP Import: Table truncated (force mode).');
    }

    // Batch insert
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];

      batch.forEach((row, rIdx) => {
        const offset = rIdx * 14;
        values.push(
          row['CONGRESSMAN'] || null,
          row['GOVERNOR'] || null,
          row['MAYOR'] || null,
          row['Region'] || null,
          row['Division'] || null,
          row['School ID'] ? String(row['School ID']) : null,
          row['School Name'] || null,
          row['Municipality'] || null,
          row['Leg District'] || null,
          parseFloat(row['PRIORITY INDEX']) || null,
          parseInt(row['CL Requirement']) || 0,
          parseInt(row['Estimated Classroom Shortage']) || 0,
          parseInt(row['No. of Sites']) || 0,
          parseInt(row['Proposed No. of Classrooms']) || 0,
          parseInt(row['No. of Unit']) || 0,
          parseInt(row['STY']) || 0,
          parseInt(row['CL']) || 0,
          row['Proposed Scope Of Work'] || null,
          parseInt(row['Number of Workshops']) || 0,
          row['Workshop Type/s'] || null,
          parseInt(row['PROPOSED FUNDING YEAR']) || null,
          parseFloat(row['Est. Cost of Classrooms']) || 0,
          parseInt(row['CL/STY']) || 0
        );
        const p = Array.from({ length: 23 }, (_, k) => `$${offset + k + 1}`);
        // Fix: offset is based on 23 columns
        const realOffset = rIdx * 23;
        const realP = Array.from({ length: 23 }, (_, k) => `$${realOffset + k + 1}`);
        placeholders.push(`(${realP.join(',')})`);
      });

      // Rebuild values correctly
      const correctValues = [];
      batch.forEach((row) => {
        correctValues.push(
          row['CONGRESSMAN'] || null,
          row['GOVERNOR'] || null,
          row['MAYOR'] || null,
          row['Region'] || null,
          row['Division'] || null,
          row['School ID'] ? String(row['School ID']) : null,
          row['School Name'] || null,
          row['Municipality'] || null,
          row['Leg District'] || null,
          parseFloat(row['PRIORITY INDEX']) || null,
          parseInt(row['CL Requirement']) || 0,
          parseInt(row['Estimated Classroom Shortage']) || 0,
          parseInt(row['No. of Sites']) || 0,
          parseInt(row['Proposed No. of Classrooms']) || 0,
          parseInt(row['No. of Unit']) || 0,
          parseInt(row['STY']) || 0,
          parseInt(row['CL']) || 0,
          row['Proposed Scope Of Work'] || null,
          parseInt(row['Number of Workshops']) || 0,
          row['Workshop Type/s'] || null,
          parseInt(row['PROPOSED FUNDING YEAR']) || null,
          parseFloat(row['Est. Cost of Classrooms']) || 0,
          parseInt(row['CL/STY']) || 0
        );
      });

      const rebuildPlaceholders = [];
      batch.forEach((_, rIdx) => {
        const realOffset = rIdx * 23;
        const realP = Array.from({ length: 23 }, (_, k) => `$${realOffset + k + 1}`);
        rebuildPlaceholders.push(`(${realP.join(',')})`);
      });

      const query = `
        INSERT INTO psip_masterlist (
          congressman, governor, mayor, region, division, school_id, school_name,
          municipality, legislative_district, priority_index, cl_requirement, estimated_shortage,
          no_of_sites, proposed_classrooms, no_of_units, storeys, classrooms,
          scope_of_work, workshops, workshop_types, funding_year, estimated_cost, cl_per_storey
        ) VALUES ${rebuildPlaceholders.join(',')}
      `;

      await client.query(query, correctValues);
      inserted += batch.length;
      if (inserted % 5000 === 0 || inserted === data.length) {
        console.log(`📥 PSIP Import: ${inserted}/${data.length} rows inserted...`);
      }
    }

    console.log(`✅ PSIP Import Complete: ${inserted} rows inserted.`);
    res.json({ success: true, count: inserted });

  } catch (err) {
    console.error('❌ PSIP Import Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}); */

// --- REFERENCE API ENDPOINTS ---
app.get('/api/reference/building-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT building_type 
      FROM nsbi_24_25_buildings 
      WHERE building_type IS NOT NULL 
      ORDER BY building_type ASC;
    `);
    res.json(result.rows.map(row => row.building_type));
  } catch (err) {
    console.error('❌ Error fetching building types:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reference/funding-years', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT funding_year 
      FROM engineer_form 
      WHERE funding_year IS NOT NULL 
      ORDER BY funding_year DESC;
    `);
    res.json(result.rows.map(row => row.funding_year));
  } catch (err) {
    console.error('❌ Error fetching funding years:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reference/functional-divisions', async (req, res) => {
  try {
    const result = await pool.query('SELECT governance_level, functional_division FROM ph_offices ORDER BY functional_division ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching functional divisions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reference/efd-locations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT region, division, district, province, municipality, legislative_district 
      FROM all_locations 
      ORDER BY region, division, province, municipality;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching EFD locations:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- MASTERLIST API ENDPOINTS ---

app.get('/api/import-masterlist-teachers/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query(
      'SELECT "first", "middle", "last", "position" FROM teachers_list WHERE "school.id" = $1',
      [schoolId]
    );

    const mappedData = result.rows.map(t => {
      let fName = '';
      if (t.last) fName += t.last.toUpperCase();
      if (t.first) {
        if (fName) fName += ', ';
        fName += t.first.toUpperCase();
      }
      if (t.middle) {
        if (fName) fName += ' ';
        fName += t.middle.toUpperCase().charAt(0) + '.';
      }

      return {
        full_name: fName || 'UNKNOWN',
        position: t.position || 'TBD'
      };
    });

    res.json(mappedData);
  } catch (err) {
    console.error('❌ Error importing teachers:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug-integrity', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const results = {
      count: (await client.query('SELECT COUNT(*) FROM masterlist_26_30')).rows[0].count,
      shortage_sum: (await client.query('SELECT SUM(est_classroom_shortage) as val FROM masterlist_26_30')).rows[0].val,
      duplicates: (await client.query(`
                SELECT "school_id", "sty_count", "cl_count", "proposed_funding_year", COUNT(*)
                FROM masterlist_26_30
                GROUP BY "school_id", "sty_count", "cl_count", "proposed_funding_year"
                HAVING COUNT(*) > 1
                LIMIT 5
            `)).rows
    };
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

// Helper for dynamic WHERE clause
const buildMasterlistQuery = (baseQuery, filters) => {
  const { region, province, division, municipality, legislative_district } = filters;
  let where = [];
  let params = [];
  let pIdx = 1;

  if (region) { where.push(`"region" = $${pIdx++}`); params.push(region); }
  if (province) { where.push(`"province" = $${pIdx++}`); params.push(province); }
  if (division) { where.push(`"division" = $${pIdx++}`); params.push(division); }
  if (municipality) { where.push(`"municipality" = $${pIdx++}`); params.push(municipality); }
  if (legislative_district) { where.push(`"legislative_district" = $${pIdx++}`); params.push(legislative_district); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return { query: `${baseQuery}${whereClause ? ' ' + whereClause : ''}`, params };
};

// Filter options (Cascading)
app.get('/api/masterlist/filters', async (req, res) => {
  try {
    const { region, province, division, municipality, target } = req.query;

    let query, params;
    if (municipality) {
      // Fetch Leg Districts for Municipality
      query = 'SELECT DISTINCT "legislative_district" FROM masterlist_26_30 WHERE "municipality" = $1 AND "legislative_district" IS NOT NULL ORDER BY "legislative_district"';
      params = [municipality];
    } else if (division) {
      // Fetch Municipalities for Division
      query = 'SELECT DISTINCT "municipality" FROM masterlist_26_30 WHERE "division" = $1 AND "municipality" IS NOT NULL ORDER BY "municipality"';
      params = [division];
    } else if (target === 'division' && region) {
      // Direct jump from Region to Division (skipping Province)
      query = 'SELECT DISTINCT "division" FROM masterlist_26_30 WHERE "region" = $1 AND "division" IS NOT NULL ORDER BY "division"';
      params = [region];
    } else if (province) {
      // Fetch Divisions for Province
      query = 'SELECT DISTINCT "division" FROM masterlist_26_30 WHERE "province" = $1 AND "division" IS NOT NULL ORDER BY "division"';
      params = [province];
    } else if (region) {
      // Fetch Provinces for Region
      query = 'SELECT DISTINCT "province" FROM masterlist_26_30 WHERE "region" = $1 AND "province" IS NOT NULL ORDER BY "province"';
      params = [region];
    } else {
      // Fetch Regions
      query = 'SELECT DISTINCT "region" FROM masterlist_26_30 WHERE "region" IS NOT NULL ORDER BY "region"';
      params = [];
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map(r => Object.values(r)[0]));
  } catch (err) {
    console.error('❌ Masterlist Filters Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generic Lists for Assignments (using schools table with metadata)
app.get('/api/lists/provinces', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT province, region FROM schools WHERE province IS NOT NULL ORDER BY province');
    res.json(result.rows); // Returns [{province, region}, ...]
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lists/municipalities', async (req, res) => {
  try {
    const { province } = req.query;
    let query = 'SELECT DISTINCT municipality, region, division, province FROM schools WHERE municipality IS NOT NULL';
    let params = [];
    if (province) {
      query += ' AND province = $1';
      params.push(province);
    }
    query += ' ORDER BY municipality';
    const result = await pool.query(query, params);
    res.json(result.rows); // Returns [{municipality, region, division, province}, ...]
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NEW LAZY MIGRATION LOGIN ENDPOINT ---
app.post('/api/auth/migrate-login', async (req, res) => {
  if (!req.body) {
    console.error("[AUTH DEBUG] req.body is UNDEFINED at migrate-login. Content-Type:", req.headers['content-type']);
    return res.status(400).json({ success: false, error: "Missing request body." });
  }

  const { email, school_id, password } = req.body;
  const identifier = (school_id || email || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: "Identifier and password are required. Got: " + JSON.stringify({ identifier, hasPassword: !!password }) });
  }

  try {
    const isSchoolId = !!school_id || /^\d{6,}$/.test(identifier);
    console.log(`[AUTH DEBUG] Migrate-Login: ${identifier} (isSchoolId: ${isSchoolId})`);

    // 1. Fetch user from PostgreSQL
    console.log(`[MIGRATE LOGIN] Running SQL query...`);
    const SELECT_COLS = `uid, email, role, region, division, office, account_category, passcode, password_hash, password_salt, hash_version, first_name, last_name, school_id, province, city`;

    console.log(`[DEBUG LOGIN] Reached handler for: ${identifier}`);
    const query = isSchoolId
      ? `SELECT ${SELECT_COLS} FROM users WHERE school_id = $1`
      : `SELECT ${SELECT_COLS} FROM users WHERE LOWER(email) = $1`;

    console.log(`[DEBUG LOGIN] Query prepared. Waiting for pool...`);
    const userRes = await pool.query(query, [isSchoolId ? identifier : identifier.toLowerCase()]);
    console.log(`[DEBUG LOGIN] Query completed! Rows found: ${userRes.rowCount}`);

    if (userRes.rowCount === 0) {
      console.warn(`[MIGRATE LOGIN] User not found: ${identifier}`);
      return res.status(401).json({ success: false, error: "Username does not exist. Kindly register first." });
    }

    const user = userRes.rows[0];

    // 2. Determine which hash algorithm to check against
    let isValid = false;

    if (user.hash_version === 'bcrypt') {
      // User has already bumped to standard bcrypt
      isValid = await bcrypt.compare(password, user.password_hash);
      console.log(`[AUTH DEBUG] Bcrypt match for ${identifier}: ${isValid}`);
    }
    else if (user.hash_version === 'firebase') {
      // Check if server is configured for Firebase Scrypt
      if (!process.env.FIREBASE_HASH_SIGNER_KEY) {
        console.error("CRITICAL: FIREBASE_HASH_SIGNER_KEY is missing from .env");
        return res.status(500).json({ success: false, error: "Server configuration error during migration." });
      }

      const scrypt = new FirebaseScrypt({
        memCost: parseInt((process.env.FIREBASE_HASH_MEM_COST || "14").replace(/"/g, '')),
        rounds: parseInt((process.env.FIREBASE_HASH_ROUNDS || "8").replace(/"/g, '')),
        saltSeparator: (process.env.FIREBASE_HASH_SALT_SEPARATOR || "").replace(/"/g, ''),
        signerKey: (process.env.FIREBASE_HASH_SIGNER_KEY || "").replace(/"/g, '')
      });

      isValid = await scrypt.verify(password, user.password_salt, user.password_hash);

      // --- THE LAZY UPGRADE ---
      if (isValid) {
        console.log(`[LAZY MIGRATION] Upgrading hash for user: ${user.email}`);
        const saltRounds = 10;
        const newBcryptHash = await bcrypt.hash(password, saltRounds);

        await pool.query(
          `UPDATE users SET password_hash = $1, password_salt = NULL, hash_version = 'bcrypt' WHERE uid = $2`,
          [newBcryptHash, user.uid]
        );
      }
    } else {
      // Catch-all for unknown hash versions
      return res.status(401).json({ success: false, error: "Unsupported hash algorithm." });
    }

    if (!isValid) {
      console.warn(`[MIGRATE LOGIN] Password mismatch for: ${identifier}`);
      return res.status(401).json({ success: false, error: "The username exists but does not match the password you provided." });
    }

    console.log(`[MIGRATE LOGIN] Success for: ${identifier} (Role: ${user.role})`);

    // --- AUTO-NORMALIZE ACCOUNT CATEGORY ---
    let finalCategory = user.account_category;
    if (!finalCategory || user.role === 'EFD' || user.role === 'HRODI' || user.account_category === 'DepEd Engineer' || user.account_category === 'HRODI Engineer') {
      if (user.role === 'EFD' || user.role === 'HRODI' || user.role === 'EFD Engineer') {
        finalCategory = 'EFD Engineer';
      } else if (user.role === 'DepEd Engineer' || user.role === 'Division Engineer') {
        finalCategory = 'Division Engineer';
      } else {
        finalCategory = user.role;
      }

      // Lazy update the DB if it changed or was null
      if (finalCategory !== user.account_category) {
        console.log(`[MIGRATE LOGIN] Normalizing category for ${identifier}: ${finalCategory}`);
        await pool.query('UPDATE users SET account_category = $1 WHERE uid = $2', [finalCategory, user.uid]);
      }
    }

    // 3. User is verified! Generate a JWT session token
    const token = jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD',
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token: token,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        region: user.region,
        division: user.division,
        account_category: finalCategory,
        passcode: user.passcode,
        first_name: user.first_name,
        last_name: user.last_name,
        school_id: user.school_id,
        office: user.office,
        province: user.province,
        city: user.city,
        firstName: user.first_name, // Compatibility
        lastName: user.last_name     // Compatibility
      }
    });

  } catch (err) {
    console.error("Migration Login Error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
  }
});

// --- GET CURRENT USER (PROTECTED) ---
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;
    const result = await pool.query(
      'SELECT uid, email, role, region, division, office, account_category, first_name, last_name, school_id, passcode, province, city FROM users WHERE uid = $1',
      [uid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = result.rows[0];
    res.json({
      uid: user.uid,
      email: user.email,
      role: user.role,
      region: user.region,
      division: user.division,
      account_category: user.account_category,
      first_name: user.first_name,
      last_name: user.last_name,
      school_id: user.school_id,
      passcode: user.passcode,
      office: user.office,
      province: user.province,
      city: user.city
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/auth/setup-pin', async (req, res) => {
  const { uid, school_id, email, pin } = req.body;
  const identifier = uid || school_id || email;

  if (!identifier || !pin || pin.length !== 6) {
    return res.status(400).json({ success: false, error: "Valid 6-digit PIN and identifier are required." });
  }

  try {
    // Determine which column to match on
    let whereClause, param;
    if (uid) {
      whereClause = 'uid = $2';
      param = uid;
    } else if (school_id) {
      whereClause = 'school_id = $2';
      param = school_id.trim();
    } else {
      whereClause = 'LOWER(email) = $2';
      param = email.trim().toLowerCase();
    }

    const result = await pool.query(
      `UPDATE users SET passcode = $1 WHERE ${whereClause} RETURNING uid`,
      [pin, param]
    );


    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    return res.json({ success: true, message: "PIN set successfully." });
  } catch (err) {
    console.error("Setup PIN Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

app.post('/api/auth/pin-login', async (req, res) => {
  const { email, school_id, pin } = req.body;
  const identifier = (school_id || email || '').trim();

  if (!identifier || !pin) {
    return res.status(400).json({ success: false, error: "Identifier and PIN are required." });
  }

  try {
    const isSchoolId = !!school_id || /^\d{6,}$/.test(identifier);
    console.log(`[AUTH DEBUG] Pin-Login: ${identifier} (isSchoolId: ${isSchoolId})`);

    // Unified Identifier Lookup (Strict Users Table)
    const selectCols = 'uid, email, role, region, division, office, account_category, passcode, first_name, last_name, school_id';
    const query = isSchoolId
      ? `SELECT ${selectCols} FROM users WHERE school_id = $1`
      : `SELECT ${selectCols} FROM users WHERE LOWER(email) = $1`;

    const userRes = await pool.query(query, [isSchoolId ? identifier : identifier.toLowerCase()]);


    if (userRes.rowCount === 0) {
      return res.status(401).json({ success: false, error: "Username does not exist. Kindly register first." });
    }

    const user = userRes.rows[0];
    if (!user.passcode) {
      return res.status(401).json({ success: false, error: "No PIN setup for this account." });
    }

    // Plain-text comparison for passcode
    const isValidPin = (pin === user.passcode);
    console.log(`[AUTH DEBUG] Pin match for ${identifier}: ${isValidPin} (Input: ${pin}, DB: ${user.passcode})`);
    if (!isValidPin) {
      return res.status(401).json({ success: false, error: "The username exists but does not match the PIN you provided." });
    }

    // --- AUTO-NORMALIZE ACCOUNT CATEGORY ---
    let finalCategory = user.account_category;
    if (!finalCategory || user.role === 'EFD' || user.role === 'HRODI' || user.account_category === 'DepEd Engineer' || user.account_category === 'HRODI Engineer') {
      if (user.role === 'EFD' || user.role === 'HRODI' || user.role === 'EFD Engineer') {
        finalCategory = 'EFD Engineer';
      } else if (user.role === 'DepEd Engineer' || user.role === 'Division Engineer') {
        finalCategory = 'Division Engineer';
      } else {
        finalCategory = user.role;
      }
    }

    // 3. User is verified! Generate a JWT session token
    const token = jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD',
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token: token,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        region: user.region,
        division: user.division,
        account_category: finalCategory,
        first_name: user.first_name,
        last_name: user.last_name,
        school_id: user.school_id,
        passcode: user.passcode,
        office: user.office,
        firstName: user.first_name, // Compatibility
        lastName: user.last_name    // Compatibility
      }
    });

  } catch (err) {
    console.error("PIN Login Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

app.get('/api/lists/divisions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT MAX("Division") as division, MAX("Region") as region 
      FROM "schools_IERN" 
      WHERE "Division" IS NOT NULL AND "Region" IS NOT NULL 
      GROUP BY UPPER(TRIM("Division"))
      ORDER BY division ASC
    `);
    res.json(result.rows); // Returns [{division, region}, ...]
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Summary totals
app.get('/api/masterlist/summary', async (req, res) => {
  try {
    const base = `
      SELECT
        COUNT(*) as total_projects,
        COUNT(DISTINCT "school_id") as total_schools,
        COALESCE(SUM("proposed_no_of_cl"), 0) as total_classrooms,
        COALESCE(SUM("est_classroom_cost"), 0) as total_cost,
        COALESCE(SUM("est_classroom_shortage"), 0) as total_shortage,
        COALESCE(SUM("no_of_sites"), 0) as total_sites,
        COUNT(DISTINCT "region") as total_regions,
        COUNT(DISTINCT "congressman") as total_congressmen,
        COUNT(DISTINCT "governor") as total_governors,
        COUNT(DISTINCT "mayor") as total_mayors
      FROM masterlist_26_30
    `;
    const { query, params } = buildMasterlistQuery(base, req.query);
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Masterlist Summary Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// By Region
app.get('/api/masterlist/by-region', async (req, res) => {
  try {
    const base = `
      SELECT
        "region" as region,
        COUNT(*) as projects,
        COUNT(DISTINCT "school_id") as schools,
        COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms,
        COALESCE(SUM("est_classroom_cost"), 0) as cost,
        COALESCE(SUM("est_classroom_shortage"), 0) as shortage
      FROM masterlist_26_30
    `;
    const { query, params } = buildMasterlistQuery(base, req.query);
    const finalQuery = `${query} ${query.includes('WHERE') ? 'AND' : 'WHERE'} "region" IS NOT NULL GROUP BY "region" ORDER BY classrooms DESC`;
    const result = await pool.query(finalQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist By Region Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// By Funding Year
app.get('/api/masterlist/by-funding-year', async (req, res) => {
  try {
    const base = `
      SELECT
        "proposed_funding_year" as funding_year,
        COUNT(*) as projects,
        COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms,
        COALESCE(SUM("est_classroom_cost"), 0) as cost
      FROM masterlist_26_30
    `;
    const { query, params } = buildMasterlistQuery(base, req.query);
    const finalQuery = `${query} ${query.includes('WHERE') ? 'AND' : 'WHERE'} "proposed_funding_year" IS NOT NULL GROUP BY "proposed_funding_year" ORDER BY "proposed_funding_year"`;
    const result = await pool.query(finalQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist By Year Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// By Storey Type
app.get('/api/masterlist/by-storey', async (req, res) => {
  try {
    const base = `
      SELECT
        "sty_count" as storeys,
        COUNT(*) as projects,
        COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms,
        COALESCE(SUM("est_classroom_cost"), 0) as cost
      FROM masterlist_26_30
    `;
    const { query, params } = buildMasterlistQuery(base, req.query);
    const finalQuery = `${query} ${query.includes('WHERE') ? 'AND' : 'WHERE'} "sty_count" > 0 GROUP BY "sty_count" ORDER BY "sty_count"`;
    const result = await pool.query(finalQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist By Storey Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Distribution Chart API (Dynamic Grouping Strategy)
app.get('/api/masterlist/distribution', async (req, res) => {
  try {
    const { groupBy, region, division, municipality, legislative_district } = req.query;

    // Validate groupBy to prevent SQL injection issues
    const validGroupBys = ['region', 'division', 'municipality', 'legislative_district'];
    const groupField = validGroupBys.includes(groupBy) ? groupBy : 'region';

    const base = `
      SELECT
        "${groupField}" as name,
        COUNT(*) as projects,
        COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms,
        COALESCE(SUM("est_classroom_cost"), 0) as cost,
        COUNT(DISTINCT "school_id") as schools,
        COALESCE(SUM("est_classroom_shortage"), 0) as shortage,
        COALESCE(SUM("no_of_sites"), 0) as sites
      FROM masterlist_26_30
    `;
    const { query, params } = buildMasterlistQuery(base, { region, division, municipality, legislative_district });

    // Need to exclude nulls from grouping
    const finalQuery = `${query} ${query.includes('WHERE') ? 'AND' : 'WHERE'} "${groupField}" IS NOT NULL GROUP BY "${groupField}" ORDER BY classrooms DESC`;

    const result = await pool.query(finalQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist Distribution Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Distribution Projects API (Lists specific projects for drilldown)
app.get('/api/masterlist/distribution-projects', async (req, res) => {
  try {
    const { region, division, municipality, legislative_district, limit = 50, offset = 0 } = req.query;

    const base = `
      SELECT
        "school_id", "school_name", "region", "division", "municipality", "legislative_district",
        "proposed_no_of_cl" as classrooms,
        "est_classroom_cost" as cost,
        "proposed_funding_year" as funding_year,
        "sty_count", "cl_count"
      FROM masterlist_26_30
    `;
    const { query, params } = buildMasterlistQuery(base, { region, division, municipality, legislative_district });

    const finalQuery = `${query} ORDER BY "proposed_no_of_cl" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const finalParams = [...params, Number(limit), Number(offset)];

    const result = await pool.query(finalQuery, finalParams);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist Projects Fetch Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// By Storey Breakdown (e.g., 2sty4cl)
app.get('/api/masterlist/storey-breakdown', async (req, res) => {
  try {
    const base = `
      SELECT
        "sty_count" as storey,
        "cl_count" as classrooms,
        COUNT(*) as count
      FROM masterlist_26_30
    `;
    const { query, params } = buildMasterlistQuery(base, req.query);
    const finalQuery = `${query} ${query.includes('WHERE') ? 'AND' : 'WHERE'} "sty_count" IS NOT NULL AND "cl_count" IS NOT NULL GROUP BY "sty_count", "cl_count" ORDER BY "sty_count", "cl_count"`;
    const result = await pool.query(finalQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist Storey Breakdown Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Masterlist Prototype Schools (Detailed list for drilldown modal)
app.get('/api/masterlist/prototype-schools', async (req, res) => {
  try {
    const { sty, cl, region, division, municipality, legislative_district, version } = req.query;
    
    // Base selection with aliases for the frontend ProjectListModal
    const base = `
      SELECT
        "school_id",
        "school_name",
        ("sty_count" || ' STOREY ' || "cl_count" || ' CL construction') AS "project_name",
        "est_classroom_cost" AS "amount",
        "est_classroom_shortage" AS "shortage",
        "assigned_to" AS "masterlist_status",
        "region",
        "division",
        "municipality",
        "legislative_district"
      FROM masterlist_26_30
    `;
    
    // We manually build filters to handle case-insensitivity and version
    let where = [];
    let params = [];
    let pIdx = 1;

    if (region) { where.push(`UPPER(TRIM("region")) = UPPER(TRIM($${pIdx++}))`); params.push(region); }
    if (division) { where.push(`UPPER(TRIM("division")) = UPPER(TRIM($${pIdx++}))`); params.push(division); }
    if (municipality) { where.push(`UPPER(TRIM("municipality")) = UPPER(TRIM($${pIdx++}))`); params.push(municipality); }
    if (legislative_district) { where.push(`UPPER(TRIM("legislative_district")) = UPPER(TRIM($${pIdx++}))`); params.push(legislative_district); }
    if (version) { where.push(`"proposed_funding_year" = $${pIdx++}`); params.push(Number(version)); }
    if (sty) { where.push(`"sty_count" = $${pIdx++}`); params.push(Number(sty)); }
    if (cl) { where.push(`"cl_count" = $${pIdx++}`); params.push(Number(cl)); }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const finalQuery = `${base} ${whereClause} ORDER BY "school_name" ASC`;
    
    const result = await pool.query(finalQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist Prototype Schools Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Storey breakdown for engineer_form (implementation data)
app.get('/api/monitoring/engineer-storey-breakdown', async (req, res) => {
  try {
    const { region, division } = req.query;
    let where = [];
    let params = [];
    let pIdx = 1;

    if (region) { where.push(`UPPER(TRIM(region)) = UPPER(TRIM($${pIdx++}))`); params.push(region); }
    if (division) { where.push(`UPPER(TRIM(division)) = UPPER(TRIM($${pIdx++}))`); params.push(division); }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      WITH LatestProjects AS (
        SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
          number_of_storeys, number_of_classrooms, region, division
        FROM engineer_form
        ORDER BY COALESCE(ipc, project_id::text), created_at DESC
      )
      SELECT 
        number_of_storeys as storey, 
        number_of_classrooms as classrooms, 
        COUNT(*) as count
      FROM LatestProjects
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} number_of_storeys IS NOT NULL AND number_of_classrooms IS NOT NULL
      GROUP BY number_of_storeys, number_of_classrooms
      ORDER BY number_of_storeys, number_of_classrooms
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Engineer Storey Breakdown Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get schools for a specific storey breakdown (prototype)
app.get('/api/masterlist/prototype-schools', async (req, res) => {
  try {
    const { sty, cl, region, division, municipality, legislative_district } = req.query;

    let baseWhere = [`"sty_count" = $1`, `"cl_count" = $2`];
    let pIdx = 3;
    let params = [Number(sty), Number(cl)];

    if (region) { baseWhere.push(`"region" = $${pIdx++}`); params.push(region); }
    if (division) { baseWhere.push(`"division" = $${pIdx++}`); params.push(division); }
    if (municipality && municipality !== 'undefined') { baseWhere.push(`"municipality" = $${pIdx++}`); params.push(municipality); }
    if (legislative_district && legislative_district !== 'undefined') { baseWhere.push(`"legislative_district" = $${pIdx++}`); params.push(legislative_district); }

    const query = `
      SELECT 
        "school_id", 
        "school_name", 
        "proposed_no_of_cl" as classrooms, 
        "est_classroom_shortage" as shortage,
        "est_classroom_cost" as cost
      FROM masterlist_26_30 
      WHERE ${baseWhere.join(' AND ')}
      ORDER BY classrooms DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist Prototype Schools Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get projects for a specific storey breakdown (prototype) from engineer_form
app.get('/api/monitoring/engineer-prototype-projects', async (req, res) => {
  try {
    const { sty, cl, region, division } = req.query;
    let params = [Number(sty), Number(cl)];
    let whereClauses = [`e.sty_count = $1`, `e.cl_count = $2`];
    let pIdx = 3;

    if (region) { whereClauses.push(`e.region = $${pIdx++}`); params.push(region); }
    if (division) { whereClauses.push(`e.division = $${pIdx++}`); params.push(division); }

    const query = `
      WITH LatestProjects AS (
          SELECT DISTINCT ON (COALESCE(e.ipc, e.project_id::text)) 
            e.project_id, e.school_name, e.project_name, e.school_id, e.division, e.region, 
            e.status_of_construction_phase AS status, e.ipc, e.accomplishment_percentage,
            e.approved_budget_for_contract, e.number_of_storeys, e.number_of_classrooms
          FROM engineer_form e
          ORDER BY COALESCE(e.ipc, e.project_id::text), e.project_id DESC
      )
      SELECT 
        p.project_id AS id, 
        p.school_id, 
        p.school_name, 
        p.project_name, 
        p.approved_budget_for_contract AS amount,
        p.status AS masterlist_status,
        p.region, 
        p.division,
        p.accomplishment_percentage
      FROM LatestProjects p
      WHERE p.number_of_storeys = $1 AND p.number_of_classrooms = $2
      ${region ? `AND p.region = $${pIdx++}` : ''}
      ${division ? `AND p.division = $${pIdx++}` : ''}
      ORDER BY p.school_name ASC
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Engineer Prototype Projects Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Partnerships (Congressman / Governor / Mayor)
app.get('/api/masterlist/partnerships', async (req, res) => {
  try {
    const { region, division, municipality, legislative_district } = req.query;
    const { query: whereBase, params } = buildMasterlistQuery('', req.query);
    const whereClause = whereBase.trim() ? `AND ${whereBase.replace('WHERE', '').trim()}` : '';

    const resultsArr = await Promise.all([
      pool.query(`
        SELECT "governor" as name, COUNT(*) as projects, COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms
        FROM masterlist_26_30 WHERE prov_implemented = true ${whereClause}
        GROUP BY "governor" ORDER BY classrooms DESC LIMIT 20
      `, params),
      pool.query(`
        SELECT "mayor" as name, COUNT(*) as projects, COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms
        FROM masterlist_26_30 WHERE muni_implemented = true ${whereClause}
        GROUP BY "mayor" ORDER BY classrooms DESC LIMIT 20
      `, params),
      pool.query(`
        SELECT "mayor" as name, COUNT(*) as projects, COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms
        FROM masterlist_26_30 WHERE city_implemented = true ${whereClause}
        GROUP BY "mayor" ORDER BY classrooms DESC LIMIT 20
      `, params),
      pool.query(`
        SELECT 'DPWH' as name, COUNT(*) as projects, COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms
        FROM masterlist_26_30 WHERE dpwh_implemented = true ${whereClause}
      `, params),
      pool.query(`
        SELECT 'DepEd' as name, COUNT(*) as projects, COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms
        FROM masterlist_26_30 WHERE deped_implemented = true ${whereClause}
      `, params),
      pool.query(`
        SELECT 'CSO/NGO' as name, COUNT(*) as projects, COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms
        FROM masterlist_26_30 WHERE cso_ngo_implemented = true ${whereClause}
      `, params),
      pool.query(`
        SELECT 'Multiple Agencies' as name, COUNT(*) as projects, COALESCE(SUM("proposed_no_of_cl"), 0) as classrooms, COALESCE(SUM("est_classroom_cost"), 0) as cost
        FROM masterlist_26_30 
        WHERE (
          COALESCE(prov_implemented::int, 0) + 
          COALESCE(muni_implemented::int, 0) + 
          COALESCE(city_implemented::int, 0) + 
          COALESCE(dpwh_implemented::int, 0) + 
          COALESCE(deped_implemented::int, 0) + 
          COALESCE(cso_ngo_implemented::int, 0)
        ) > 1 AND (resolved_partnership IS NULL OR resolved_partnership = '') ${whereClause}
      `, params),
      // New: Count assigned congressional initiatives (Filtered)
      (() => {
        let whereArr = [];
        let pArr = [];
        let idx = 1;
        if (region) { whereArr.push(`region = $${idx++}`); pArr.push(region); }
        if (division) { whereArr.push(`division = $${idx++}`); pArr.push(division); }
        if (legislative_district) { whereArr.push(`legislative_district = $${idx++}`); pArr.push(legislative_district); }
        const wStr = whereArr.length > 0 ? `WHERE ${whereArr.join(' AND ')}` : '';
        return pool.query(`
          SELECT assigned_to, COUNT(*) as projects, COALESCE(SUM(amount), 0) as amount
          FROM congressional_initiatives
          ${wStr ? wStr + ' AND assigned_to IS NOT NULL' : 'WHERE assigned_to IS NOT NULL'}
          GROUP BY assigned_to
        `, pArr);
      })(),
      // New: Total Readily Implementable Projects (Filtered)
      (() => {
        let whereArr = [];
        let pArr = [];
        let idx = 1;
        if (region) { whereArr.push(`region = $${idx++}`); pArr.push(region); }
        if (division) { whereArr.push(`division = $${idx++}`); pArr.push(division); }
        if (legislative_district) { whereArr.push(`legislative_district = $${idx++}`); pArr.push(legislative_district); }
        const wStr = whereArr.length > 0 ? `WHERE ${whereArr.join(' AND ')}` : '';
        return pool.query(`SELECT COUNT(*) as count FROM congressional_initiatives ${wStr}`, pArr);
      })()
    ]);
    const [pgoRes, mgoRes, cgoRes, dpwhRes, depedRes, csoRes, forDecisionRes, assignedRes, totalInitiativesRes] = resultsArr;
    const assignedCounts = assignedRes.rows;

    // Calculate totals for the new structure
    const pgoTotal = pgoRes.rows.reduce((acc, curr) => {
      acc.projects += Number(curr.projects);
      acc.classrooms += Number(curr.classrooms);
      return acc;
    }, { projects: 0, classrooms: 0 });
    const mgoTotal = mgoRes.rows.reduce((acc, curr) => {
      acc.projects += Number(curr.projects);
      acc.classrooms += Number(curr.classrooms);
      return acc;
    }, { projects: 0, classrooms: 0 });
    const cgoTotal = cgoRes.rows.reduce((acc, curr) => {
      acc.projects += Number(curr.projects);
      acc.classrooms += Number(curr.classrooms);
      return acc;
    }, { projects: 0, classrooms: 0 });
    const dpwhTotal = dpwhRes.rows[0] ? { projects: Number(dpwhRes.rows[0].projects), classrooms: Number(dpwhRes.rows[0].classrooms) } : { projects: 0, classrooms: 0 };
    const depedTotal = depedRes.rows[0] ? { projects: Number(depedRes.rows[0].projects), classrooms: Number(depedRes.rows[0].classrooms) } : { projects: 0, classrooms: 0 };
    const csoTotal = csoRes.rows[0] ? { projects: Number(csoRes.rows[0].projects), classrooms: Number(csoRes.rows[0].classrooms) } : { projects: 0, classrooms: 0 };
    const forDecisionTotal = forDecisionRes.rows[0] ? { projects: Number(forDecisionRes.rows[0].projects), classrooms: Number(forDecisionRes.rows[0].classrooms), cost: Number(forDecisionRes.rows[0].cost) } : { projects: 0, classrooms: 0, cost: 0 };

    const assigned_totals = assignedCounts.reduce((acc, row) => {
      acc[row.assigned_to] = Number(row.projects);
      return acc;
    }, {});
    const totalInitiatives = Number(totalInitiativesRes.rows[0].count);

    res.json({
      pgo: pgoRes.rows,
      mgo: mgoRes.rows,
      cgo: cgoRes.rows,
      dpwh: dpwhRes.rows,
      deped: depedRes.rows,
      cso: csoRes.rows,
      forDecision: forDecisionRes.rows,
      assigned_totals: assigned_totals,
      total_initiatives: totalInitiatives,
      totals: {
        governor_count: pgoTotal.projects,
        governor_cl: pgoTotal.classrooms,
        mayor_muni_count: mgoTotal.projects,
        mayor_muni_cl: mgoTotal.classrooms,
        mayor_city_count: cgoTotal.projects,
        mayor_city_cl: cgoTotal.classrooms,
        dpwh_count: dpwhTotal.projects,
        dpwh_cl: dpwhTotal.classrooms,
        deped_count: depedTotal.projects,
        deped_cl: depedTotal.classrooms,
        cso_count: csoTotal.projects,
        cso_cl: csoTotal.classrooms,
        for_decision_count: forDecisionTotal.projects,
        for_decision_cl: forDecisionTotal.classrooms,
        for_decision_cost: forDecisionTotal.cost
      }
    });
  } catch (err) {
    console.error('❌ Masterlist Partnerships Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Resolve a partnership overlap
app.post('/api/masterlist/resolve-partnership', async (req, res) => {
  try {
    const { school_id, resolved_partnership } = req.body;
    if (!school_id) return res.status(400).json({ error: 'school_id is required' });

    await pool.query(
      `UPDATE masterlist_26_30 SET resolved_partnership = $1 WHERE school_id = $2`,
      [resolved_partnership || null, school_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Resolve Partnership Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get schools for a specific partnership
app.get('/api/masterlist/partnership-schools', async (req, res) => {
  try {
    const { type, name, region, division, municipality, legislative_district } = req.query;

    let baseWhere = [];
    if (type === 'PGO') baseWhere.push(`"governor" = $1`);
    else if (type === 'MGO') baseWhere.push(`"mayor" = $1 AND "municipality" NOT ILIKE '%City%'`);
    else if (type === 'CGO') baseWhere.push(`"mayor" = $1 AND "municipality" ILIKE '%City%'`);
    else if (type === 'DPWH') baseWhere.push(`dpwh_implemented = true`);
    else if (type === 'DEPED') baseWhere.push(`deped_implemented = true`);
    else if (type === 'CSO') baseWhere.push(`cso_ngo_implemented = true`);
    else if (type === 'FOR_DECISION') baseWhere.push(`(
        COALESCE(prov_implemented::int, 0) + 
        COALESCE(muni_implemented::int, 0) + 
        COALESCE(city_implemented::int, 0) + 
        COALESCE(dpwh_implemented::int, 0) + 
        COALESCE(deped_implemented::int, 0) + 
        COALESCE(cso_ngo_implemented::int, 0)
      ) > 1 AND (resolved_partnership IS NULL OR resolved_partnership = '')`);
    else return res.json([]);

    let pIdx = 1;
    let params = [];

    // Add name param ONLY for the governor/mayor queries that use $1
    if (['PGO', 'MGO', 'CGO'].includes(type)) {
      params.push(name);
      pIdx = 2;
    }

    if (region) { baseWhere.push(`"region" = $${pIdx++}`); params.push(region); }
    if (division) { baseWhere.push(`"division" = $${pIdx++}`); params.push(division); }
    if (municipality && municipality !== 'undefined') { baseWhere.push(`"municipality" = $${pIdx++}`); params.push(municipality); }
    if (legislative_district && legislative_district !== 'undefined') { baseWhere.push(`"legislative_district" = $${pIdx++}`); params.push(legislative_district); }

    const query = `
      SELECT 
        "school_id", 
        "school_name", 
        "proposed_no_of_cl" as classrooms, 
        "est_classroom_shortage" as shortage,
        "est_classroom_cost" as cost,
        prov_implemented, muni_implemented, city_implemented, dpwh_implemented, deped_implemented, cso_ngo_implemented
      FROM masterlist_26_30 
      WHERE ${baseWhere.join(' AND ')}
      ORDER BY classrooms DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Masterlist Partnership Schools Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- DEPED PRIORITIES 2026 INFRASTRUCTURE (formerly Congressional Initiatives) ---

// Helper to check table existence
const checkTableExists = async (tableName) => {
  try {
    const result = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
      [tableName]
    );
    return result.rows[0].exists;
  } catch (e) {
    return false;
  }
};

// Helper to get the correct table or subquery for initiatives
const getInitiativesSubquery = async (version) => {
  const columns = `ci.id, ci.school_id, ci.project_name, ci.school_name, ci.amount, ci.masterlist_status, ci.region, ci.division, ci.legislative_district, ci.ownership_type_preloaded, ci.ownership_type_confirmed, ci.accessibility_rating, ci.buildable_space_dimensions, ci.has_buildable_space, ci.assigned_to, s.municipality, s.barangay, s.province, m.sty_count as number_of_storeys, m.proposed_no_of_cl as number_of_classrooms`;
  return `(SELECT ${columns}, 'v1' as version_source FROM congressional_initiatives ci LEFT JOIN schools s ON ci.school_id::text = s.school_id::text LEFT JOIN masterlist_26_30 m ON ci.school_id::text = m.school_id::text)`;
};

// One-time: import CSV into DB table
app.post('/api/deped-infrariorities/import', async (req, res) => {
  const client = await pool.connect();
  try {
    // Create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS congressional_initiatives (
        id SERIAL PRIMARY KEY,
        school_id TEXT,
        project_name TEXT,
        school_name TEXT,
        amount NUMERIC,
        masterlist_status TEXT,
        region TEXT,
        division TEXT,
        legislative_district TEXT,
        ownership_type_preloaded TEXT,
        ownership_type_confirmed TEXT,
        accessibility_rating TEXT,
        buildable_space_dimensions TEXT,
        has_buildable_space TEXT,
        assigned_to TEXT
      )
    `);

    // Migration for existing table
    await client.query(`ALTER TABLE congressional_initiatives ADD COLUMN IF NOT EXISTS assigned_to TEXT`);

    // Read CSV from public folder
    const fs = await import('fs');
    const path = await import('path');
    const csvPath = path.default.join(process.cwd(), 'public', '956_hor_withbuildable-withownership-accessible-READY_TO_BUILD.csv');
    const csvText = fs.default.readFileSync(csvPath, 'utf8');

    // Parse CSV manually (handle quoted multiline fields)
    const lines = csvText.split('\n');
    const headers = lines[0].replace('\r', '').split(',');

    // Truncate and re-import
    await client.query('TRUNCATE TABLE congressional_initiatives');

    let imported = 0;
    let i = 1;
    while (i < lines.length) {
      let line = lines[i].replace('\r', '');
      // Handle lines that are continuations of multiline quoted fields
      while ((line.match(/"/g) || []).length % 2 !== 0 && i + 1 < lines.length) {
        i++;
        line += '\n' + lines[i].replace('\r', '');
      }
      i++;

      if (!line.trim()) continue;

      // Parse CSV row
      const values = [];
      let current = '';
      let inQuote = false;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === '"') {
          inQuote = !inQuote;
        } else if (ch === ',' && !inQuote) {
          values.push(current.trim() === 'NULL' ? null : current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      values.push(current.trim() === 'NULL' ? null : current.trim());

      if (values.length < headers.length) continue;

      await client.query(
        `INSERT INTO congressional_initiatives (school_id, project_name, school_name, amount, masterlist_status, region, division, legislative_district, ownership_type_preloaded, ownership_type_confirmed, accessibility_rating, buildable_space_dimensions, has_buildable_space, assigned_to)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          values[0] || null,
          values[1] || null,
          values[2] || null,
          values[3] ? Number(values[3]) : null,
          values[4] || null,
          values[5] || null,
          values[6] || null,
          values[7] || null,
          values[8] || null,
          values[9] || null,
          values[10] || null,
          values[11] || null,
          values[12] || null,
          null
        ]
      );
      imported++;
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('❌ DepEd Priorities 2026 Infrastructure Import Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET: Fetch DepEd Priorities 2026 Infrastructure details with optional filters
app.get('/api/deped-infrariorities', async (req, res) => {
  try {
    const { region, division, legislative_district, search, version, assigned_to, sty, cl } = req.query;
    const tableSubquery = await getInitiativesSubquery(version);

    let where = [];
    let params = [];
    let pIdx = 1;

    if (region) { where.push(`region = $${pIdx++}`); params.push(region); }
    if (division) { where.push(`division = $${pIdx++}`); params.push(division); }
    if (legislative_district && legislative_district !== 'undefined') {
      where.push(`legislative_district = $${pIdx++}`); params.push(legislative_district);
    }
    if (assigned_to) {
      where.push(`assigned_to = $${pIdx++}`); params.push(assigned_to);
    }
    if (sty) {
      where.push(`number_of_storeys = $${pIdx++}`); params.push(Number(sty));
    }
    if (cl) {
      where.push(`number_of_classrooms = $${pIdx++}`); params.push(Number(cl));
    }
    if (search) {
      where.push(`(school_name ILIKE $${pIdx} OR school_id ILIKE $${pIdx} OR project_name ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT *
      FROM ${tableSubquery} as t
      ${whereClause}
      ORDER BY amount DESC NULLS LAST
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ DepEd Priorities 2026 Infrastructure Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Summary stats for DepEd Priorities 2026 Infrastructure
app.get('/api/deped-infrariorities/summary', async (req, res) => {
  try {
    const { region, division, legislative_district, version, sty, cl } = req.query;
    const tableSubquery = await getInitiativesSubquery(version);

    let where = [];
    let params = [];
    let pIdx = 1;

    if (region) { where.push(`region = $${pIdx++}`); params.push(region); }
    if (division) { where.push(`division = $${pIdx++}`); params.push(division); }
    if (legislative_district && legislative_district !== 'undefined') {
      where.push(`legislative_district = $${pIdx++}`); params.push(legislative_district);
    }
    if (sty) {
      where.push(`number_of_storeys = $${pIdx++}`); params.push(Number(sty));
    }
    if (cl) {
      where.push(`number_of_classrooms = $${pIdx++}`); params.push(Number(cl));
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(DISTINCT school_id) as total_schools,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(DISTINCT region) as total_regions,
        COUNT(DISTINCT legislative_district) as total_districts
      FROM ${tableSubquery} as t
      ${whereClause}
    `, params);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ DepEd Priorities 2026 Infrastructure Summary Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Distribution stats for DepEd Priorities 2026 Infrastructure (for drilldown)
app.get('/api/deped-infrariorities/distribution', async (req, res) => {
  try {
    const { groupBy, region, division, legislative_district, version } = req.query;
    const tableSubquery = await getInitiativesSubquery(version);

    const validGroupBys = ['region', 'division', 'municipality', 'legislative_district'];
    const groupField = validGroupBys.includes(groupBy) ? groupBy : 'region';

    let where = [];
    let params = [];
    let pIdx = 1;

    if (region) { where.push(`region = $${pIdx++}`); params.push(region); }
    if (division) { where.push(`division = $${pIdx++}`); params.push(division); }
    if (legislative_district && legislative_district !== 'undefined') {
      where.push(`legislative_district = $${pIdx++}`); params.push(legislative_district);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const finalQuery = `
      SELECT
        "${groupField}" as name,
        COUNT(*) as projects,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(DISTINCT school_id) as schools
      FROM ${tableSubquery} as t
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} "${groupField}" IS NOT NULL
      GROUP BY "${groupField}"
      ORDER BY amount DESC
    `;

    const result = await pool.query(finalQuery, params);
    return res.json(result.rows || []);
  } catch (err) {
    console.error('❌ DepEd Priorities 2026 Infrastructure Distribution Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET: Specific projects for DepEd Priorities 2026 Infrastructure (for drilldown list)
app.get('/api/deped-infrariorities/distribution-projects', async (req, res) => {
  try {
    const { region, division, legislative_district, limit = 50, offset = 0, version } = req.query;
    const tableSubquery = await getInitiativesSubquery(version);

    let where = [];
    let params = [];
    let pIdx = 1;

    if (region) { where.push(`region = $${pIdx++}`); params.push(region); }
    if (division) { where.push(`division = $${pIdx++}`); params.push(division); }
    if (legislative_district && legislative_district !== 'undefined') {
      where.push(`legislative_district = $${pIdx++}`); params.push(legislative_district);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const finalQuery = `
      SELECT * FROM ${tableSubquery} as t
      ${whereClause}
      ORDER BY amount DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
    const finalParams = [...params, Number(limit), Number(offset)];

    const result = await pool.query(finalQuery, finalParams);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Newcon Priorities Projects Fetch Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Post: Assign a deped-infrariorities project to an agency
app.post('/api/deped-infrariorities/assign', async (req, res) => {
  try {
    const { id, assigned_to, version } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    await pool.query(
      `UPDATE congressional_initiatives SET assigned_to = $1 WHERE id = $2`,
      [assigned_to || null, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Assign Initiative Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- AI CHATBOT INTEGRATION ---

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/api/masterlist/ai-query', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const context = `
      You are a SQL expert for a PostgreSQL database. 
      The table name is "masterlist_26_30".
      Columns:
      - school_id (text)
      - school_name (text)
      - region (text)
      - division (text)
      - municipality (text)
      - legislative_district (text)
      - proposed_no_of_cl (numeric)
      - est_classroom_cost (numeric)
      - est_classroom_shortage (numeric)
      - sty (numeric, storeys)
      - cl (numeric, classrooms per building)
      - proposed_funding_year (numeric)
      - congressman (text)
      - governor (text)
      - mayor (text)

      Task: Translate the following user request into a single PostgreSQL SELECT query.
      Return ONLY THE RAW SQL query. NO MARKDOWN, NO EXPLANATION, NO BACKTICKS.
      The query MUST be read-only (SELECT only).
      Example: SELECT school_name, est_classroom_shortage FROM masterlist_26_30 WHERE region = 'REGION I' ORDER BY est_classroom_shortage DESC LIMIT 10;
      
      User Request: "${prompt}"
    `;

    const result = await aiModel.generateContent(context);
    const sql = result.response.text().trim().replace(/```sql|```/g, '').trim();

    console.log('🤖 AI Generated SQL:', sql);

    // Security check: Only allow SELECT, block destructive commands
    const upperSql = sql.toUpperCase();
    const isSafe = upperSql.startsWith('SELECT') &&
      !upperSql.includes('DROP') &&
      !upperSql.includes('DELETE') &&
      !upperSql.includes('UPDATE') &&
      !upperSql.includes('INSERT') &&
      !upperSql.includes('TRUNCATE') &&
      !upperSql.includes('ALTER');

    if (!isSafe) {
      return res.status(400).json({ error: "Only safe SELECT queries are allowed." });
    }

    // Execute query
    const dbResult = await pool.query(sql);
    res.json({ sql, data: dbResult.rows });

  } catch (err) {
    console.error('❌ AI Query Error:', err);
    res.status(500).json({ error: "AI could not process your request: " + err.message });
  }
});

// --- NEW VALIDATION ENDPOINTS ---

// 1. Fetch ALL Schools for Offline Caching
// 1. Fetch ALL Schools for Offline Caching
app.get('/api/offline/schools', async (req, res) => {
  try {
    // Fetch only necessary fields to keep payload light
    // CHANGED: Use 'schools' table instead of 'school_profiles'
    const query = `
            SELECT school_id, school_name, region, division, latitude, longitude 
            FROM schools 
            WHERE school_id IS NOT NULL
        `;
    const result = await pool.query(query);

    console.log(`✅ Fetched ${result.rows.length} schools for offline cache from 'schools' table.`);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Failed to fetch schools for cache:", err);
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});

// 2. Fetch Single School Profile (Online Validation)
app.get('/api/school-profile/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // CHANGED: Use 'schools' table instead of 'school_profiles'
    console.log(`🔎 Searching for School ID: ${schoolId} in 'schools' table...`);
    const query = `SELECT * FROM schools WHERE school_id = $1`;
    const result = await pool.query(query, [schoolId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "School not found" });
    }
  } catch (err) {
    console.error("❌ Failed to fetch school profile:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- DEBUG: SCANNER ENDPOINT ---
app.get('/api/debug/scan/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    // 1. Get School Profile
    const spResult = await pool.query("SELECT * FROM school_profiles WHERE submitted_by = $1", [uid]);
    if (spResult.rows.length === 0) return res.json({ error: "No school profile found for this user." });

    const sp = spResult.rows[0];
    const report = { school_id: sp.school_id, school_name: sp.school_name, forms: {} };
    let completed = 0;

    // Verbose Checks (Mirroring calculateSchoolProgress)

    // F1
    report.forms.f1_profile = { passed: !!sp.school_name, val: sp.school_name, reason: sp.school_name ? "OK" : "Missing School Name" };
    if (report.forms.f1_profile.passed) completed++;

    // F2
    report.forms.f2_head = { passed: !!sp.head_last_name, val: sp.head_last_name, reason: sp.head_last_name ? "OK" : "Missing Head Last Name" };
    if (report.forms.f2_head.passed) completed++;

    // F3
    report.forms.f3_enrollment = { passed: (sp.total_enrollment > 0), val: sp.total_enrollment, reason: "Must be > 0" };
    if (report.forms.f3_enrollment.passed) completed++;

    // F4
    const totalClasses = (sp.classes_kinder || 0) + (sp.classes_grade_1 || 0) + (sp.classes_grade_2 || 0) + (sp.classes_grade_3 || 0) +
      (sp.classes_grade_4 || 0) + (sp.classes_grade_5 || 0) + (sp.classes_grade_6 || 0) +
      (sp.classes_grade_7 || 0) + (sp.classes_grade_8 || 0) + (sp.classes_grade_9 || 0) + (sp.classes_grade_10 || 0) +
      (sp.classes_grade_11 || 0) + (sp.classes_grade_12 || 0);
    report.forms.f4_classes = { passed: totalClasses > 0, val: totalClasses, reason: "Sum of classes must be > 0" };
    if (report.forms.f4_classes.passed) completed++;

    // F5
    const totalTeachers = (sp.teach_kinder || 0) + (sp.teach_g1 || 0) + (sp.teach_g2 || 0) + (sp.teach_g3 || 0) +
      (sp.teach_g4 || 0) + (sp.teach_g5 || 0) + (sp.teach_g6 || 0) +
      (sp.teach_g7 || 0) + (sp.teach_g8 || 0) + (sp.teach_g9 || 0) + (sp.teach_g10 || 0) +
      (sp.teach_g11 || 0) + (sp.teach_g12 || 0);
    report.forms.f5_teachers = { passed: totalTeachers > 0, val: totalTeachers, reason: "Sum of teachers must be > 0" };
    if (report.forms.f5_teachers.passed) completed++;

    // F6
    const specFields = [
      'spec_general_major', 'spec_ece_major', 'spec_english_major', 'spec_filipino_major', 'spec_math_major',
      'spec_science_major', 'spec_ap_major', 'spec_mapeh_major', 'spec_esp_major', 'spec_tle_major',
      'spec_bio_sci_major', 'spec_phys_sci_major', 'spec_agri_fishery_major', 'spec_others_major'
    ];
    const specVals = specFields.map(f => sp[f] || 0);
    const hasSpec = specVals.some(v => v > 0);
    report.forms.f6_specialization = { passed: hasSpec, max_val: Math.max(...specVals), reason: "Any specialization > 0" };
    if (report.forms.f6_specialization.passed) completed++;

    // F7
    const hasRes = (sp.res_electricity_source || sp.res_water_source || sp.res_buildable_space || sp.sha_category ||
      (sp.res_armchair_func || 0) > 0 || (sp.res_armchairs_good || 0) > 0 ||
      (sp.res_toilets_male || 0) > 0 ||
      (sp.female_bowls_func || 0) > 0 || (sp.male_bowls_func || 0) > 0 ||
      (sp.male_urinals_func || 0) > 0 || (sp.pwd_bowls_func || 0) > 0);
    report.forms.f7_resources = { passed: !!hasRes, reason: "Utility/Infra set or Inventory > 0. Elec: " + sp.res_electricity_source };
    if (report.forms.f7_resources.passed) completed++;

    // F8
    report.forms.f8_facilities = { passed: (sp.build_classrooms_total > 0), val: sp.build_classrooms_total, reason: "Total Classrooms > 0" };
    if (report.forms.f8_facilities.passed) completed++;

    // F9
    const hasShift = (sp.shift_kinder || sp.shift_g1 || sp.adm_mdl || sp.adm_odl);
    report.forms.f9_shifting = { passed: !!hasShift, reason: "Any shift or modality set" };
    if (report.forms.f9_shifting.passed) completed++;

    // F10
    const statKeys = Object.keys(sp).filter(k => k.startsWith('stat_'));
    const nonZeroStats = statKeys.filter(k => Number(sp[k]) > 0);
    report.forms.f10_stats = {
      passed: nonZeroStats.length > 0,
      positive_keys: nonZeroStats,
      count: nonZeroStats.length,
      reason: "Any stat_ field > 0"
    };
    if (report.forms.f10_stats.passed) completed++;

    report.total_score = completed;
    report.percentage = Math.round((completed / 10) * 100);

    // AUTO-HEAL: If the calculation here differs from DB, update DB
    if (completed !== sp.forms_completed_count) {
      report.fix_applied = true;
      try {
        await calculateSchoolProgress(sp.school_id, pool); // Force trigger the main function
      } catch (e) {
        console.error("Auto-heal calc error:", e.message);
      }
    }

    res.json(report);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- DEBUG: SEED SCHOOLS (For Production Fix) ---
app.get('/api/debug/seed-schools', async (req, res) => {
  console.log("🌱 Seeding Schools initiated...");
  const client = await pool.connect();

  try {
    // 1. Fetch CSV from Public URL (Self-hosted)
    const protocol = req.protocol;
    const host = req.get('host');
    const csvUrl = `${protocol}://${host}/schools.csv`;
    console.log(`📥 Fetching CSV from: ${csvUrl}`);

    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);

    const csvText = await response.text();

    // 2. Parse CSV (Manual Parsing for simplicity without filesystem stream if fetch returns text)
    // Or use csv-parser with a readable stream from string
    const results = [];
    const Readable = require('stream').Readable;
    const s = new Readable();
    s.push(csvText);
    s.push(null); // end of stream

    await new Promise((resolve, reject) => {
      s.pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Parsed ${results.length} schools.`);

    if (results.length === 0) return res.json({ message: "CSV is empty" });

    // 3. Insert Data
    // Create table if not exists
    await client.query(`
            CREATE TABLE IF NOT EXISTS schools (
                school_id TEXT PRIMARY KEY,
                school_name TEXT,
                region TEXT,
                division TEXT,
                legislative_district TEXT,
                province TEXT,
                municipality TEXT,
                barangay TEXT,
                latitude TEXT,
                longitude TEXT,
                sub_office TEXT,
                school_type TEXT,
                school_abbreviation TEXT
            );
        `);

    // Batch Insert
    const BATCH_SIZE = 1000;
    let inserted = 0;

    // We use ON CONFLICT DO NOTHING to avoid errors on duplicates
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];

      batch.forEach((row, idx) => {
        // Map CSV headers to columns (assuming CSV headers match or we map them)
        // Use sanitize logic if needed, but assuming CSV keys match for now or just generic mapping
        // Let's use specific columns to be safe based on import_schools.js
        // import_schools uses dynamic headers.
        // We'll trust the CSV keys match DB columns for now or just map known ones.
        // Actually, let's just log headers first if we can?
        // results[0] keys are headers.
      });

      // Re-use logic from import script (Dynamic Columns)
      if (batch.length === 0) continue;
      const headers = Object.keys(batch[0]);

      // Construct query
      const batchValues = [];
      batch.forEach((row, rIdx) => {
        const rowVals = Object.values(row);
        rowVals.forEach(v => batchValues.push(v));

        const rowPlaceholders = rowVals.map((_, cIdx) => `$${(rIdx * headers.length) + cIdx + 1}`);
        placeholders.push(`(${rowPlaceholders.join(',')})`);
      });

      const query = `
                INSERT INTO schools (${headers.map(h => h.replace(/[^a-z0-9_]/gi, '_').toLowerCase()).join(',')})
                VALUES ${placeholders.join(',')}
                ON CONFLICT (school_id) DO UPDATE SET 
                    school_name = EXCLUDED.school_name,
                    region = EXCLUDED.region,
                    division = EXCLUDED.division,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude
            `;

      // Note: Postgres params limit is 65535. 1000 rows * 13 cols = 13000. Safe.
      await client.query(query, batchValues);
      inserted += batch.length;
      console.log(`... Inserted/Updated ${inserted} rows`);
    }

    res.json({ success: true, count: results.length, inserted });

  } catch (err) {
    console.error("Seed Error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  } finally {
    client.release();
  }
});

// --- VALIDATE SCHOOL HEALTH ---
app.post('/api/validate-school-health', async (req, res) => {
  const { school_id } = req.body;
  if (!school_id) {
    return res.status(400).json({ error: 'Missing school_id' });
  }

  console.log(`Running Fraud Detection for School: ${school_id}...`);

  const rootDir = process.cwd();
  const fileDir = path.dirname(fileURLToPath(import.meta.url));

  let scriptPath = path.join(rootDir, 'advanced_fraud_detection.py');
  if (!fs.existsSync(scriptPath)) {
    scriptPath = path.join(fileDir, '..', 'advanced_fraud_detection.py');
  }

  const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
  const command = `"${pythonCmd}" "${scriptPath}" --school_id "${school_id}"`;

  console.log(`Executing validation command: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({
        error: 'Validation failed to execute.',
        commandAttempted: command,
        details: stderr || error.message
      });
    }

    console.log(`Validator Output: ${stdout}`);
    if (stderr) console.warn(`Validator Warnings/Errors: ${stderr}`);

    res.json({ success: true, message: 'Validation completed successfully.', output: stdout });
  });
});

// --- RUN GLOBAL FRAUD DETECTION ---
app.post('/api/admin/run-fraud-detection', async (req, res) => {
  const { adminUid } = req.body;

  console.log(`admin ${adminUid} is triggering Global Fraud Detection...`);

  const rootDir = process.cwd();
  const fileDir = path.dirname(fileURLToPath(import.meta.url));

  let scriptPath = path.join(rootDir, 'advanced_fraud_detection.py');
  if (!fs.existsSync(scriptPath)) {
    scriptPath = path.join(fileDir, '..', 'advanced_fraud_detection.py');
  }

  const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
  const command = `"${pythonCmd}" "${scriptPath}"`; // No school_id = Full Batch

  console.log(`Executing Global Fraud Detection: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({
        error: 'Global Fraud Detection failed to execute.',
        details: stderr || error.message
      });
    }

    console.log(`Global Fraud Detection Output: ${stdout}`);
    if (stderr) console.warn(`Global Fraud Detection Warnings: ${stderr}`);

    res.json({
      success: true,
      message: 'Global Fraud Detection completed successfully.',
      output: stdout
    });
  });
});



// --- HELPER: Auto-Fill Teachers from Master List ---
const autoFillSchoolTeachers = async (schoolId) => {
  try {
    console.log(`🤖 [Auto-Fill] Filling Teachers for School: ${schoolId}...`);

    // 1. Get the newly generated IERN from school_profiles
    const schoolRes = await pool.query("SELECT iern FROM school_profiles WHERE school_id = $1", [schoolId]);
    const schoolIern = schoolRes.rows.length > 0 ? schoolRes.rows[0].iern : null;

    if (!schoolIern) {
      console.warn(`⚠️ [Auto-Fill] No IERN found for school ${schoolId}. Proceeding with NULL IERN.`);
    }

    // 2. Insert from teachers_list using correct columns
    const res = await pool.query(`
        INSERT INTO teacher_specialization_details (
            iern, control_num, school_id, full_name, position, position_group, 
            specialization, teaching_load, created_at, updated_at
        )
        SELECT 
            $2, 
            "control_num", 
            "school.id", 
            TRIM(CONCAT("first", ' ', "middle", ' ', "last")), 
            "position", 
            "position_group", 
            "specialization.final", 
            0, 
            NOW(), 
            NOW()
        FROM teachers_list 
        WHERE "school.id" = $1
        ON CONFLICT (control_num) DO NOTHING
    `, [schoolId, schoolIern]);

    console.log(`✅ [Auto-Fill] Success! Copied ${res.rowCount} teachers for school ${schoolId}.`);

  } catch (err) {
    console.error("❌ Auto-Fill Teachers Failed:", err.message);
  }
};

// --- TEACHER PERSONNEL ENDPOINTS ---

// GET: Fetch Teachers by School ID
app.get('/api/teacher-personnel/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM teacher_specialization_details WHERE school_id = $1 ORDER BY full_name`,
      [schoolId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching teachers:", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

// POST: Save (Upsert/Delete) Teacher Personnel
app.post('/api/save-teacher-personnel', async (req, res) => {
  const { schoolId, teachers } = req.body; // teachers is an array of objects

  if (!schoolId || !Array.isArray(teachers)) {
    return res.status(400).json({ error: "Invalid payload. 'schoolId' and 'teachers' array are required." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get List of Incoming Control Numbers (to identify deletions)
    const incomingControlNums = teachers.map(t => t.control_num).filter(Boolean);

    // 2. DELETE: Remove teachers for this school that are NOT in the incoming list
    if (incomingControlNums.length > 0) {
      await client.query(
        `DELETE FROM teacher_specialization_details 
                 WHERE school_id = $1 AND control_num NOT IN(${incomingControlNums.map((_, i) => `$${i + 2}`).join(',')})`,
        [schoolId, ...incomingControlNums]
      );
    } else {
      // If incoming list is empty, delete ALL teachers for this school (User cleared the list)
      await client.query(`DELETE FROM teacher_specialization_details WHERE school_id = $1`, [schoolId]);
    }

    // 3. UPSERT: Insert or Update each teacher
    for (const t of teachers) {
      await client.query(`
                INSERT INTO teacher_specialization_details(
    iern, control_num, school_id, full_name, position, position_group,
    specialization, teaching_load, updated_at
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT(control_num) 
                DO UPDATE SET
specialization = EXCLUDED.specialization,
  teaching_load = EXCLUDED.teaching_load,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();
`, [
        t.iern,
        t.control_num,
        schoolId, // Ensure we use the schools ID from the payload or session context
        t.full_name,
        t.position,
        t.position_group,
        t.specialization,
        t.teaching_load
      ]);
    }

    // 4. SYNC: Update school_profiles for frontend status compatibility
    // We update 'spec_general_teaching' with the total count of teachers, 
    // ensuring SchoolForms.jsx sees a value > 0 to mark the form as "Completed".
    await client.query(`
      UPDATE school_profiles 
      SET spec_general_teaching = (
        SELECT COUNT(*)::int FROM teacher_specialization_details WHERE school_id = $1
      )
      WHERE school_id = $1
    `, [schoolId]);

    // 5. UPDATE PROGRESS
    await calculateSchoolProgress(schoolId, client);

    await client.query('COMMIT');
    res.json({ success: true, message: "Teacher personnel saved successfully." });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Save Teacher Personnel Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// POST: Save Legacy Specialization Aggregates
app.post('/api/save-teacher-specialization-legacy', async (req, res) => {
  const { schoolId, data } = req.body; // data contains spec_english_major: 5, etc.

  if (!schoolId || !data) {
    return res.status(400).json({ error: "Invalid payload. 'schoolId' and 'data' object are required." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // List of legacy columns to update
    const fields = [
      'spec_general_teaching', 'spec_ece_teaching',
      'spec_english_major', 'spec_filipino_major', 'spec_math_major',
      'spec_science_major', 'spec_ap_major', 'spec_mapeh_major',
      'spec_esp_major', 'spec_tle_major', 'spec_bio_sci_major',
      'spec_phys_sci_major', 'spec_agri_fishery_major', 'spec_others_major'
    ];

    const updates = [];
    const values = [schoolId];

    // Build dynamic UPDATE query
    fields.forEach((field, index) => {
      // Use the value from data, default to 0
      updates.push(`${field} = $${index + 2}`);
      values.push(data[field] ? parseInt(data[field]) : 0);
    });

    const query = `UPDATE school_profiles SET ${updates.join(', ')} WHERE school_id = $1`;

    await client.query(query, values);

    // Trigger progress update just in case
    await calculateSchoolProgress(schoolId, client);

    await client.query('COMMIT');
    res.json({ success: true, message: "Legacy specialization data saved." });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Save Legacy Spec Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// --- DEBUG: RECALCULATE ALL ENDPOINT ---
app.get('/api/debug/recalculate-all', async (req, res) => {
  try {
    console.log("”„ Starting Full Snapshot Recalculation...");
    const result = await pool.query('SELECT school_id FROM school_profiles');
    const schools = result.rows;

    let count = 0;
    for (const s of schools) {
      if (s.school_id) {
        await calculateSchoolProgress(s.school_id, pool);
        count++;
      }
    }
    res.json({ success: true, count });
  } catch (err) {
    console.error("Recalculate Error:", err);
    res.status(500).json({ error: err.message });
  }
});



// --- HELPER FUNCTION: Calculate School Progress ---
// MOVED UP HERE FOR VISIBILITY but normally defined below
// (Assuming it is defined later in the file, we just need to find where it spawns python)


// --- VERCEL CRON ENDPOINT (MOVED TO TOP) ---
// Support both /api/cron... (Local) and /cron... (Vercel)
app.get(['/api/cron/check-deadline', '/cron/check-deadline'], async (req, res) => {
  // 1. Security Check
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET} `) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('â° Running Deadline Reminder (Vercel Cron)...');
  try {
    const settingRes = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'enrolment_deadline'");
    if (settingRes.rows.length === 0 || !settingRes.rows[0].setting_value) {
      return res.json({ message: 'No deadline set.' });
    }
    const deadlineVal = settingRes.rows[0].setting_value;
    const deadlineDate = new Date(deadlineVal);
    const now = new Date();
    const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    console.log(`“… Deadline: ${deadlineVal}, Days Left: ${diffDays} `);

    // Check Criteria (0 to 3 days left)
    if (diffDays <= 3 && diffDays >= 0) {
      const tokenRes = await pool.query("SELECT fcm_token FROM user_device_tokens WHERE fcm_token IS NOT NULL");
      const tokens = tokenRes.rows.map(r => r.fcm_token);

      console.log(`Found ${tokens.length} device tokens.`);

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: diffDays === 0 ? "Deadline is TODAY!" : "Deadline Reminder",
            body: diffDays === 0
              ? "Submission closes today. Please finalize your reports."
              : `Submission is due in ${diffDays} day${diffDays > 1 ? 's' : ''} !Please finalize your forms.`
          },
          tokens: tokens
        };

        try {
          // --- LEGACY FCM DISABLED ---
          // const response = await admin.messaging().sendEachForMulticast(message);
          // console.log(`š€ Notification Response: ${response.successCount} sent, ${response.failureCount} failed.`);
          // if (response.failureCount > 0) {
          //   console.log("Failed details:", JSON.stringify(response.responses));
          // }
          // return res.json({ success: true, sent: response.successCount, failed: response.failureCount });
          
          console.log("[LEGACY] FCM Messaging skipped (Firebase disabled).");
          return res.json({ success: true, message: "FCM skipped (Firebase disabled)" });
        } catch (sendErr) {
          console.error("FCM Error:", sendErr);
          throw sendErr;
        }
      } else {
        console.log("â„¹ï¸ No tokens found in DB.");
        return res.json({ message: 'No device tokens found.' });
      }
    } else {
      console.log(`â„¹ï¸ Skipping: ${diffDays} days remaining(Not within 0 - 3 range).`);
      return res.json({ message: `Not within reminder window(0 - 3 days).Days: ${diffDays} ` });
    }
  } catch (error) {
    console.error('âŒ Cron Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// --- POST: Save Device Token ---
app.post('/api/save-token', async (req, res) => {
  const { uid, token } = req.body;
  if (!uid || !token) return res.status(400).json({ error: "Missing uid or token" });

  try {
    await pool.query(`
            INSERT INTO user_device_tokens(uid, fcm_token, updated_at)
VALUES($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT(uid)
            DO UPDATE SET fcm_token = $2, updated_at = CURRENT_TIMESTAMP
  `, [uid, token]);

    // --- DUAL WRITE: SAVE DEVICE TOKEN ---
    if (poolNew) {
      poolNew.query(`
            INSERT INTO user_device_tokens(uid, fcm_token, updated_at)
VALUES($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT(uid)
            DO UPDATE SET fcm_token = $2, updated_at = CURRENT_TIMESTAMP
  `, [uid, token]).catch(e => console.error("Dual-Write Token Err:", e.message));
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Save Token Error:", err);
    res.status(500).json({ error: "Failed to save token" });
  }
});

// --- FINANCE ENDPOINTS ---

// 1. Create Finance Project (and Sync to LGU)
app.post('/api/finance/projects', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let {
      region, division, district, legislative_district, municipality, // Added municipality
      school_id, school_name, project_name,
      total_funds, fund_released, date_of_release
    } = req.body;

    // Sanitize currency inputs (remove commas)
    const cleanCurrency = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return parseFloat(val.replace(/,/g, ''));
      return val;
    };

    const sanitizedTotalFunds = cleanCurrency(total_funds);
    const sanitizedFundReleased = cleanCurrency(fund_released);

    // A. Insert into Finance Table
    const financeQuery = `
      INSERT INTO finance_projects
  (region, division, district, legislative_district, municipality, school_id, school_name, project_name, total_funds, fund_released, date_of_release)
VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING finance_id;
`;
    const financeRes = await client.query(financeQuery, [
      region, division, district, legislative_district, municipality,
      school_id, school_name, project_name,
      sanitizedTotalFunds, sanitizedFundReleased, date_of_release
    ]);
    const financeId = financeRes.rows[0].finance_id;

    // B. Duplicate to LGU Table (lgu_projects) - LINKED
    const lguQuery = `
      INSERT INTO lgu_projects
  (
    finance_id, municipality,
    region, division, district, legislative_district, school_id, school_name, project_name,
    total_funds, fund_released, date_of_release,
    project_status
  )
VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Not Yet Started')
      RETURNING lgu_project_id;
`;

    await client.query(lguQuery, [
      financeId, municipality,
      region, division, district, legislative_district, school_id, school_name, project_name,
      sanitizedTotalFunds, sanitizedFundReleased, date_of_release
    ]);

    await client.query('COMMIT');
    res.json({ success: true, finance_id: financeId, message: "Project created and synced to LGU." });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Finance Create Error:", err);
    res.status(500).json({ error: "Failed to create finance project: " + err.message });
  } finally {
    client.release();
  }
});

// 2. Get All Finance Projects
app.get('/api/finance/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM finance_projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Get Finance Projects Error:", err);
    res.status(500).json({ error: "Failed to fetch finance projects." });
  }
});

// --- LGU FINANCE ENDPOINTS ---

// 1. Create LGU Project
app.post('/api/lgu/projects', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      region, division, district, legislative_district, municipality,
      school_id, school_name, project_name,
      total_funds, fund_released, date_of_release,

      // New Fields
      source_agency, contractor_name, lsb_resolution_no, moa_ref_no, moa_date,
      validity_period, contract_duration, date_approved_pow, approved_contract_budget,
      schedule_of_fund_release, number_of_tranches, amount_per_tranche,
      mode_of_procurement, philgeps_ref_no, pcab_license_no,
      date_contract_signing, date_notice_of_award, bid_amount,
      latitude, longitude,

      // Images (handled via separate upload usually, but if passed as base64 here we might need to handle it or just metadata)
      // For now, let's assume images are uploaded separately like Engineer module

      project_status, accomplishment_percentage, status_as_of_date, amount_utilized, nature_of_delay,
      created_by_uid // NEW: User ID
    } = req.body;

    // Helper to sanitize numeric/date fields
    const sanitize = (val) => (val === '' || val === null || val === undefined ? null : val);
    const cleanNumeric = (val) => {
      if (val === '' || val === null || val === undefined) return null;
      if (typeof val === 'string') return parseFloat(val.replace(/,/g, ''));
      return val;
    };

    const query = `
      INSERT INTO lgu_projects
  (
    region, division, district, legislative_district, municipality, school_id, school_name, project_name,
    total_funds, fund_released, date_of_release,
    source_agency, contractor_name, lsb_resolution_no, moa_ref_no, moa_date,
    validity_period, contract_duration, date_approved_pow, approved_contract_budget,
    schedule_of_fund_release, number_of_tranches, amount_per_tranche,
    mode_of_procurement, philgeps_ref_no, pcab_license_no,
    date_contract_signing, date_notice_of_award, bid_amount,
    latitude, longitude,
    project_status, accomplishment_percentage, status_as_of_date, amount_utilized, nature_of_delay,
    created_by_uid
  )
VALUES(
  $1, $2, $3, $4, $5, $6, $7, $8,
  $9, $10, $11,
  $12, $13, $14, $15, $16,
  $17, $18, $19, $20,
  $21, $22, $23,
  $24, $25, $26,
  $27, $28, $29,
  $30, $31,
  $32, $33, $34, $35, $36,
  $37
)
      RETURNING lgu_project_id;
`;

    const result = await client.query(query, [
      region, division, district, legislative_district, municipality, school_id, school_name, project_name,
      cleanNumeric(total_funds), cleanNumeric(fund_released), sanitize(date_of_release),
      source_agency, contractor_name, lsb_resolution_no, moa_ref_no, sanitize(moa_date),
      validity_period, contract_duration, sanitize(date_approved_pow), cleanNumeric(approved_contract_budget),
      schedule_of_fund_release, cleanNumeric(number_of_tranches), cleanNumeric(amount_per_tranche),
      mode_of_procurement, philgeps_ref_no, pcab_license_no,
      sanitize(date_contract_signing), sanitize(date_notice_of_award), cleanNumeric(bid_amount),
      latitude, longitude,
      project_status || 'Not Yet Started', cleanNumeric(accomplishment_percentage) || 0, sanitize(status_as_of_date), cleanNumeric(amount_utilized) || 0, nature_of_delay,
      created_by_uid
    ]);

    // --- FIX: Initialize root_project_id ---
    const newProjectId = result.rows[0].lgu_project_id;
    await client.query('UPDATE lgu_projects SET root_project_id = $1 WHERE lgu_project_id = $1', [newProjectId]);

    await client.query('COMMIT');
    res.json({ success: true, lgu_project_id: newProjectId, message: "LGU Project created." });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("LGU Project Create Error:", err);
    res.status(500).json({ error: "Failed to create LGU project.", details: err.message });
  } finally {
    client.release();
  }
});

/* 
// DUPLICATE ROUTE REMOVED (Legacy) - See line 8574 for correct implementation
// 2. Get All LGU Projects (Filtered by User & Municipality)
app.get('/api/lgu/projects', async (req, res) => {
  const { uid } = req.query; // Get UID from query
  try {
    let query = 'SELECT * FROM lgu_projects';
    let params = [];
    let whereClauses = [];
 
    // Check User Role & Municipality
    if (uid) {
      const userRes = await pool.query('SELECT role, city FROM users WHERE uid = $1', [uid]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        // If user is LGU, filter by municipality (city)
        // Assuming role 'LGU' or checking if city is present
        if (user.city) {
          whereClauses.push(`municipality = $${ params.length + 1 } `);
          params.push(user.city);
        }
      }
      // Also allow filtering by creator if needed, but for now municipality is the main filter
      // whereClauses.push(`created_by_uid = $${ params.length + 1 } `);
      // params.push(uid);
    }
 
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
 
    query += ' ORDER BY created_at DESC';
 
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get LGU Projects Error:", err);
    res.status(500).json({ error: "Failed to fetch LGU projects." });
  }
});
*/

// 3. Update LGU Project (Liquidation)
app.put('/api/lgu/projects/:id', async (req, res) => {
  const { id } = req.params;
  // Support both Liquidation AND Progress updates
  const {
    liquidated_amount, liquidation_date,
    project_status, accomplishment_percentage, status_as_of_date, amount_utilized, nature_of_delay
  } = req.body;

  try {
    // 1. Fetch current data
    const pRes = await pool.query('SELECT * FROM lgu_projects WHERE lgu_project_id = $1', [id]);
    if (pRes.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const current = pRes.rows[0];

    // 2. Prepare Updates
    let updates = [];
    let values = [];
    let idx = 1;

    // Liquidation Logic
    if (liquidated_amount !== undefined) {
      const totalFunds = parseFloat(current.total_funds || 0);
      let liq = 0;
      if (typeof liquidated_amount === 'string') {
        liq = parseFloat(liquidated_amount.replace(/,/g, ''));
      } else {
        liq = parseFloat(liquidated_amount || 0);
      }

      let pct = 0;
      if (totalFunds > 0) pct = parseFloat(((liq / totalFunds) * 100).toFixed(2));

      updates.push(`liquidated_amount = $${idx++} `); values.push(liq);
      updates.push(`percentage_liquidated = $${idx++} `); values.push(pct);

      if (liquidation_date) {
        updates.push(`liquidation_date = $${idx++} `); values.push(liquidation_date);
      }
    }

    // Progress Logic
    if (project_status !== undefined) { updates.push(`project_status = $${idx++} `); values.push(project_status); }
    if (accomplishment_percentage !== undefined) {
      let acc = accomplishment_percentage;
      if (typeof acc === 'string') acc = parseFloat(acc.replace(/,/g, ''));
      updates.push(`accomplishment_percentage = $${idx++} `); values.push(acc);
    }
    if (status_as_of_date !== undefined) { updates.push(`status_as_of_date = $${idx++} `); values.push(status_as_of_date); }
    if (amount_utilized !== undefined) {
      let util = amount_utilized;
      if (typeof util === 'string') util = parseFloat(util.replace(/,/g, ''));
      updates.push(`amount_utilized = $${idx++} `); values.push(util);
    }
    if (nature_of_delay !== undefined) { updates.push(`nature_of_delay = $${idx++} `); values.push(nature_of_delay); }

    if (updates.length === 0) {
      return res.json({ success: true, message: "No changes detected." });
    }

    values.push(id);
    const query = `
      UPDATE lgu_projects
      SET ${updates.join(', ')}
      WHERE lgu_project_id = $${idx}
RETURNING *;
`;
    const result = await pool.query(query, values);

    res.json({ success: true, project: result.rows[0] });

  } catch (err) {
    console.error("Update LGU Project Error:", err);
    res.status(500).json({ error: "Failed to update project." });
  }
});

// --- LGU LIQUIDATION ENDPOINTS (DEPRECATED/KEPT FOR REF IF NEEDED but we rely on new table now) ---

// 1. Update Liquidation (Old LGU Forms - keeping if needed for other modules but user wants NEW table)
// Leaving this here as it was part of existing code, but our new UI will use the new endpoints above.
app.put('/api/lgu/projects/:id/liquidation', async (req, res) => {
  const { id } = req.params; // project_id in lgu_forms
  const { liquidated_amount, liquidation_date, funds_downloaded } = req.body;

  try {
    // Calculate percentage
    // Ensure we have funds_downloaded. If not passed, fetch it.
    let totalFunds = funds_downloaded;

    if (!totalFunds) {
      const pRes = await pool.query('SELECT funds_downloaded FROM lgu_forms WHERE project_id = $1', [id]);
      if (pRes.rows.length > 0) {
        totalFunds = pRes.rows[0].funds_downloaded;
      }
    }

    let percentage = 0;
    if (totalFunds > 0 && liquidated_amount >= 0) {
      percentage = (liquidated_amount / totalFunds) * 100;
      percentage = parseFloat(percentage.toFixed(2)); // Round to 2 decimals
    }

    const query = `
      UPDATE lgu_forms
      SET liquidated_amount = $1, liquidation_date = $2, percentage_liquidated = $3
      WHERE project_id = $4
RETURNING *;
`;
    const result = await pool.query(query, [liquidated_amount, liquidation_date, percentage, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ success: true, project: result.rows[0] });

  } catch (err) {
    console.error("Update Liquidation Error:", err);
    res.status(500).json({ error: "Failed to update liquidation." });
  }
});

// --- FIREBASE admin INIT ---
if (!admin.apps.length) {
  try {
    let credential;
    // 1. Try Environment Variable (Vercel Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
      console.log("… Firebase admin Initialized from ENV");
    }
    // 2. Try Local File (Local Dev)
    else {
      try {
        const serviceAccount = require("./service-account.json");
        credential = admin.credential.cert(serviceAccount);
        console.log("… Firebase admin Initialized from Local File");
      } catch (fileErr) {
        console.warn(" ï¸ No local service-account.json found.");
      }
    }

    if (credential) {
      admin.initializeApp({ credential });
    } else {
      console.warn(" ï¸ Firebase admin NOT initialized (Missing Credentials)");
    }
  } catch (e) {
    console.warn(" ï¸ Firebase admin Init Failed:", e.message);
  }
}

// Initialize OTP Table


const initOtpTable_OLD = async () => {
  if (!isDbConnected) {
    console.log(" ï¸ Skipping OTP Table Init (Offline Mode)");
    return;
  }

  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS verification_codes(
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP DEFAULT(NOW() + INTERVAL '10 minutes')
);
`);
    console.log("… OTP Table Initialized");
  } catch (err) {
    console.error("âŒ Failed to init OTP table:", err);
  }
};

// --- DATABASE CONNECTION ---
// Auto-connect and initialize
// --- END OF LEGACY MIGRATIONS (REMOVED) ---


// --- NEW DATABASE INITIALIZATION ---
/* Moved to awaited startup
(async () => {
  // 1. Primary Database
  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log('… Connected to Postgres Database (Primary) successfully!');
 
    try {
      await initOtpTable(pool);
      await runMigrations(client, "Primary");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('âŒ FATAL: Could not connect to Postgres DB:', err.message);
    console.warn(' ï¸  RUNNING IN OFFLINE MOCK MODE.');
    isDbConnected = false;
  }
 
  // 2. Secondary Database (Dual Write Target)
  if (poolNew) {
    console.log("”Œ Initializing Secondary Database Migrations...");
    try {
      const clientNew = await poolNew.connect();
      console.log('… Connected to Secondary DB for Migrations!');
      try {
        // We don't run initOtpTable on Secondary (it's auth related/Primary only mostly)
        // But we run Schema Migrations
        await runMigrations(clientNew, "Secondary");
      } finally {
        clientNew.release();
      }
    } catch (err) {
      console.error('âŒ Failed to migrate Secondary Database:', err.message);
    }
  }
})();
*/

// Consolidated to 6538+



// --- MASTER PASSWORD ACCESS (admin/Superuser) ---
app.post('/api/auth/master-login', async (req, res) => {
  if (!req.body) {
    console.error("[AUTH DEBUG] req.body is UNDEFINED at master-login. Content-Type:", req.headers['content-type']);
    return res.status(400).json({ error: "Missing request body." });
  }
  const { email, school_id, masterPassword } = req.body;
  const identifier = (school_id || email || '').trim();

  if (!identifier || !masterPassword) {
    return res.status(400).json({ error: "Identifier and Master Password required." });
  }

  try {
    // 1. Verify Master Password
    const correctMasterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (!correctMasterPassword) {
      console.error("â Œ ADMIN_MASTER_PASSWORD not configured in .env");
      return res.status(500).json({ error: "Master password not configured." });
    }

    console.log(`[AUTH DEBUG] Master Password attempt for ${identifier}. Input: "${masterPassword}", Expected Length: ${correctMasterPassword?.length}`);
    if (masterPassword !== correctMasterPassword) {
      console.warn(` ï¸  Failed master password attempt for: ${email} `);
      return res.status(403).json({ error: "Incorrect master password." });
    }

    // 2. Look up the target user
    const isSchoolId = !!school_id || /^\d{6,}$/.test(identifier);
    const selectCols = 'uid, email, role, region, division, account_category, first_name, last_name, school_id, passcode';

    const query = isSchoolId
      ? `SELECT ${selectCols} FROM users WHERE school_id = $1`
      : `SELECT ${selectCols} FROM users WHERE LOWER(email) = $1`;

    const lookupResult = await pool.query(query, [isSchoolId ? identifier : identifier.toLowerCase()]);

    if (lookupResult.rows.length === 0) {
      return res.status(404).json({ error: "Username does not exist. Kindly register first." });
    }

    const targetUser = lookupResult.rows[0];
    // 3. Generate a JWT session token for the target user (identify by school_id if SH)
    const token = jwt.sign(
      {
        uid: targetUser.uid,
        email: targetUser.email,
        school_id: targetUser.school_id,
        role: targetUser.role
      },
      process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD',
      { expiresIn: '30d' }
    );

    // 4. Log the master password access
    try {
      await pool.query(`
        INSERT INTO activity_logs(user_uid, user_name, role, action_type, target_entity, details)
        VALUES($1, $2, $3, $4, $5, $6)
      `, [
        targetUser.uid,
        `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || 'Unknown',
        'MASTER_ACCESS',
        'MASTER_LOGIN',
        targetUser.email || targetUser.school_id,
        `Account accessed via master password at ${new Date().toISOString()}`
      ]);
    } catch (logError) {
      console.warn("[AUTH] Failed to log master access:", logError.message);
    }

    console.log(`[Master Login] Master password login successful for: ${targetUser.email || targetUser.school_id} (${targetUser.uid})`);

    // 5. Return user data and JWT token
    res.json({
      success: true,
      token,
      user: {
        uid: targetUser.uid,
        email: targetUser.email,
        role: targetUser.role,
        firstName: targetUser.first_name,
        lastName: targetUser.last_name,
        school_id: targetUser.school_id,
        first_name: targetUser.first_name, // Compatibility
        last_name: targetUser.last_name,   // Compatibility
        passcode: targetUser.passcode
      }
    });

  } catch (error) {
    console.error("Master Login Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- admin: RESET DIVISION ENGINEER PASSWORDS ---
app.post('/api/admin/reset-division-engineer-passwords', async (req, res) => {
  const { adminPassword, newPassword } = req.body;
  const correctAdminPassword = process.env.ADMIN_MASTER_PASSWORD;

  if (!adminPassword || adminPassword !== correctAdminPassword) {
    return res.status(403).json({ success: false, error: "Invalid admin password." });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "New password must be at least 6 characters." });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const query = `
      UPDATE users 
      SET 
        password_hash = $1, 
        password_salt = NULL, 
        hash_version = 'bcrypt' 
      WHERE role = 'Division Engineer'
      RETURNING uid, email;
    `;

    const result = await pool.query(query, [passwordHash]);

    console.log(`[admin] Reset ${result.rowCount} Division Engineer passwords to default.`);

    return res.json({
      success: true,
      message: `Successfully reset ${result.rowCount} Division Engineer accounts.`,
      updatedUsers: result.rows.map(u => u.email)
    });

  } catch (error) {
    console.error("admin Password Reset Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================================================================
//                        HELPER FUNCTIONS
// ==================================================================

const valueOrNull = (value) => (value === '' || value === undefined ? null : value);

const normalizeOffering = (val) => {
  if (!val) return '';
  const lower = String(val).toLowerCase().trim();

  if (lower === 'purely es') return 'Purely Elementary';
  if (lower === 'es and jhs (k to 10)') return 'Elementary School and Junior High School (K-10)';
  if (lower === 'all offering (k to 12)') return 'All Offering (K-12)';
  if (lower === 'jhs with shs') return 'Junior and Senior High';
  if (lower === 'purely jhs') return 'Purely Junior High School';
  if (lower === 'purely shs') return 'Purely Senior High School';

  return val; // Return original if no match
};

const parseNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

const parseIntOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9\-]/g, '');
  const parsed = parseInt(cleaned);
  return isNaN(parsed) ? null : parsed;
};

/** Get User Full Name Helper */
const getUserFullName = async (uid) => {
  console.log("” getUserFullName called with API uid:", uid);
  try {
    const res = await pool.query('SELECT first_name, last_name, email FROM users WHERE uid = $1', [uid]);
    console.log("” DB Result for user lookup:", res.rows);

    if (res.rows.length > 0) {
      const { first_name, last_name } = res.rows[0];
      const fullName = `${first_name || ''} ${last_name || ''} `.trim();
      console.log("… Resolved Full Name:", fullName);
      return fullName || null;
    } else {
      console.warn(" ï¸ No user found in DB for UID:", uid);
    }
  } catch (err) {
    console.warn(" ï¸ Error fetching user name:", err.message);
  }
  return null;
};

/** Log Activity Helper */
const logActivity = async (userUid, userName, role, actionType, targetEntity, details, superUserContext = null) => {
  const query = `
        INSERT INTO activity_logs(user_uid, user_name, role, action_type, target_entity, details)
VALUES($1, $2, $3, $4, $5, $6)
  `;
  try {
    let dbDetails = details;
    if (superUserContext) {
      dbDetails = `[SUPER USER VIEW] ${details} (Context: ${superUserContext})`;
    }

    await pool.query(query, [userUid, userName, role, actionType, targetEntity, dbDetails]);
    console.log(`“ Audit Logged: ${actionType} - ${targetEntity} `);

    // --- DUAL WRITE: LOG ACTIVITY ---
    if (poolNew) {
      poolNew.query(query, [userUid, userName, role, actionType, targetEntity, details])
        .catch(e => console.error("âŒ Dual-Write Log Error:", e.message));
    }
  } catch (err) {
    console.error("âŒ Failed to log activity:", err.message);
  }
};

// --- HELPER: UPDATE SCHOOL SUMMARY (INSTANT) ---
const updateSchoolSummary = async (schoolId, db) => {
  console.log(`[InstantUpdate] Starting for ${schoolId}...`);
  try {
    // 1. Fetch School Profile
    const res = await db.query('SELECT * FROM school_profiles WHERE school_id = $1', [schoolId]);
    if (res.rows.length === 0) {
      console.log(`[InstantUpdate] School ${schoolId} not found in profiles.`);
      return;
    }
    const sp = res.rows[0];

    // 2. Completeness Checks (Critical Missing Data)
    const issues = [];
    const totalEnrollment = parseInt(sp.total_enrollment || 0);
    // Use the same sum logic as calculateSchoolProgress to be safe
    const totalTeachers = parseInt(
      (sp.teach_kinder || 0) + (sp.teach_g1 || 0) + (sp.teach_g2 || 0) + (sp.teach_g3 || 0) +
      (sp.teach_g4 || 0) + (sp.teach_g5 || 0) + (sp.teach_g6 || 0) +
      (sp.teach_g7 || 0) + (sp.teach_g8 || 0) + (sp.teach_g9 || 0) + (sp.teach_g10 || 0) +
      (sp.teach_g11 || 0) + (sp.teach_g12 || 0) +
      (sp.teach_multi_1_2 || 0) + (sp.teach_multi_3_4 || 0) + (sp.teach_multi_5_6 || 0) + (sp.teach_multi_3plus_count || 0) +
      (sp.teachers_es || 0) + (sp.teachers_jhs || 0) + (sp.teachers_shs || 0)
    );
    const totalClassrooms = parseInt(sp.build_classrooms_total || 0);
    const totalToilets = parseInt(
      (sp.res_toilets_male || 0) + (sp.res_toilets_female || 0) + (sp.res_toilets_common || 0) + (sp.res_toilets_pwd || 0)
    );
    // Fix: Correct variable names for seats as per DB schema usually res_armchair_func etc
    const totalSeats = parseInt(
      (sp.res_armchair_func || 0) + (sp.res_desk_func || 0)
    );

    console.log(`[InstantUpdate] Stats for ${schoolId}: Learners = ${totalEnrollment}, Teachers = ${totalTeachers}, Rooms = ${totalClassrooms} `);

    if (totalEnrollment > 0) {
      if (totalTeachers === 0) issues.push("Critical missing data. No teachers have been reported.");
      if (totalClassrooms === 0) issues.push("Critical missing data. No classrooms have been reported.");
      if (totalToilets === 0) issues.push("Critical missing data. No toilets have been reported.");
    }

    // 3. Score & Description
    // We default to 0 (Pending) instead of 100 to allow the Python script to run
    let score = 0;
    let description = "Pending Validation";
    let formsToRecheck = "";

    if (issues.length > 0) {
      score = 40; // Critical
      description = "Critical";
      formsToRecheck = issues.join("; ");
      console.log(`[InstantUpdate] Issues Found: ${formsToRecheck} `);
    } else {
      console.log(`[InstantUpdate] No Critical Issues. Awaiting Python Validation...`);
    }

    // 4. Update school_summary (Upsert)
    // We update the core metrics + data_health columns
    // NOTE: This query duplicates the Python fields to ensure instant sync.
    // Python script will later overwrite this with more advanced analysis (Outliers, etc.)
    const summaryQuery = `
      INSERT INTO school_summary(
    school_id, school_name, iern, region, division, district,
    total_learners, total_teachers, total_classrooms, total_toilets, total_seats,
    data_health_score, data_health_description, issues, last_updated
  ) VALUES(
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11,
    $12, $13, $14, CURRENT_TIMESTAMP
  )
      ON CONFLICT(school_id) DO UPDATE SET
school_name = EXCLUDED.school_name,
  iern = EXCLUDED.iern,
  region = EXCLUDED.region,
  division = EXCLUDED.division,
  district = EXCLUDED.district,
  total_learners = EXCLUDED.total_learners,
  total_teachers = EXCLUDED.total_teachers,
  total_classrooms = EXCLUDED.total_classrooms,
  total_toilets = EXCLUDED.total_toilets,
  total_seats = EXCLUDED.total_seats,
  data_health_score = EXCLUDED.data_health_score,
  data_health_description = EXCLUDED.data_health_description,
  issues = EXCLUDED.issues,
  last_updated = CURRENT_TIMESTAMP
    `;

    // Simple implementation: Insert with Pending/Critical score, but DO NOT overwrite existing score on conflict
    // unless there is a critical issue.
    // Python will refine and overwrite it later.
    await db.query(`
      INSERT INTO school_summary(
      school_id, school_name, iern, region, division, district,
      total_learners, total_teachers, total_classrooms, total_toilets, total_seats,
      data_health_score, data_health_description, issues, last_updated
    ) VALUES(
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, CURRENT_TIMESTAMP
    )
      ON CONFLICT(school_id) DO UPDATE SET
school_name = EXCLUDED.school_name,
  iern = EXCLUDED.iern,
  region = EXCLUDED.region,
  division = EXCLUDED.division,
  district = EXCLUDED.district,
  total_learners = EXCLUDED.total_learners,
  total_teachers = EXCLUDED.total_teachers,
  total_classrooms = EXCLUDED.total_classrooms,
  total_toilets = EXCLUDED.total_toilets,
  total_seats = EXCLUDED.total_seats,
  issues = EXCLUDED.issues,
  last_updated = CURRENT_TIMESTAMP
    `, [
      sp.school_id, sp.school_name, sp.school_id, sp.region, sp.division, sp.district, // iern is usually ID
      totalEnrollment, totalTeachers, totalClassrooms, totalToilets, totalSeats,
      score, description, formsToRecheck
    ]);

    console.log(`… Instant School Summary Update for ${schoolId}: ${description} (${issues.length} issues)`);

  } catch (err) {
    console.error(" Instant Summary Update Error:", err.message);
  }
};

// --- HELPER: CALCULATE SCHOOL PROGRESS (SNAPSHOT) ---
const calculateSchoolProgress = async (schoolId, dbClientOrPool) => {
  console.log(`TRIGGER: calculateSchoolProgress for ${schoolId}`);
  if (!schoolId) return;
  try {
    // 1. Fetch current data
    const res = await dbClientOrPool.query('SELECT * FROM school_profiles WHERE school_id = $1', [schoolId]);
    if (res.rows.length === 0) return;
    const sp = res.rows[0];

    let completed = 0;
    const total = 11;

    // --- FORM 1: Profile ---
    // Criteria: School ID exists (which it does if we found the row), and Name is set
    const f1 = sp.school_name ? 1 : 0;
    if (f1) completed++;

    // --- FORM 2: School Head ---
    // Criteria: Last Name is present
    const f2 = sp.head_last_name ? 1 : 0;
    if (f2) completed++;

    // --- FORM 3: Enrollment ---
    // Criteria: Total Enrollment > 0
    const f3 = (sp.total_enrollment || 0) > 0 ? 1 : 0;
    if (f3) completed++;

    // --- FORM 4: Organized Classes ---
    // Criteria: Sum of all class counts > 0
    const totalClasses =
      (sp.classes_kinder || 0) + (sp.classes_grade_1 || 0) + (sp.classes_grade_2 || 0) + (sp.classes_grade_3 || 0) +
      (sp.classes_grade_4 || 0) + (sp.classes_grade_5 || 0) + (sp.classes_grade_6 || 0) +
      (sp.classes_grade_7 || 0) + (sp.classes_grade_8 || 0) + (sp.classes_grade_9 || 0) + (sp.classes_grade_10 || 0) +
      (sp.classes_grade_11 || 0) + (sp.classes_grade_12 || 0);
    const f4 = totalClasses > 0 ? 1 : 0;
    if (f4) completed++;

    // --- FORM 5: Teachers ---
    // Criteria: Sum of all teacher counts > 0
    const totalTeachers =
      (sp.teach_kinder || 0) + (sp.teach_g1 || 0) + (sp.teach_g2 || 0) + (sp.teach_g3 || 0) +
      (sp.teach_g4 || 0) + (sp.teach_g5 || 0) + (sp.teach_g6 || 0) +
      (sp.teach_g7 || 0) + (sp.teach_g8 || 0) + (sp.teach_g9 || 0) + (sp.teach_g10 || 0) +
      (sp.teach_g11 || 0) + (sp.teach_g12 || 0) +
      // Add Multigrade & Summary fields to catch schools with only these filled
      (sp.teach_multi_1_2 || 0) + (sp.teach_multi_3_4 || 0) + (sp.teach_multi_5_6 || 0) + (sp.teach_multi_3plus_count || 0) +
      (sp.teachers_es || 0) + (sp.teachers_jhs || 0) + (sp.teachers_shs || 0);
    const f5 = totalTeachers > 0 ? 1 : 0;
    if (f5) completed++;

    // --- FORM 6: Specialization ---
    // Criteria: At least one record in the new teacher_specialization_details table
    // OR legacy aggregate columns have data
    const resultSpec = await dbClientOrPool.query(
      'SELECT id FROM teacher_specialization_details WHERE school_id = $1 LIMIT 1',
      [schoolId]
    );

    let f6 = resultSpec.rows.length > 0 ? 1 : 0;

    if (!f6) {
      // Fallback: Check Legacy Columns
      // Columns: spec_general_teaching, spec_english_major, etc.
      // We check if ANY of them are greater than 0
      const legacyCols = [
        'spec_general_teaching', 'spec_ece_teaching', 'spec_english_major', 'spec_filipino_major',
        'spec_math_major', 'spec_science_major', 'spec_ap_major', 'spec_tle_major',
        'spec_mapeh_major', 'spec_esp_major', 'spec_bio_sci_major', 'spec_phys_sci_major',
        'spec_agri_fishery_major', 'spec_others_major'
      ];
      // Check if any col in sp is > 0
      const hasLegacy = legacyCols.some(col => (sp[col] || 0) > 0);
      if (hasLegacy) f6 = 1;
    }

    if (f6) completed++;

    // --- FORM 7: Resources ---
    // Criteria: Any key infrastructure/utility field is set OR any inventory count > 0
    const f7 = (sp.res_electricity_source || sp.res_water_source || sp.res_buildable_space || sp.sha_category ||
      (sp.res_armchair_func || 0) > 0 || (sp.res_armchairs_good || 0) > 0 ||
      (sp.res_toilets_male || 0) > 0 ||
      (sp.female_bowls_func || 0) > 0 || (sp.male_bowls_func || 0) > 0 ||
      (sp.male_urinals_func || 0) > 0 || (sp.pwd_bowls_func || 0) > 0) ? 1 : 0;
    if (f7) completed++;

    // --- FORM 8: Facilities ---
    // Criteria: Total Classrooms > 0
    const f8 = (sp.build_classrooms_total || 0) > 0 ? 1 : 0;
    if (f8) completed++;


    // --- FORM 9: Shifting ---
    // Criteria: Any shift (K-12) OR any mode (K-12) OR any ADM defined
    const hasShift =
      (sp.shift_kinder || sp.shift_g1 || sp.shift_g2 || sp.shift_g3 || sp.shift_g4 || sp.shift_g5 || sp.shift_g6 ||
        sp.shift_g7 || sp.shift_g8 || sp.shift_g9 || sp.shift_g10 || sp.shift_g11 || sp.shift_g12);
    const hasMode =
      (sp.mode_kinder || sp.mode_g1 || sp.mode_g2 || sp.mode_g3 || sp.mode_g4 || sp.mode_g5 || sp.mode_g6 ||
        sp.mode_g7 || sp.mode_g8 || sp.mode_g9 || sp.mode_g10 || sp.mode_g11 || sp.mode_g12);
    const hasAdm = (sp.adm_mdl || sp.adm_odl || sp.adm_tvi || sp.adm_blended || sp.adm_others);

    const f9 = (hasShift || hasMode || hasAdm) ? 1 : 0;
    if (f9) completed++;

    // --- FORM 10: Learner Statistics ---
    // Criteria: Any stat field > 0
    // We check keys starting with 'stat_' that have numeric value > 0
    const hasStats = Object.keys(sp).some(key => key.startsWith('stat_') && Number(sp[key]) > 0);
    const f10 = hasStats ? 1 : 0;
    if (f10) completed++;
    else {
      // It's normal to be incomplete, reduce log spam or clarify message
      // console.log(`[DEBUG] School ${ schoolId } F10 Incomplete.Keys checked: ${ Object.keys(sp).filter(k => k.startsWith('stat_')).length }, HasStats: ${ hasStats } `);
    }

    // --- FORM 11: School Location ---
    const f11 = sp.f11_location ? 1 : 0;
    if (f11) completed++;

    // 2. Calculate and Update
    const percentage = Math.round((completed / total) * 100);

    /* 
       Optimization: We update ALL columns (f1...f10) + summary columns 
       This allows granular "Table View" as requested.
    */
    await dbClientOrPool.query(`
      UPDATE school_profiles
      SET
        forms_completed_count = $1,
        completion_percentage = $2,
        f1_profile = $4,
        f2_head = $5,
        f3_enrollment = $6,
        f4_classes = $7,
        f5_teachers = $8,
        f6_specialization = $9,
        f7_resources = $10,
        f8_facilities = $11,
        f9_shifting = $12,
        f10_stats = $13,
        f11_location = $14
      WHERE school_id = $3
    `, [
      completed, percentage, schoolId,
      f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11
    ]);

    console.log(`… Snapshot Updated for ${schoolId}: ${completed}/${total} (${percentage}%) [${f1}${f2}${f3}${f4}${f5}${f6}${f7}${f8}${f9}${f10}${f11}]`);

    // --- OPTIMIZATION: INSTANT SUMMARY UPDATE ---
    await updateSchoolSummary(schoolId, dbClientOrPool);

    // --- TRIGGER FRAUD DETECTION IF COMPLETE (CONTINUOUS) ---
    if (percentage === 100) {
      console.log(`š€ School ${schoolId} is 100% complete. Triggering Advanced Fraud Detection...`);

      try {
        const { spawn } = await import('child_process');
        // Pass schoolId as an argument with proper flag
        const pythonProcess = spawn('python', ['advanced_fraud_detection.py', '--school_id', schoolId]);

        pythonProcess.stdout.on('data', (data) => {
          // Optional: reduce log spam unless critical
          // console.log(`[Fraud Detection Output]: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error(`[Fraud Detection Error]: ${data}`);
        });

        pythonProcess.on('error', (err) => {
          console.error("❌ Failed to spawn python process:", err.message);
        });

        pythonProcess.on('close', (code) => {
          console.log(`… Fraud Detection process completed with code ${code}`);
        });
      } catch (e) {
        console.error("❌ Error initializing fraud detection:", e.message);
      }
    }

  } catch (err) {
    console.error("âŒ Snapshot Error:", err);
  }
};

// ==================================================================
//                        CORE ROUTES
// ==================================================================

// --- ENGINEER MOTHER MOA ENDPOINTS ---

// --- NEW: FETCH MOTHER MOA LOCATIONS ---
app.get('/api/reference/mother-moa-locations', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT region, province, municipality, city
      FROM engineer_form 
      WHERE region IS NOT NULL
      ORDER BY region, province, municipality, city
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch MOA Locations Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engineer-mother-moas
app.get('/api/engineer-mother-moas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.first_name, u.last_name 
      FROM engineer_mother_moa m
      LEFT JOIN users u ON m.uploaded_by = u.uid
      ORDER BY m.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Mother MOA Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/engineer-mother-moas/:id
app.delete('/api/engineer-mother-moas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM engineer_mother_moa WHERE mother_moa_id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mother MOA not found" });
    }
    res.json({ success: true, message: "Mother MOA deleted successfully" });
  } catch (err) {
    console.error("Delete Mother MOA Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/validate-drive-link', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // 1. Extract File ID
    let fileId = '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
    else {
      const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch) fileId = idMatch[1];
    }

    if (!fileId) return res.status(400).json({ error: 'Invalid Google Drive link format. Make sure it is a specific file link.' });

    if (!drive) return res.status(500).json({ error: 'Google Drive API not initialized' });

    // 2. Check Accessibility
    // We try to fetch file metadata. If it's "Anyone with link", the service account 
    // (acting as "Anyone") should be able to at least "get" the file metadata.
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType'
    });

    if (response.data) {
      // If we can see it, it's accessible.
      res.json({ 
        success: true, 
        fileName: response.data.name,
        mimeType: response.data.mimeType
      });
    } else {
      res.status(403).json({ error: 'Permission Denied. The link must be set to "Anyone with link" in Google Drive settings.' });
    }
  } catch (error) {
    console.error('❌ Drive Validation Error:', error.message);
    if (error.code === 404) {
      res.status(404).json({ error: 'File not found or link is private. Please set it to "Anyone with link".' });
    } else {
      res.status(500).json({ error: 'Failed to validate link. ' + error.message });
    }
  }
});

// POST /api/upload-engineer-mother-moa
app.post('/api/upload-engineer-mother-moa', upload.fields([{ name: 'moa_pdf', maxCount: 1 }, { name: 'sangguniang_resolution', maxCount: 1 }]), async (req, res) => {
  const { region, province, municipality_city, lgu_type, lgu_name, uid } = req.body;
  
  if (!lgu_type || !lgu_name || !uid) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let moa_pdf_base64 = null;
    let sr_base64 = null;

    if (req.files && req.files['moa_pdf'] && req.files['moa_pdf'].length > 0) {
        moa_pdf_base64 = fs.readFileSync(req.files['moa_pdf'][0].path, { encoding: 'base64' });
    } else {
        return res.status(400).json({ error: "Mother MOA PDF file is required." });
    }

    if (req.files && req.files['sangguniang_resolution'] && req.files['sangguniang_resolution'].length > 0) {
        sr_base64 = fs.readFileSync(req.files['sangguniang_resolution'][0].path, { encoding: 'base64' });
    }

    // Generate unique Sangguniang Resolution ID like INF-SRID-YYYY-XXXX
    const year = new Date().getFullYear();
    const srId = `INF-SRID-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const mId = `INF-MMID-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    await pool.query(`
      INSERT INTO engineer_mother_moa (mother_moa_id, region, province, municipality_city, lgu_type, lgu_name, moa_pdf, sangguniang_resolution_id, sangguniang_resolution, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [mId, region, province, municipality_city, lgu_type, lgu_name, moa_pdf_base64, srId, sr_base64, uid]);

    // Activity logging
    const uName = await getUserFullName(uid);
    await pool.query(`
      INSERT INTO activity_logs (user_uid, user_name, action_type, details, target_entity)
      VALUES ($1, $2, $3, $4, $5)
    `, [uid, uName || 'Engineer', 'UPLOAD', `Uploaded Mother MOA for ${lgu_name} (${lgu_type})`, 'Mother MOA']);

    res.json({ success: true });

    // --- Background Compression Tasks ---
    if (req.files['moa_pdf'] && req.files['moa_pdf'].length > 0) {
        processPdfFile(req.files['moa_pdf'][0]).then(async compressedBase64 => {
            try {
                await pool.query('UPDATE engineer_mother_moa SET moa_pdf = $1 WHERE mother_moa_id = $2', [compressedBase64, mId]);
                console.log(`✅ Background MOA Compression Success for ${mId}`);
            } catch (e) {
                console.error(`❌ Background MOA Update Failed for ${mId}`, e);
            }
        }).catch(err => console.error("MOA bg compress err", err));
    }
    if (req.files['sangguniang_resolution'] && req.files['sangguniang_resolution'].length > 0) {
        processPdfFile(req.files['sangguniang_resolution'][0]).then(async compressedBase64 => {
            try {
                await pool.query('UPDATE engineer_mother_moa SET sangguniang_resolution = $1 WHERE mother_moa_id = $2', [compressedBase64, mId]);
                console.log(`✅ Background SR Compression Success for ${mId}`);
            } catch (e) {
                console.error(`❌ Background SR Update Failed for ${mId}`, e);
            }
        }).catch(err => console.error("SR bg compress err", err));
    }
  } catch (err) {
    console.error("Mother MOA Upload Error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

// GET /api/engineer-supplemental-moas/:mother_moa_id
app.get('/api/engineer-supplemental-moas/:mother_moa_id', async (req, res) => {
  const { mother_moa_id } = req.params;
  try {
    // 1. Fetch supplemental MOAs
    const suppResult = await pool.query(`
      SELECT s.*, u.first_name, u.last_name 
      FROM engineer_supplamental_moa s
      LEFT JOIN users u ON s.uploaded_by = u.uid
      WHERE s.mother_moa_id = $1
      ORDER BY s.created_at DESC
    `, [mother_moa_id]);

    // 2. Extract all unique IPCs from all supplemental MOAs
    const allIpcs = new Set();
    suppResult.rows.forEach(row => {
      const ids = row.ipc_ids || [];
      ids.forEach(id => allIpcs.add(id));
    });

    // 3. Fetch project names for these IPCs
    const projectMap = {};
    if (allIpcs.size > 0) {
      const projectsRes = await pool.query(
        'SELECT ipc, project_name FROM engineer_form WHERE ipc = ANY($1)',
        [Array.from(allIpcs)]
      );
      projectsRes.rows.forEach(p => { projectMap[p.ipc] = p.project_name; });
    }

    // 4. Transform results to include project detail objects instead of just strings
    const detailedSupplementals = suppResult.rows.map(row => {
      const detailedIpcs = (row.ipc_ids || []).map(id => ({
        ipc: id,
        project_name: projectMap[id] || "Unknown Project"
      }));
      return { ...row, ipcs: detailedIpcs };
    });

    res.json(detailedSupplementals);
  } catch (err) {
    console.error("Fetch Supplemental MOA Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/projects-for-moa/:mother_moa_id
app.get('/api/projects-for-moa/:mother_moa_id', async (req, res) => {
  const { mother_moa_id } = req.params;
  try {
    // 1. Get Mother MOA LGU info
    const motherRes = await pool.query(`
      SELECT region, province, municipality_city, lgu_type 
      FROM engineer_mother_moa 
      WHERE mother_moa_id = $1
    `, [mother_moa_id]);

    if (motherRes.rows.length === 0) {
      return res.status(404).json({ error: "Mother MOA not found" });
    }

    const { region, province, municipality_city, lgu_type } = motherRes.rows[0];

    // 2. Query engineer_form based on LGU
    let query = `
      SELECT ipc, project_name, school_name, project_id 
      FROM engineer_form 
      WHERE region = $1 AND province = $2
    `;
    let params = [region, province];

    if (lgu_type !== 'PGO' && municipality_city) {
      query += ` AND (city = $3 OR municipality = $3)`;
      params.push(municipality_city);
    }

    query += ` ORDER BY project_name ASC`;

    const projectsRes = await pool.query(query, params);
    res.json(projectsRes.rows);
  } catch (err) {
    console.error("Fetch Projects for MOA Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/agency-dashboard/mother-moas (Filtered for Dashboard)
app.get('/api/agency-dashboard/mother-moas', async (req, res) => {
  const { agency, region, province, city } = req.query;
  try {
    let filterClause = '';
    let params = [];
    let paramCount = 1;

    if (agency && agency !== 'All') {
      const agencyClean = agency.replace(/^MGO\s+|PGO\s+|CGO\s+/i, '').trim();
      if (agencyClean) {
        filterClause += ` AND (lgu_name ILIKE $${paramCount} OR lgu_type ILIKE $${paramCount})`;
        params.push(`%${agencyClean}%`);
        paramCount++;
      }
    }

    if (region && region !== 'All') {
      const regionClean = region.replace(/^Region\s+|^Reg-\s*|^R-\s*/i, '').trim();
      // Ensure exact match or bounded match so 'CAR' doesn't match 'CARAGA'
      filterClause += ` AND TRIM(REGEXP_REPLACE(region, '(?i)^Region\\s+|^Reg-\\s*|^R-\\s*', '')) ILIKE $${paramCount}`;
      params.push(regionClean);
      paramCount++;
    }

    if (province && province !== 'All' && province !== 'null') {
      // PGOs only see their province
      filterClause += ` AND province ILIKE $${paramCount}`;
      params.push(`%${province}%`);
      paramCount++;
    }

    if (city && city !== 'All' && city !== 'null') {
      // MGO/CGOs only see their municipality/city
      filterClause += ` AND lgu_name ILIKE $${paramCount}`;
      params.push(`%${city}%`);
      paramCount++;
    }

    const query = `
      SELECT mother_moa_id as moa_id, region, province, lgu_name as implementing_agency, moa_pdf as moa_link
      FROM engineer_mother_moa
      WHERE 1=1 ${filterClause}
      ORDER BY mother_moa_id DESC
    `;
    const result = await pool.query(query, params);
    res.json({ success: true, motherMoas: result.rows });
  } catch (err) {
    console.error("❌ Fetch Mother MOAs Error:", err.message);
    res.status(500).json({ error: "Failed to fetch mother MOAs" });
  }
});

// POST /api/upload-engineer-supplemental-moa
app.post('/api/upload-engineer-supplemental-moa', upload.single('moa_pdf'), async (req, res) => {
  const { mother_moa_id, uid, ipc_ids } = req.body;
  
  let parsedIpcIds = [];
  if (ipc_ids) {
    try {
      parsedIpcIds = typeof ipc_ids === 'string' ? JSON.parse(ipc_ids) : ipc_ids;
    } catch(e) { /* ignore */ }
  }

  if (!mother_moa_id || !uid) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let moa_pdf_base64 = null;
    if (req.file) {
        moa_pdf_base64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
    } else {
        return res.status(400).json({ error: "Supplemental MOA PDF file is required." });
    }

    // Check if mother MOA exists
    const motherRes = await pool.query('SELECT lgu_name, lgu_type, sangguniang_resolution_id FROM engineer_mother_moa WHERE mother_moa_id = $1', [mother_moa_id]);
    if (motherRes.rows.length === 0) {
      return res.status(404).json({ error: "Mother MOA not found" });
    }
    const motherMoa = motherRes.rows[0];

    const year = new Date().getFullYear();
    const sId = `INF-SMID-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    await pool.query(`
      INSERT INTO engineer_supplamental_moa (supplamental_moa_id, mother_moa_id, moa_pdf, uploaded_by, ipc_ids)
      VALUES ($1, $2, $3, $4, $5)
    `, [sId, mother_moa_id, moa_pdf_base64, uid, JSON.stringify(parsedIpcIds)]);

    // Activity logging
    const uName = await getUserFullName(uid);
    await pool.query(`
      INSERT INTO activity_logs (user_uid, user_name, action_type, details, target_entity)
      VALUES ($1, $2, $3, $4, $5)
    `, [uid, uName || 'Engineer', 'UPLOAD', `Uploaded Supplemental MOA for Mother MOA ${mother_moa_id} (${motherMoa.lgu_name} - ${motherMoa.lgu_type})`, 'Supplemental MOA']);

    res.json({ success: true });

    // --- Background Compression Task ---
    if (req.file) {
        processPdfFile(req.file).then(async compressedBase64 => {
            try {
                await pool.query('UPDATE engineer_supplamental_moa SET moa_pdf = $1 WHERE supplamental_moa_id = $2', [compressedBase64, sId]);
                console.log(`✅ Background Supplemental MOA Compression Success for ${sId}`);
            } catch (e) {
                console.error(`❌ Background Supplemental Update Failed for ${sId}`, e);
            }
        }).catch(err => console.error("Supplemental bg compress err", err));
    }

    // Update engineer_form for assigned IPCs
    (async () => {
      try {
        if (parsedIpcIds && parsedIpcIds.length > 0) {
          await pool.query(`
            UPDATE engineer_form 
            SET supplamental_moa_id = $1, mother_moa_id = $2, sangguniang_resolution_id = $3
            WHERE ipc = ANY($4)
          `, [sId, mother_moa_id, motherMoa.sangguniang_resolution_id, parsedIpcIds]);
          console.log(`✅ Linked projects ${parsedIpcIds.join(', ')} to Supplemental MOA ${sId}`);
        }
      } catch (bkErr) {
        console.error("❌ Failed to link projects to Supplemental MOA:", bkErr.message);
      }
    })();
  } catch (err) {
    console.error("Upload Supplemental MOA Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 1. GET: Fetch Recent Activities ---
// --- 1. GET: Fetch Recent Activities ---
app.get('/api/activities', async (req, res) => {
  try {
    const { user_uid } = req.query;
    let query = `
      SELECT 
          log_id, user_name, role, action_type, target_entity, details, 
          TO_CHAR(timestamp, 'Mon DD, HH:MI AM') as formatted_time 
      FROM activity_logs 
    `;

    const params = [];
    if (user_uid) {
      query += ` WHERE user_uid = $1 `;
      params.push(user_uid);
    }

    query += ` ORDER BY timestamp DESC LIMIT 100 `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching activities" });
  }
});

// --- 1b. POST: Generic Log Activity (For Frontend Actions) ---
app.post('/api/log-activity', async (req, res) => {
  try {
    const { userUid, userName, role, actionType, targetEntity, details } = req.body || {};
    await logActivity(userUid, userName, role, actionType, targetEntity, details);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Log Error:", err);
    res.status(500).json({ error: "Failed to log" });
  }
});

// --- 1c. SYSTEM SETTINGS ENDPOINTS ---

// GET Setting
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = $1', [key]);
    if (result.rows.length > 0) {
      res.json({ value: result.rows[0].setting_value });
    } else {
      res.json({ value: null });
    }
  } catch (err) {
    console.error(`Get Setting Error [${key}]:`, err);
    res.status(500).json({ error: "Failed to fetch setting" });
  }
});

// SAVE Setting (Upsert)
app.post('/api/settings/save', async (req, res) => {
  const { key, value, userUid } = req.body;

  if (!key) return res.status(400).json({ error: "Key is required" });

  try {
    // Upsert setting
    await pool.query(`
            INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
            ON CONFLICT (setting_key) 
            DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
        `, [key, value, userUid]);

    // Log functionality
    if (userUid) {
      await logActivity(userUid, 'admin', 'admin', 'UPDATE SETTING', key, `Updated ${key} to ${value}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Save Setting Error:", err);
    res.status(500).json({ error: "Failed to save setting" });
  }
});

// --- 1d. admin USER MANAGEMENT ---

// GET All Users
app.get('/api/admin/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const region = req.query.region || '';
    const division = req.query.division || '';

    // Base Query
    let baseQuery = `FROM users`;
    const params = [];
    let whereClauses = [];

    // Role Filter
    if (role) {
      params.push(role);
      whereClauses.push(`role = $${params.length}`);
    }

    // Region Filter
    if (region) {
      params.push(region);
      whereClauses.push(`region = $${params.length}`);
    }

    // Division Filter
    if (division) {
      params.push(division);
      whereClauses.push(`division = $${params.length}`);
    }

    // Search Filter
    if (search) {
      params.push(`%${search}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        first_name ILIKE $${searchIdx} OR 
        last_name ILIKE $${searchIdx} OR 
        email ILIKE $${searchIdx} OR
        role ILIKE $${searchIdx}
      )`);
    }

    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ` + whereClauses.join(' AND ');
    }

    // Data Query
    const dataQuery = `
      SELECT uid, email, role, first_name, last_name, region, division, created_at, disabled 
      ${baseQuery}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // Count Query
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    // Execute Queries
    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);

    const total = parseInt(countRes.rows[0].total);

    res.json({
      data: dataRes.rows,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error("Get Users Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
app.get('/api/admin/user-stats', async (req, res) => {
  try {
    const { region, division, role } = req.query;

    let whereClause = "WHERE 1=1";
    const params = [];

    if (role) {
      params.push(role);
      whereClause += ` AND role = $${params.length}`;
    }
    if (region) {
      params.push(region);
      whereClause += ` AND region = $${params.length}`;
    }
    if (division) {
      params.push(division);
      whereClause += ` AND division = $${params.length}`;
    }

    const totalRes = await pool.query(`SELECT COUNT(*) as total FROM users ${whereClause === "WHERE 1=1" ? "" : whereClause}`, params);

    // For breakdown, we want counts per role given the OTHER filters
    let breakdownWhereClause = "WHERE role IS NOT NULL AND role != ''";
    const breakdownParams = [];
    if (region) {
      breakdownParams.push(region);
      breakdownWhereClause += ` AND region = $${breakdownParams.length}`;
    }
    if (division) {
      breakdownParams.push(division);
      breakdownWhereClause += ` AND division = $${breakdownParams.length}`;
    }

    const breakdownRes = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      ${breakdownWhereClause}
      GROUP BY role 
      ORDER BY count DESC
    `, breakdownParams);

    res.json({
      total: parseInt(totalRes.rows[0].total),
      breakdown: breakdownRes.rows.map(row => ({
        role: row.role,
        count: parseInt(row.count)
      }))
    });
  } catch (err) {
    console.error("User Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

// GET Filter Options for admin Dashboard
app.get('/api/admin/filter-options', async (req, res) => {
  try {
    const regionsRes = await pool.query(`
      SELECT MAX(region) as region 
      FROM users 
      WHERE region IS NOT NULL AND region != '' 
      GROUP BY UPPER(TRIM(region))
      ORDER BY region
    `);
    const divisionsRes = await pool.query(`
      SELECT MAX(division) as division, MAX(region) as region 
      FROM users 
      WHERE division IS NOT NULL AND division != '' 
      GROUP BY UPPER(TRIM(division))
      ORDER BY division
    `);
    const rolesRes = await pool.query(`
      SELECT MAX(role) as role 
      FROM users 
      WHERE role IS NOT NULL AND role != '' 
      GROUP BY UPPER(TRIM(role))
      ORDER BY role
    `);

    res.json({
      regions: regionsRes.rows.map(r => r.region),
      divisions: divisionsRes.rows.map(d => ({ name: d.division, region: d.region })),
      roles: rolesRes.rows.map(r => r.role)
    });
  } catch (err) {
    console.error("Filter Options Error:", err);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

// POST Toggle User Status (Enable/Disable)
app.post('/api/admin/users/:uid/status', async (req, res) => {
  const { uid } = req.params;
  const { disabled, adminUid } = req.body;

  if (typeof disabled !== 'boolean') {
    return res.status(400).json({ error: "Disabled status must be a boolean" });
  }

  try {
    // 1. Update Firebase Auth (Best Effort)
    try {
      await admin.auth().updateUser(uid, { disabled });
    } catch (authErr) {
      console.warn(` ï¸ Firebase Auth update failed (likely missing credentials), creating DB-only ban: ${authErr.message}`);
    }

    // 2. Update DB (Critical Source of Truth) AND Get user email for log
    const result = await pool.query('UPDATE users SET disabled = $1 WHERE uid = $2 RETURNING email', [disabled, uid]);

    // --- DUAL WRITE: USER STATUS ---
    if (poolNew) {
      poolNew.query('UPDATE users SET disabled = $1 WHERE uid = $2', [disabled, uid])
        .catch(e => console.error("Dual-Write User Status Err:", e.message));
    }
    const targetEmail = result.rows.length > 0 ? result.rows[0].email : uid;

    // 3. Log Activity
    if (adminUid) {
      const adminName = await getUserFullName(adminUid) || 'admin';
      const action = disabled ? 'DISABLE_USER' : 'ENABLE_USER';
      await logActivity(adminUid, adminName, 'admin', action, targetEmail, `User ${targetEmail} was ${disabled ? 'disabled' : 'enabled'}`);
    }

    console.log(`… User ${uid} status updated to: ${disabled ? 'Disabled' : 'Active'}`);

    res.json({ success: true });
  } catch (err) {
    console.error("Update User Status Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST admin Reset Password
app.post('/api/admin/reset-password', async (req, res) => {
  const { uid, newPassword, adminUid } = req.body;

  if (!uid || !newPassword) {
    return res.status(400).json({ error: "UID and New Password are required." });
  }

  try {
    // --- LEGACY FIREBASE SYNC REMOVED ---
    // await admin.auth().updateUser(uid, { password: newPassword });

    // 2. Get User Email for logging
    const userRes = await pool.query('SELECT email FROM users WHERE uid = $1', [uid]);
    const targetEmail = userRes.rows.length > 0 ? userRes.rows[0].email : uid;

    // 3. Log Activity
    if (adminUid) {
      const adminName = await getUserFullName(adminUid) || 'admin';
      await logActivity(adminUid, adminName, 'admin', 'RESET_PASSWORD', targetEmail, `admin reset password for ${targetEmail}`);
    }

    console.log(`… Password reset for user ${targetEmail} (${uid})`);
    res.json({ success: true });

  } catch (err) {
    console.error("admin Password Reset Error:", err);
    res.status(500).json({ error: "Failed to reset password: " + err.message });
  }
});

// ==================================================================
//                SDO SCHOOL MANAGEMENT ENDPOINTS
// ==================================================================

// GET - SDO Location Options
app.get('/api/sdo/location-options', async (req, res) => {
  const { region, division } = req.query;

  if (!region || !division) {
    return res.status(400).json({ error: "Region and Division are required" });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT 
        province, municipality, district, leg_district, barangay
      FROM schools
      WHERE region = $1 AND division = $2
      ORDER BY province, municipality, district, barangay
    `, [region, division]);

    res.json(result.rows);
  } catch (err) {
    console.error("Location Options Error:", err);
    res.status(500).json({ error: "Failed to fetch location options" });
  }
});

// POST - SDO Submit New School
// GET - Master List of Schools (For Converted/Transferred Schools)
// GET - Search Single School by ID (For Converted/Transferred Schools)
app.get('/api/master-list/school/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM schools WHERE school_id = $1', [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "School not found" });
    }
  } catch (err) {
    console.error("Fetch Master School Error:", err);
    res.status(500).json({ error: "Failed to fetch school details" });
  }
});

// POST - Submit Converted School
app.post('/api/sdo/convert-school', async (req, res) => {
  const { school_id, ...newDetails } = req.body;
  console.log("Received convert-school request for ID:", school_id); // DEBUG LOG

  if (!school_id) {
    return res.status(400).json({ error: "School ID is required" });
  }

  try {
    // 1. Fetch Original Data
    console.log(`Querying original school data for ID: ${school_id}`); // DEBUG LOG
    const originalRes = await pool.query('SELECT * FROM schools WHERE school_id = $1', [school_id]);
    console.log(`Original school query found rows: ${originalRes.rows.length}`); // DEBUG LOG

    if (originalRes.rows.length === 0) {
      console.error(`Original school record not found for ID: ${school_id}`); // DEBUG LOG
      return res.status(404).json({ error: "Original school record not found" });
    }
    const originalData = originalRes.rows[0];

    // 2. Insert into converted_schools table
    // Ensure table exists (simple check/create if not exists for now)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS converted_schools (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL,
        original_data JSONB,
        new_data JSONB,
        submitted_by VARCHAR(100),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Pending'
      )
    `);

    await pool.query(
      `INSERT INTO converted_schools (school_id, original_data, new_data, submitted_by, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        school_id,
        originalData,
        newDetails,
        newDetails.submitted_by,
        'Pending'
      ]
    );

    res.json({ message: "Converted school application submitted successfully" });
  } catch (err) {
    console.error("Convert School Error:", err);
    res.status(500).json({ error: "Failed to submit converted school application" });
  }
});

// GET - Master List of Schools (DEPRECATED)
app.get('/api/master-list/schools-deprecated', async (req, res) => {
  const { division, region } = req.query;

  if (!division) {
    return res.status(400).json({ error: "Division is required" });
  }

  try {
    // Fetch all schools in the division from the master 'schools' table
    // We select all columns to allow full autofill
    const query = `
      SELECT * 
      FROM schools 
      WHERE division = $1 
      ORDER BY school_name ASC
    `;

    // Optional: Filter by region if provided for extra safety, though division is usually unique enough
    // const query = `SELECT * FROM schools WHERE division = $1 AND region = $2 ORDER BY school_name ASC`;

    const result = await pool.query(query, [division]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Master Schools Error:", err);
    res.status(500).json({ error: "Failed to fetch master school list" });
  }
});

app.post('/api/sdo/submit-school', async (req, res) => {
  const {
    school_id,
    school_name,
    region,
    division,
    district,
    province,
    municipality,
    leg_district,
    barangay,
    street_address,
    mother_school_id,
    curricular_offering,
    latitude,
    longitude,
    submitted_by,
    submitted_by_name,
    special_order
  } = req.body;

  // Validate required fields
  if (!school_id || !school_name || !region || !division || !submitted_by) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check if school_id already exists in pending_schools
    const existingRes = await pool.query('SELECT pending_id, status FROM pending_schools WHERE school_id = $1', [school_id]);
    if (existingRes.rows.length > 0) {
      const existingStatus = existingRes.rows[0].status;
      if (existingStatus === 'pending' || existingStatus === 'approved') {
        return res.status(409).json({ error: "School ID already exists in pending submissions" });
      }

      if (existingStatus === 'rejected') {
        const updateResult = await pool.query(`
          UPDATE pending_schools SET
            school_name = $2, region = $3, division = $4, district = $5, province = $6,
            municipality = $7, leg_district = $8, barangay = $9, street_address = $10,
            mother_school_id = $11, curricular_offering = $12, latitude = $13, longitude = $14,
            submitted_by = $15, submitted_by_name = $16, special_order = $17,
            status = 'pending', submitted_at = CURRENT_TIMESTAMP
          WHERE school_id = $1
          RETURNING pending_id
        `, [
          school_id, school_name, region, division, district, province, municipality, leg_district,
          barangay, street_address, mother_school_id, curricular_offering,
          latitude, longitude, submitted_by, submitted_by_name, special_order
        ]);

        console.log(`[OK] School resubmitted for approval: ${school_name} (${school_id})`);
        return res.json({ success: true, pending_id: updateResult.rows[0].pending_id });
      }
    }

    const result = await pool.query(`
      INSERT INTO pending_schools (
        school_id, school_name, region, division, district, province, municipality, leg_district,
        barangay, street_address, mother_school_id, curricular_offering,
        latitude, longitude, submitted_by, submitted_by_name, special_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING pending_id
    `, [
      school_id, school_name, region, division, district, province, municipality, leg_district,
      barangay, street_address, mother_school_id, curricular_offering,
      latitude, longitude, submitted_by, submitted_by_name, special_order
    ]);

    console.log(`… School submitted for approval: ${school_name} (${school_id})`);
    res.json({ success: true, pending_id: result.rows[0].pending_id });
  } catch (err) {
    console.error("Submit School Error:", err);
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ error: "School ID already exists in pending submissions" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST - SDO Upload Document (Base64)
app.post('/api/sdo/upload-document', async (req, res) => {
  const { pending_id, school_id, type, base64 } = req.body;

  if (!type || !base64) {
    return res.status(400).json({ error: "Document type and base64 data are required" });
  }

  try {
    const query = `
      INSERT INTO school_documents (pending_id, school_id, doc_type, file_data)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [pending_id || null, school_id || null, type, base64]);
    console.log(`✅ Document uploaded directly to Database: ${type} for School ID: ${school_id || 'Pending ' + pending_id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ SDO Document Upload Error:", err.message);
    res.status(500).json({ error: "Failed to save document" });
  }
});

// GET - SDO Retrieve Document (Base64)
app.get('/api/sdo/document/:id/:type', async (req, res) => {
  const { id, type } = req.params;

  try {
    // Robust query: Look up by either school_id OR pending_id 
    // to prevent Document Not Found errors if the front-end confuses them.
    const query = `
      SELECT file_data FROM school_documents 
      WHERE (school_id = $1 OR pending_id::text = $1) 
        AND doc_type = $2 
      ORDER BY created_at DESC LIMIT 1
    `;
    const params = [id, type];

    const docRes = await pool.query(query, params);

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const base64Str = docRes.rows[0].file_data;

    // Handle standard data URI format: data:application/pdf;base64,...
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (matches && matches.length === 3) {
      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${type}_${id}.pdf"`);
      res.send(buffer);
    } else {
      // Fallback if the string doesn't have the mime type prefix
      const buffer = Buffer.from(base64Str, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_${id}.pdf"`);
      res.send(buffer);
    }
  } catch (err) {
    console.error("❌ SDO Document Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// GET - SDO Fetch Pending Schools (by SDO user)
app.get('/api/sdo/pending-schools', async (req, res) => {
  const { sdo_uid } = req.query;

  if (!sdo_uid) {
    return res.status(400).json({ error: "SDO UID required" });
  }

  try {
    const result = await pool.query(`
      SELECT * FROM pending_schools
      WHERE submitted_by = $1 AND status IN ('pending', 'needs_revision')
      ORDER BY submitted_at DESC
    `, [sdo_uid]);

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Pending Schools Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - admin Fetch All Pending Schools
app.get('/api/admin/pending-schools', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM pending_schools
      WHERE status = 'pending'
      ORDER BY submitted_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch All Pending Schools Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - admin Fetch Reviewed Schools (History)
app.get('/api/admin/reviewed-schools', async (req, res) => {
  const { reviewed_by } = req.query;
  try {
    let query = `
      SELECT * FROM pending_schools
      WHERE status IN ('approved', 'rejected')
    `;
    const params = [];

    if (reviewed_by) {
      query += ` AND reviewed_by = $1`;
      params.push(reviewed_by);
    }

    query += ` ORDER BY reviewed_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Reviewed Schools Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - SDO Location Coordinates (Avg Lat/Lng for Auto-Pan)
// Endpoint to get the first school's location for a given set of filters (for map auto-pan)
app.get('/api/sdo/first-school-location', async (req, res) => {
  try {
    console.log('” FIRST-SCHOOL-LOCATION ENDPOINT HIT');
    console.log('Query params:', req.query);

    const { region, division, province, municipality, district, legislative_district } = req.query;

    let query = `
            SELECT latitude as lat, longitude as lng 
            FROM schools 
            WHERE region = $1 AND division = $2 
            AND latitude IS NOT NULL AND longitude IS NOT NULL
        `;
    const params = [region, division];
    let paramIndex = 3;

    if (province) {
      query += ` AND province = $${paramIndex}`;
      params.push(province);
      paramIndex++;
    }
    if (municipality) {
      query += ` AND municipality = $${paramIndex}`;
      params.push(municipality);
      paramIndex++;
    }
    if (district) {
      query += ` AND district = $${paramIndex}`;
      params.push(district);
      paramIndex++;
    }
    if (req.query.barangay) { // Explicitly check req.query or destructure it above
      query += ` AND barangay = $${paramIndex}`;
      params.push(req.query.barangay);
      paramIndex++;
    }

    query += ` LIMIT 1`;

    console.log('Query:', query);
    console.log('Params:', params);

    const result = await pool.query(query, params);
    console.log('Result:', result.rows[0]);
    res.json(result.rows[0] || null);

  } catch (err) {
    console.error('ERROR in first-school-location:', err);
    res.status(500).json({ error: "Server Error", message: err.message });
  }
});

// Original endpoint (kept for reference or other uses)
app.get('/api/sdo/location-coordinates', async (req, res) => {
  const { region, division } = req.query;
  if (!region || !division) return res.status(400).json({ error: "Region and Division required" });

  try {
    console.log(`“ Fetching coordinates for ${region}, ${division}`);
    // We group by province, municipality, barangay to get granular averages
    // SAFE QUERY: Cast to text first to handle both NUMERIC and VARCHAR columns safely with NULLIF
    const result = await pool.query(`
      SELECT 
        province, municipality, barangay,
        AVG(CAST(NULLIF(latitude::text, '') AS DOUBLE PRECISION)) as lat, 
        AVG(CAST(NULLIF(longitude::text, '') AS DOUBLE PRECISION)) as lng
      FROM schools
      WHERE region = $1 AND division = $2
      GROUP BY province, municipality, barangay
    `, [region, division]);

    console.log(`“ Found ${result.rows.length} coordinate groups`);
    res.json(result.rows);
  } catch (err) {
    console.error("Location Coordinates Error:", err);
    res.status(500).json({ error: "Failed to fetch coordinates" });
  }
});

// POST - admin Approve School
// --- CHATBOT KNOWLEDGE TEACHING ---
app.post('/api/admin/teach', async (req, res) => {
  const bb = busboy({ headers: req.headers });
  let question = "";
  let answer = "";
  let filePath = null;
  const tempFiles = [];

  bb.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    if (mimeType === 'application/pdf') {
      const savePath = path.join(process.cwd(), 'storage', `teach_${Date.now()}_${filename}`);
      filePath = savePath;
      tempFiles.push(savePath);
      file.pipe(fs.createWriteStream(savePath));
    } else {
      file.resume();
    }
  });

  bb.on('field', (name, val) => {
    if (name === 'question') question = val;
    if (name === 'answer') answer = val;
    if (name === 'content') answer = val; // Legacy support
  });

  bb.on('finish', async () => {
    try {
      const result = await teachChatbot(question, answer, filePath);
      // Cleanup temp files
      tempFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
      res.json(result);
    } catch (err) {
      console.error("Chatbot Teaching Failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  req.pipe(bb);
});

// GET - Fetch all knowledge base items
app.get('/api/admin/knowledge', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, question, answer, metadata, created_at FROM chatbot_knowledge ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Fetch Knowledge Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT - Update a knowledge entry
app.put('/api/admin/knowledge/:id', async (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body;
  try {
    const result = await updateKnowledgeEntry(id, question, answer);
    res.json(result);
  } catch (err) {
    console.error("Update Knowledge Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove a knowledge entry
app.delete('/api/admin/knowledge/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await deleteKnowledgeEntry(id);
    res.json(result);
  } catch (err) {
    console.error("Delete Knowledge Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- CHATBOT CHAT ---
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question is required" });
    const answer = await chatWithKnowledge(question);
    res.json({ answer });
  } catch (err) {
    console.error("Chatbot Error:", err);
    res.status(500).json({ error: "Failed to get answer from chatbot" });
  }
});

// app.post('/api/feedback') - For user suggestions
app.post('/api/feedback', async (req, res) => {
  try {
    const { content, user_email, user_uid } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Content is required" });
    }

    if (content.length > 200) {
      return res.status(400).json({ error: "Feedback must be 200 characters or less" });
    }

    await pool.query(
      'INSERT INTO system_feedback (content, user_email, user_uid) VALUES ($1, $2, $3)',
      [content.trim(), user_email || null, user_uid || null]
    );

    res.json({ success: true, message: "Thank you for your feedback!" });
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// app.post('/api/bugs') - For user bug reports
app.post('/api/bugs', async (req, res) => {
  try {
    const { description, user_email, user_uid } = req.body;

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: "Description is required" });
    }

    if (description.length > 500) {
      return res.status(400).json({ error: "Bug report must be 500 characters or less" });
    }

    await pool.query(
      'INSERT INTO app_bugs (description, metadata) VALUES ($1, $2)',
      [
        description.trim(),
        JSON.stringify({
          user_email: user_email || null,
          user_uid: user_uid || null,
          timestamp: new Date().toISOString()
        })
      ]
    );

    res.json({ success: true, message: "Developers are on their way to fix this" });
  } catch (err) {
    console.error("Bug Report Error:", err);
    res.status(500).json({ error: "Failed to save bug report" });
  }
});

app.post('/api/admin/approve-school/:pending_id', async (req, res) => {
  const { pending_id } = req.params;
  const { reviewed_by, reviewed_by_name } = req.body;

  try {
    // 1. Get pending school data
    const pendingResult = await pool.query(
      'SELECT * FROM pending_schools WHERE pending_id = $1',
      [pending_id]
    );

    if (pendingResult.rows.length === 0) {
      return res.status(404).json({ error: "Pending school not found" });
    }

    const school = pendingResult.rows[0];

    // 2. Insert into schools table
    await pool.query(`
      INSERT INTO schools (
        school_id, school_name, region, division, district, province, municipality, leg_district,
        barangay, street_address, mother_school_id, curricular_offering, latitude, longitude, special_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (school_id) DO NOTHING
    `, [
      school.school_id, school.school_name, school.region, school.division, school.district,
      school.province, school.municipality, school.leg_district, school.barangay,
      school.street_address, school.mother_school_id, school.curricular_offering,
      school.latitude, school.longitude, school.special_order
    ]);

    // 3. Update pending_schools status
    await pool.query(`
      UPDATE pending_schools
      SET status = 'approved', reviewed_by = $1, reviewed_by_name = $2, reviewed_at = CURRENT_TIMESTAMP
      WHERE pending_id = $3
    `, [reviewed_by, reviewed_by_name, pending_id]);

    // 4. Log Activity
    if (reviewed_by) {
      await logActivity(
        reviewed_by,
        reviewed_by_name || 'admin',
        'admin',
        'APPROVE_SCHOOL',
        school.school_name,
        `Approved school submission: ${school.school_name} (${school.school_id})`
      );
    }

    console.log(`… School approved: ${school.school_name}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Approve School Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - admin Reject School
app.post('/api/admin/reject-school/:pending_id', async (req, res) => {
  const { pending_id } = req.params;
  const { reviewed_by, reviewed_by_name, rejection_reason } = req.body;

  try {
    // 1. Get pending school data for logging
    const pendingResult = await pool.query(
      'SELECT * FROM pending_schools WHERE pending_id = $1',
      [pending_id]
    );

    if (pendingResult.rows.length === 0) {
      return res.status(404).json({ error: "Pending school not found" });
    }

    const school = pendingResult.rows[0];

    // 2. Update pending_schools status
    await pool.query(`
      UPDATE pending_schools
      SET status = 'rejected', reviewed_by = $1, reviewed_by_name = $2, 
          reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $3
      WHERE pending_id = $4
    `, [reviewed_by, reviewed_by_name, rejection_reason, pending_id]);

    // 3. Log Activity
    if (reviewed_by) {
      await logActivity(
        reviewed_by,
        reviewed_by_name || 'admin',
        'admin',
        'REJECT_SCHOOL',
        school.school_name,
        `Rejected school submission: ${school.school_name} (${school.school_id}). Reason: ${rejection_reason || 'None provided'}`
      );
    }

    console.log(`… School rejected: ${school.school_name}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Reject School Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH - admin Request Resubmit
app.patch('/api/admin/resubmit-request/:pending_id', async (req, res) => {
  const { pending_id } = req.params;
  const { reviewed_by, reviewed_by_name, admin_comment } = req.body;

  try {
    const pendingResult = await pool.query(
      'SELECT * FROM pending_schools WHERE pending_id = $1',
      [pending_id]
    );

    if (pendingResult.rows.length === 0) {
      return res.status(404).json({ error: "Pending school not found" });
    }
    const school = pendingResult.rows[0];

    // Update status to needs_revision and add comment
    await pool.query(`
      UPDATE pending_schools
      SET status = 'needs_revision', reviewed_by = $1, reviewed_by_name = $2, 
          reviewed_at = CURRENT_TIMESTAMP, admin_comment = $3
      WHERE pending_id = $4
    `, [reviewed_by, reviewed_by_name, admin_comment, pending_id]);

    if (reviewed_by) {
      await logActivity(
        reviewed_by,
        reviewed_by_name || 'admin',
        'admin',
        'REQUEST_RESUBMIT',
        school.school_name,
        `Requested document resubmission for: ${school.school_name} (${school.school_id}). Comment: ${admin_comment}`
      );
    }

    console.log(`… School marked for resubmission: ${school.school_name}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Resubmit Request Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - SDO Re-Upload Document (Base64)
app.post('/api/sdo/resubmit-document/:pending_id', async (req, res) => {
  const { pending_id } = req.params;
  const { school_id, type, base64 } = req.body;

  if (!type || !base64) {
    return res.status(400).json({ error: "Document type and base64 data are required" });
  }

  try {
    // 1. Insert/Update the document
    // We insert a new row so the history is preserved, and the GET route's ORDER BY created_at DESC LIMIT 1 fetches this latest one.
    const query = `
      INSERT INTO school_documents (pending_id, school_id, doc_type, file_data)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [pending_id, school_id || null, type, base64]);

    // 2. Set the status back to 'pending'
    await pool.query(`
      UPDATE pending_schools
      SET status = 'pending', submitted_at = CURRENT_TIMESTAMP, admin_comment = NULL
      WHERE pending_id = $1
    `, [pending_id]);

    console.log(`✅ Document re-uploaded and status reset to pending for Pending ID: ${pending_id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ SDO Resubmit Document Error:", err.message);
    res.status(500).json({ error: "Failed to resubmit document" });
  }
});



// DELETE User
// DELETE User
app.delete('/api/admin/users/:uid', async (req, res) => {
  const { uid } = req.params;
  const { adminUid } = req.query;

  try {
    // 0. Get Target Info (Before Delete)
    const userRes = await pool.query('SELECT email FROM users WHERE uid = $1', [uid]);
    const targetEmail = userRes.rows.length > 0 ? userRes.rows[0].email : uid;

    // 1. Delete from Firebase Auth (Best Effort)
    try {
    // --- LEGACY FIREBASE SYNC REMOVED ---
    // await admin.auth().deleteUser(uid);
    } catch (authErr) {
      console.warn(` ï¸ Firebase Auth delete failed (likely missing credentials), performing DB delete: ${authErr.message}`);
    }

    // 2. Delete from DB (Critical Source of Truth)
    await pool.query('DELETE FROM users WHERE uid = $1', [uid]);

    // --- DUAL WRITE: DELETE USER ---
    if (poolNew) {
      poolNew.query('DELETE FROM users WHERE uid = $1', [uid])
        .catch(e => console.error("Dual-Write Delete User Err:", e.message));
    }

    // 3. Log Activity
    if (adminUid) {
      const adminName = await getUserFullName(adminUid) || 'admin';
      await logActivity(adminUid, adminName, 'admin', 'DELETE_USER', targetEmail, `User ${targetEmail} was permanently deleted`);
    }

    console.log(`… User ${uid} deleted permanently.`);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ error: err.message });
  }
});



// ==================================================================
//                        OTP & AUTH ROUTES
// ==================================================================

// Initialize OTP Table
// (omitted for brevity)

// --- USER VALIDATION ENDPOINT (STRICT LOGIN CHECK) ---
app.get('/api/auth/validate/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT uid, disabled, role FROM users WHERE uid = $1', [uid]);

    if (result.rows.length === 0) {
      // User not found in SQL DB (Implicitly Deleted)
      return res.json({ valid: false, reason: 'not_found' });
    }

    const user = result.rows[0];
    if (user.disabled) {
      return res.json({ valid: false, reason: 'disabled' });
    }

    // User exists and is active
    if (user.role === 'Super User') console.log(`¦¸ Super User Validated: ${uid}`);
    res.json({ valid: true, role: user.role });

  } catch (err) {
    console.error("Validation Error:", err);
    // Fail safe: If error, allow login but log it? Or block?
    // Safer to block if we can't verify:
    res.status(500).json({ error: "Validation failed" });
  }
});



// --- HELPER: CREATE TRANSPORTER ---
const getTransporter = async () => {
  const nodemailer = await import('nodemailer');

  // Microsoft 365 / Outlook specific config
  // Host: smtp.office365.com, Port: 587, Secure: false (STARTTLS)
  // Gmail: service: 'gmail'

  const config = process.env.EMAIL_HOST ? {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      ciphers: 'SSLv3'
    }
  } : {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };

  return nodemailer.createTransport(config);
};

// --- POST: Send OTP (Real Email via Nodemailer) ---
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  // Generate 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // --- MOCK MODE HANDLING ---
  if (!isDbConnected) {
    console.log(` ï¸  [OFFLINE] Mock OTP for ${email}: ${otp}`);
    return res.json({
      success: true,
      message: `OFFLINE MODE: Code is ${otp} (Check Console)`
    });
  }

  try {
    // 1. SAVE TO DATABASE (Upsert)
    // "ON CONFLICT (email)" means if a code already exists for this email, replace it
    await pool.query(`
        INSERT INTO verification_codes (email, code, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
        ON CONFLICT (email) 
        DO UPDATE SET code = $2, expires_at = NOW() + INTERVAL '10 minutes';
    `, [email, otp]);

    // --- DUAL WRITE: SAVE OTP ---
    if (poolNew) {
      poolNew.query(`
        INSERT INTO verification_codes (email, code, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
        ON CONFLICT (email) 
        DO UPDATE SET code = $2, expires_at = NOW() + INTERVAL '10 minutes';
      `, [email, otp]).catch(e => console.error("Dual-Write OTP Error:", e.message));
    }

    console.log(`’¾ OTP saved to DB for ${email}`);

    // 2. SEND EMAIL
    const transporter = await getTransporter();

    const mailOptions = {
      from: `"InsightEd Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'InsightEd Verification Code',
      html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #004A99;">InsightEd Verification</h2>
                    <p>Your verification code is:</p>
                    <h1 style="background: #eef2ff; padding: 10px 20px; display: inline-block; border-radius: 8px; letter-spacing: 5px; color: #004A99;">${otp}</h1>
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">If you did not request this code, please ignore this email.</p>
                </div>
            `
    };

    await transporter.sendMail(mailOptions);
    console.log(`… Email sent to ${email}`);
    res.json({ success: true, message: "Verification code sent to your email!" });

  } catch (error) {
    console.error("âŒ OTP Error:", error);

    // Fallback to console for dev if email fails
    console.log(` ï¸ FALLBACK: OTP for ${email} is ${otp}`);

    // 4. FALLBACK: Return success so the user can verify via terminal code
    // (Even if email failed, we generated a valid OTP and logged it)
    console.log(" ï¸ Returning SUCCESS despite email error (Fallback Mode)");

    return res.json({
      success: true,
      message: "Email failed, but code was generated. CHECK TERMINAL/CONSOLE."
    });
  }
});

// --- POST: Verify OTP ---
app.post('/api/verify-otp', async (req, res) => {
  const { email, code } = req.body;

  // --- MOCK MODE HANDLING ---
  if (!isDbConnected) {
    if (code && code.length === 6) {
      console.log(` ï¸  [OFFLINE] Verifying Mock OTP: ${code} for ${email} -> SUCCESS`);
      return res.json({ success: true, message: "Offline Login Successful!" });
    }
    return res.status(400).json({ success: false, message: "Invalid Mock Code" });
  }

  try {
    // 1. Check DB for valid code
    const result = await pool.query(`
          SELECT * FROM verification_codes 
          WHERE email = $1 AND code = $2 AND expires_at > NOW()
      `, [email, code]);

    if (result.rows.length > 0) {
      // 2. Success: Delete the code so it can't be reused
      // 2. Success: Delete the code so it can't be reused
      await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);

      // --- DUAL WRITE: DELETE OTP ---
      if (poolNew) {
        poolNew.query('DELETE FROM verification_codes WHERE email = $1', [email])
          .catch(e => console.error("Dual-Write OTP Delete Error:", e.message));
      }

      return res.json({ success: true, message: "Email Verified!" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid or Expired Code." });
    }
  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({ success: false, message: "Server Verification Error" });
  }
});

// --- 2a. GET: Check User by School ID ---
app.get('/api/user-by-school/:schoolId', async (req, res) => {
  const { schoolId } = req.params;

  try {
    // Check if school exists and get user ID
    const schoolRes = await pool.query(
      "SELECT submitted_by FROM school_profiles WHERE school_id = $1",
      [schoolId]
    );

    if (schoolRes.rows.length === 0) {
      return res.status(404).json({ error: "School not found" });
    }

    const uid = schoolRes.rows[0].submitted_by;

    // Get user details from users table
    const userRes = await pool.query(
      "SELECT * FROM users WHERE uid = $1",
      [uid]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRes.rows[0];
    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });

  } catch (error) {
    console.error("Error fetching user by school ID:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// --- 2. GET: Check School by USER ID ---
app.get('/api/school-by-user/:uid', async (req, res) => {
  const { uid } = req.params;

  // 1. GENERIC MODE HANDLE
  if (uid === '000000') {
    return res.json({
      exists: true,
      data: {
        school_id: "000000",
        school_name: "Generic High School (Preview)",
        division: "Preview Division",
        region: "Preview Region",
        total_enrollment: 0,
        forms_completed_count: 0,
        curricular_offering: "K-12"
      }
    });
  }

  try {
    // 2. PRIMARY LOOKUP (By submitted_by)
    const result = await pool.query('SELECT * FROM school_profiles WHERE submitted_by = $1', [uid]);

    if (result.rows.length > 0) {
      return res.json({ exists: true, data: result.rows[0] });
    }

    // --- LEGACY JIT MIGRATION REMOVED ---

    // 4. FALLBACK: Check if school_id is in email (Legacy/Offline)
    res.json({ exists: false });

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

// --- 3a. GET: Get School Profile by ID (For Validation) ---
// --- 3. GET: Fetch All Schools (Lightweight for Offline Caching) ---
app.get('/api/offline/schools', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT school_id, school_name, region, division, latitude, longitude 
      FROM schools 
      WHERE school_id IS NOT NULL
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Offline Schools Error:", err);
    res.status(500).json({ error: "Failed to fetch schools for offline cache" });
  }
});

app.get('/api/school-profile/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query(`
      SELECT *
      FROM schools 
      WHERE school_id = $1
    `, [schoolId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "School not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch School Profile Error:", err);
    res.status(500).json({ error: "Failed to fetch school profile" });
  }
});
// --- 3b-1. GET: Fetch School Data Health Score ---
app.get('/api/schools/:schoolId/health-score', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        (CASE WHEN sp.school_id IS NOT NULL THEN true ELSE false END) as profile_status,
        (CASE WHEN sp.head_last_name IS NOT NULL AND sp.head_last_name != '' THEN true ELSE false END) as head_status,
        (CASE WHEN sp.total_enrollment > 0 THEN true ELSE false END) as enrollment_status,
        (CASE WHEN sp.classes_kinder > 0 THEN true ELSE false END) as classes_status,
        (CASE WHEN sp.shift_kinder IS NOT NULL THEN true ELSE false END) as shifting_status,
        (CASE WHEN sp.teach_kinder > 0 THEN true ELSE false END) as personnel_status,
        (CASE WHEN sp.spec_math_major > 0 OR sp.spec_guidance > 0 THEN true ELSE false END) as specialization_status,
        (CASE WHEN sp.res_water_source IS NOT NULL OR sp.res_toilets_male > 0 THEN true ELSE false END) as resources_status,
        (CASE WHEN sp.stat_ip IS NOT NULL OR sp.stat_displaced IS NOT NULL THEN true ELSE false END) as learner_stats_status,
        (CASE WHEN sp.build_classrooms_total IS NOT NULL THEN true ELSE false END) as facilities_status,
        ss.data_health_score,
        ss.data_health_description,
        ss.issues as data_quality_issues
      FROM school_profiles sp
      LEFT JOIN school_summary ss ON sp.school_id = ss.school_id
      WHERE sp.school_id = $1
    `, [schoolId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "School not found" });
    }

    const data = result.rows[0];

    const checklist = [
      { module: 'School Profile', status: data.profile_status },
      { module: 'School Head Information', status: data.head_status },
      { module: 'Enrollment', status: data.enrollment_status },
      { module: 'Organized Classes', status: data.classes_status },
      { module: 'Learner Statistics', status: data.learner_stats_status },
      { module: 'Shifting Modalities', status: data.shifting_status },
      { module: 'Teaching Personnel', status: data.personnel_status },
      { module: 'Teacher Specialization', status: data.specialization_status },
      { module: 'School Resources', status: data.resources_status },
      { module: 'Physical Facilities', status: data.facilities_status }
    ];

    const completedCount = checklist.filter(item => item.status).length;
    const score = Math.round((completedCount / checklist.length) * 100);

    res.json({
      score,
      checklist,
      totalModules: checklist.length,
      completedCount,
      // Include actual data health from school_summary (Python fraud detection)
      dataHealthScore: data.data_health_score,
      dataHealthDescription: data.data_health_description,
      dataQualityIssues: data.data_quality_issues
    });
  } catch (err) {
    console.error("Fetch Health Score Error:", err);
    res.status(500).json({ error: "Failed to calculate health score" });
  }
});

// --- 3b. GET: Fetch All Schools (For admin Dashboard) ---
app.get('/api/schools', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        school_id AS "id", 
        school_name AS "name", 
        district, 
        'Submitted' AS "status" 
      FROM school_profiles 
      ORDER BY school_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Schools Error:", err);
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});

// --- 3c. POST: Check if School is Already Registered ---
app.post('/api/check-existing-school', async (req, res) => {
  const { schoolId } = req.body;
  if (!schoolId) {
    return res.status(400).json({ error: "School ID is required." });
  }
  try {
    const result = await pool.query("SELECT school_id FROM school_profiles WHERE school_id = $1", [schoolId]);
    if (result.rows.length > 0) {
      return res.json({ exists: true, message: "This school is already registered." });
    }
    return res.json({ exists: false });
  } catch (error) {
    console.error("Check Existing Error:", error);
    return res.status(500).json({ error: "Database error checking school: " + error.message });
  }
});

// --- 3d. POST: Register School Head (Finalize Registration) ---
// --- 3d. POST: Register School (One-Shot with Geofencing verification) ---
// api/index.js

// --- 3d. POST: Register School (One-Shot with Geofencing verification) ---
app.post('/api/register-school', async (req, res) => {
  const result = RegisterSchoolSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Validation Failed", details: result.error.format() });
  }
  const { email, password, schoolData, contactNumber, role, passcode } = result.data;
  const normalizedEmail = (email || '').toLowerCase();

  // Fallback to School Head if role not provided for backward compatibility
  const userRole = role || 'School Head';

  // DEBUG LOG
  console.log("… REGISTRATION DATA:", {
    school: schoolData.school_name,
    role: userRole
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. DUPLICATE CHECK
    const checkRes = await client.query("SELECT school_id FROM school_profiles WHERE school_id = $1", [schoolData.school_id]);
    if (checkRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "This school is already registered." });
    }

    const emailCheckRes = await client.query("SELECT uid FROM users WHERE LOWER(email) = $1", [email]);
    if (emailCheckRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "This email is already registered." });
    }

    // NATIVE AUTH: Generate UUID and Hash Password
    const uid = uuidv4();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. GENERATE IERN (Sequential: YYYY-XXXXX)
    const year = new Date().getFullYear();
    const iernResult = await client.query(
      "SELECT iern FROM school_profiles WHERE iern LIKE $1 ORDER BY iern DESC LIMIT 1",
      [`${year}-%`]
    );

    let nextSeq = 1;
    if (iernResult.rows.length > 0) {
      const lastIern = iernResult.rows[0].iern;
      const parts = lastIern.split('-');
      if (parts.length === 2 && !isNaN(parts[1])) {
        const lastSeq = parseInt(parts[1], 10);
        nextSeq = lastSeq + 1;
      }
    }
    const newIern = `${year}-${String(nextSeq).padStart(5, '0')}`;

    // 3. CREATE USER (Optional)
    try {
      await client.query('SAVEPOINT user_creation');
      // Populate users table with School Head details and location from schoolData
      // schoolData keys: region, division, province, municipality (city), school_id, school_name
      await client.query(
        `INSERT INTO users (
            uid, email, role, created_at, contact_number,
            first_name, last_name, 
            region, division, province, city,
            password_hash, hash_version, passcode
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (uid) DO UPDATE SET 
             role = EXCLUDED.role,
             contact_number = EXCLUDED.contact_number,
             region = EXCLUDED.region,
             division = EXCLUDED.division,
             province = EXCLUDED.province,
             city = EXCLUDED.city,
             password_hash = EXCLUDED.password_hash,
             hash_version = EXCLUDED.hash_version,
             passcode = EXCLUDED.passcode;`,
        [
          uid,
          normalizedEmail,
          userRole,
          valueOrNull(contactNumber),
          userRole, // first_name (now using role name instead of hardcoded 'School Head')
          schoolData.school_id, // last_name (using ID as per convention or could use Name)
          valueOrNull(schoolData.region),
          valueOrNull(schoolData.division),
          valueOrNull(schoolData.province),
          valueOrNull(schoolData.municipality), // stored as 'city' in users table
          passwordHash,
          'bcrypt',
          passcode
        ]
      );
      await client.query('RELEASE SAVEPOINT user_creation');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT user_creation');
      console.warn("User table insert failed, continuing...", e.message);
    }

    // 4. HYDRATE SCHOOL PROFILE
    const insertQuery = `
        INSERT INTO school_profiles (
            school_id, school_name, region, province, division, district, 
            municipality, leg_district, barangay, mother_school_id, 
            latitude, longitude, 
            submitted_by, iern, email, curricular_offering, submitted_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP
        )
    `;

    const values = [
      schoolData.school_id,
      schoolData.school_name,
      schoolData.region,
      schoolData.province,
      schoolData.division,
      schoolData.district,
      schoolData.municipality,
      schoolData.legislative_district || schoolData.legislative,
      schoolData.barangay,
      schoolData.mother_school_id || 'NA',
      schoolData.latitude,
      schoolData.longitude,
      uid,
      newIern,
      email,
      normalizeOffering(schoolData.curricular_offering)
    ];

    await client.query(insertQuery, values);
    await client.query('COMMIT');

    // --- AUTO-FILL TEACHERS (Helper) ---
    // Trigger auto-fill of teachers from master list
    await autoFillSchoolTeachers(schoolData.school_id);

    // --- DUAL WRITE: REGISTER SCHOOL ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing School Registration...");
        const clientNew = await poolNew.connect();
        try {
          await clientNew.query('BEGIN');

          // 4a. Create User on Secondary
          await clientNew.query(
            "INSERT INTO users (uid, email, role, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (uid) DO NOTHING",
            [uid, email, 'School Head']
          );

          // 4b. Insert School Profile on Secondary
          // Check for existing first to avoid unique violation if backup is slightly synced
          const checkDup = await clientNew.query("SELECT school_id FROM school_profiles WHERE school_id = $1", [schoolData.school_id]);
          if (checkDup.rows.length === 0) {
            await clientNew.query(insertQuery, values);
          } else {
            console.log(" ï¸ Secondary DB already has this school (Duplicate Check Hit).");
          }

          await clientNew.query('COMMIT');
          console.log("… Dual-Write: School Registered on Secondary!");
        } catch (dwErr) {
          await clientNew.query('ROLLBACK');
          console.error("âŒ Dual-Write Error (Register School):", dwErr.message);
        } finally {
          clientNew.release();
        }
      } catch (connErr) {
        console.error("âŒ Dual-Write Connection Error:", connErr.message);
      }
    }

    console.log(`[SUCCESS] Registered School: ${schoolData.school_name} (${newIern})`);

    // SNAPSHOT UPDATE (Initialize Progress)
    try {
      await calculateSchoolProgress(schoolData.school_id, pool);
      if (poolNew) await calculateSchoolProgress(schoolData.school_id, poolNew);
    } catch (calcErr) {
      console.error("Warning: Failed to calculate initial progress:", calcErr.message);
      // Non-fatal, registration still succeeded
    }

    // NATIVE AUTH: Generate Firebase Custom Token
    let customToken = null;
    if (admin.apps.length > 0) {
      try {
        customToken = await admin.auth().createCustomToken(uid, {
          role: userRole
        });
      } catch (tokenErr) {
        console.warn("⚠️ Failed to generate Firebase Custom Token in register-school:", tokenErr.message);
      }
    } else {
      console.warn("⚠️ Firebase admin not initialized - skipping Custom Token generation in register-school");
    }

    res.json({ success: true, iern: newIern, customToken: customToken, message: "School Registered Successfully" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Register School Error:", err);
    res.status(500).json({ error: "Registration failed: " + err.message });
  } finally {
    client.release();
  }
});

// --- 3e. POST: Register School Head (One-Shot matching schools_IERN) ---
app.post('/api/register-beta', async (req, res) => {
  const result = RegisterBetaSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Validation Failed", details: result.error.format() });
  }
  const { email, password, schoolData, contactNumber, firstName, lastName, passcode } = result.data;

  console.log("✅ SCHOOL HEAD REGISTRATION REQUEST RECEIVED:", {
    schoolId: schoolData?.school_id,
    role: 'School Head',
    payload: req.body
  });

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Verify against schools_IERN
    const iernResult = await client.query('SELECT * FROM "schools_IERN" WHERE "SchoolID" = $1', [schoolData.school_id]);
    if (iernResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Not an authorized Beta Testing School. Please check your school ID." });
    }
    const iernData = iernResult.rows[0];
    console.log("✅ Found IERN for school:", iernData.iern);
    const foundIern = iernData.iern;

    // 1b. Duplicate School ID Check (School Heads use school_id as identifier)
    const schoolIdCheckRes = await client.query("SELECT uid FROM users WHERE school_id = $1", [schoolData.school_id]);
    if (schoolIdCheckRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "This school ID is already registered." });
    }

    // NATIVE AUTH: Generate UUID and Hash Password
    const uid = uuidv4();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. CREATE USER
    try {
      await client.query('SAVEPOINT user_creation');
      await client.query(
        `INSERT INTO users (
            uid, email, role, created_at, contact_number,
            first_name, last_name, 
            region, division, province, city,
            password_hash, hash_version, iern, school_id, registrant_type, passcode
         ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (uid) DO UPDATE SET 
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            contact_number = EXCLUDED.contact_number,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            region = EXCLUDED.region,
            division = EXCLUDED.division,
            province = EXCLUDED.province,
            city = EXCLUDED.city,
            password_hash = EXCLUDED.password_hash,
            hash_version = EXCLUDED.hash_version,
            iern = EXCLUDED.iern,
            school_id = EXCLUDED.school_id,
            registrant_type = EXCLUDED.registrant_type,
            passcode = EXCLUDED.passcode;`,
        [
          uid,
          email || null, // School Heads now provide their DepEd email
          'School Head',
          contactNumber || null,
          firstName || 'School',
          lastName || 'Head',
          schoolData.region || null,
          schoolData.division || null,
          schoolData.province || null,
          schoolData.municipality || null,
          passwordHash,
          'bcrypt',
          foundIern,
          schoolData.school_id,
          'School Head',
          passcode || null
        ]
      );
      await client.query('RELEASE SAVEPOINT user_creation');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT user_creation');
      console.warn("User table insert failed, continuing...", e.message);
    }

    // 3. HYDRATE PH_SCHOOLS ONLY (Skip school_profiles)
    const insertQuery = `
      INSERT INTO ph_schools (
        school_id, school_name, region, province, municipality, division, district, leg_district, curricular_offering, latitude, longitude, barangay, iern, updated_at, unit1, unit1_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, 0, FALSE)
      ON CONFLICT (school_id) DO UPDATE SET
        school_name = EXCLUDED.school_name,
        region = EXCLUDED.region,
        province = EXCLUDED.province,
        municipality = EXCLUDED.municipality,
        division = EXCLUDED.division,
        district = EXCLUDED.district,
        leg_district = EXCLUDED.leg_district,
        curricular_offering = EXCLUDED.curricular_offering,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        barangay = EXCLUDED.barangay,
        iern = EXCLUDED.iern,
        unit1 = 0,
        unit1_completed = FALSE,
        updated_at = CURRENT_TIMESTAMP
    `;
    const valuesList = [
      schoolData.school_id,
      schoolData.school_name,
      schoolData.region || null,
      schoolData.province || iernData.Province || null,
      schoolData.municipality || iernData.Municipality || null,
      schoolData.division || null,
      schoolData.district || iernData.District || null,
      schoolData.legislative_district || schoolData.legislative || iernData.LegLegDistrict || iernData.LegDistrict || null,
      null, // Curricular offering defaulted to blank on registration
      schoolData.latitude || iernData.Latitude || null,
      schoolData.longitude || iernData.Longitude || null,
      schoolData.barangay || iernData.Barangay || null,
      foundIern
    ];

    await client.query(insertQuery, valuesList);
    await client.query('COMMIT');

    // 4. Generate JWT for the new user (identify by school_id)
    const token = jwt.sign(
      { uid, school_id: schoolData.school_id, role: 'School Head' },
      process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token: token,
      user: {
        uid: uid,
        email: null,
        role: 'School Head',
        region: schoolData.region || null,
        division: schoolData.division || null,
        school_id: schoolData.school_id,
        first_name: firstName || 'School',
        last_name: lastName || 'Head',
        iern: foundIern,
        passcode: passcode
      },
      message: "School Head Registered Successfully"
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("Register Beta Error:", err);
    res.status(500).json({ error: "Registration failed: " + err.message });
  } finally {
    if (client) client.release();
  }
});

// --- 3f. POST: Register Generic User (Engineer, RO, SDO) ---
app.post('/api/register-user', async (req, res) => {
  const result = RegisterUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Validation Failed", details: result.error.format() });
  }
  const { email, password, role, firstName, lastName, region, division, province, city, barangay, office, position, contactNumber, altEmail, accountCategory, passcode } = result.data;
  const normalizedEmail = (email || '').toLowerCase();

  console.log(`🚀 Registration request received for: ${email} (Role: ${role})`);

  try {
    // 1. Duplicate Email Check
    console.log(`[Reg] Checking duplicate email: ${email}`);
    const emailCheckRes = await pool.query("SELECT uid FROM users WHERE LOWER(email) = $1", [email]);
    if (emailCheckRes.rows.length > 0) {
      console.warn(`[Reg] Email already registered: ${email}`);
      return res.status(400).json({ error: "This email is already registered." });
    }

    // NATIVE AUTH: Generate UUID and Hash Password
    const uid = uuidv4();
    console.log(`[Reg] Generated UID: ${uid}`);
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log(`[Reg] Password hashed successfully.`);

    // Auto-determine account_category (account_type) based on role if not explicitly provided
    let finalRole = role;
    if (finalRole === 'HRODI' || finalRole === 'HRODI Engineer') {
      finalRole = 'EFD Engineer';
    }
    if (finalRole === 'EFD') {
      finalRole = 'EFD Engineer';
    }

    let finalAccountCategory = accountCategory;
    if (finalRole === 'EFD Engineer') {
      finalAccountCategory = 'EFD Engineer';
    } else if ((finalRole === 'Division Engineer' || finalRole === 'DepEd Engineer') && !accountCategory) {
      finalAccountCategory = 'DepEd Engineer'; // Backwards compatibility for the category column
    } else if (!finalAccountCategory) {
      finalAccountCategory = finalRole;
    }

    console.log(`[Reg] Final role: ${finalRole}, Category: ${finalAccountCategory}`);

    const query = `
            INSERT INTO users (
                uid, email, role, created_at,
                first_name, last_name,
                region, division, province, city, barangay,
                office, position, contact_number, alt_email,
                account_category, password_hash, hash_version, passcode
            ) VALUES (
                $1, $2, $3, CURRENT_TIMESTAMP,
                $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
            ON CONFLICT (uid) DO UPDATE SET
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                region = EXCLUDED.region,
                division = EXCLUDED.division,
                province = EXCLUDED.province,
                city = EXCLUDED.city,
                barangay = EXCLUDED.barangay,
                office = EXCLUDED.office,
                position = EXCLUDED.position,
                contact_number = EXCLUDED.contact_number,
                alt_email = EXCLUDED.alt_email,
                account_category = EXCLUDED.account_category,
                password_hash = EXCLUDED.password_hash,
                hash_version = EXCLUDED.hash_version,
                passcode = EXCLUDED.passcode;
        `;

    const values = [
      uid, normalizedEmail, finalRole,
      valueOrNull(firstName), valueOrNull(lastName),
      valueOrNull(region), valueOrNull(division),
      valueOrNull(province), valueOrNull(city), valueOrNull(barangay),
      valueOrNull(office), valueOrNull(position),
      valueOrNull(contactNumber), valueOrNull(altEmail),
      finalAccountCategory, passwordHash, 'bcrypt', passcode || null
    ];

    console.log(`[Reg] Executing primary DB insert...`);
    await pool.query(query, values);
    console.log(`✅ [Reg] Primary DB sync successful for: ${normalizedEmail}`);

    // --- DUAL WRITE: REGISTER GENERIC USER ---
    if (poolNew) {
      try {
        console.log("[Reg] Dual-Write: Syncing to Secondary DB...");
        await poolNew.query(query, values);
        console.log("✅ [Reg] Secondary DB sync successful!");
      } catch (dwErr) {
        console.error("❌ Dual-Write Error (Register User):", dwErr.message);
      }
    }

    try {
      console.log(`[Reg] Logging activity for ${uid}...`);
      await logActivity(uid, `${firstName} ${lastName}`, role, 'REGISTER', 'User Profile', `Registered as ${role}`);
      console.log(`✅ [Reg] Activity logged.`);
    } catch (logErr) {
      console.warn('⚠️ logActivity failed (non-fatal):', logErr.message);
    }

    // 4. Generate JWT
    console.log(`[Reg] Signing JWT...`);
    const token = jwt.sign(
      { uid, email: normalizedEmail, role: finalRole },
      process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD',
      { expiresIn: '30d' }
    );
    console.log(`✅ [Reg] JWT signed. Sending response.`);

    res.json({
      success: true,
      token: token,
      user: {
        uid: uid,
        email: normalizedEmail,
        role: finalRole,
        region: region,
        division: division,
        account_category: finalAccountCategory,
        first_name: firstName,
        last_name: lastName,
        passcode: passcode,
        office: office
      },
      message: "User registered and logged in successfully"
    });

  } catch (err) {
    console.error("❌ [Reg] CRITICAL FAILURE:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to sync user to Database: " + err.message 
    });
  }
});

// --- 3e. POST: Verify Passcode (PROTECTED) ---
app.post('/api/auth/verify-passcode', authMiddleware, async (req, res) => {
  const { uid } = req.user;
  const { passcode } = req.body;

  if (!passcode) {
    return res.status(400).json({ error: "Missing passcode." });
  }

  try {
    const result = await pool.query("SELECT passcode FROM users WHERE uid = $1", [uid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const storedPasscode = result.rows[0].passcode;
    // Plain text comparison as requested
    if (storedPasscode === passcode) {
      return res.json({ success: true, message: "Passcode verified." });
    } else {
      return res.status(401).json({ error: "Incorrect passcode." });
    }
  } catch (err) {
    console.error("Verify Passcode Error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// --- 3f. POST: Setup Passcode (PROTECTED) ---
app.post('/api/auth/setup-passcode', authMiddleware, async (req, res) => {
  const { uid } = req.user;
  const { passcode } = req.body;

  if (!passcode || passcode.length !== 6 || !/^\d+$/.test(passcode)) {
    return res.status(400).json({ error: "Invalid passcode format. Must be 6 digits." });
  }

  try {
    await pool.query("UPDATE users SET passcode = $1 WHERE uid = $2", [passcode, uid]);

    // Log activity
    try {
      const userRes = await pool.query("SELECT first_name, last_name, role FROM users WHERE uid = $1", [uid]);
      if (userRes.rows.length > 0) {
        const { first_name, last_name, role } = userRes.rows[0];
        await logActivity(uid, `${first_name} ${last_name}`, role, 'UPDATE', 'Security', 'Set up registration passcode');
      }
    } catch (logErr) {
      console.warn('⚠️ logActivity failed (non-fatal):', logErr.message);
    }

    return res.json({ success: true, message: "Passcode set up successfully." });
  } catch (err) {
    console.error("Setup Passcode Error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// --- UPDATE USER PROFILE (PROTECTED) ---
app.put('/api/users/update', authMiddleware, async (req, res) => {
  const { uid } = req.user;
  const { firstName, lastName, region, province, city, barangay } = req.body;

  try {
    await pool.query(
      `UPDATE users SET 
                first_name = $1, last_name = $2, 
                region = $3, province = $4, city = $5, barangay = $6 
             WHERE uid = $7`,
      [firstName, lastName, region, province, city, barangay, uid]
    );
    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// --- CHANGE PASSWORD (PROTECTED) ---
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { uid } = req.user;
  const { currentPassword, newPassword } = req.body;

  try {
    // 1. Fetch current hash
    const userRes = await pool.query('SELECT password_hash FROM users WHERE uid = $1', [uid]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: "User not found" });

    const { password_hash } = userRes.rows[0];

    // 2. Verify current password
    const isValid = await bcrypt.compare(currentPassword, password_hash);
    if (!isValid) return res.status(401).json({ error: "Incorrect current password" });

    // 3. Hash and update new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, hash_version = \'bcrypt\' WHERE uid = $2', [newHash, uid]);

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- SUBMIT FEEDBACK (PROTECTED) ---
app.post('/api/feedback', authMiddleware, async (req, res) => {
  const { uid } = req.user;
  const { userName, role, ratings, comment, appVersion } = req.body;

  try {
    await pool.query(
      `INSERT INTO app_feedback (user_id, user_name, role, ease_of_use, aesthetics, functionality, comment, app_version)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uid, userName, role, ratings.easeOfUse, ratings.aesthetics, ratings.functionality, comment, appVersion]
    );
    res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (err) {
    console.error("Feedback Submission Error:", err);
    res.status(500).json({ success: false, error: "Failed to submit feedback" });
  }
});

// --- 3f. GET: Fetch User Profile by UID ---
app.get('/api/users/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const query = `
      SELECT 
        uid, email, role, first_name as "firstName", last_name as "lastName", 
        region, division, province, city, barangay, 
        office, position, contact_number as "contactNumber", alt_email as "altEmail",
        account_category, created_at
      FROM users 
      WHERE uid = $1
    `;
    const result = await pool.query(query, [uid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch User Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- 3g. GET: Lookup Email by School ID (Smart Login) ---
app.get('/api/auth/lookup-email/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // 0. Try Resolve School ID to IERN via schools_IERN
    const iernLookup = await pool.query('SELECT iern FROM "schools_IERN" WHERE "SchoolID" = $1 LIMIT 1', [schoolId]);
    const resolvedIern = iernLookup.rows.length > 0 ? iernLookup.rows[0].iern : schoolId;

    // 1. Try USERS table (Modern Auth) - Prioritize IERN match, then email prefix
    let result;
    if (resolvedIern) {
      result = await pool.query(
        "SELECT email FROM users WHERE iern = $1 OR email ILIKE $2 ORDER BY (CASE WHEN iern = $1 THEN 0 ELSE 1 END), (CASE WHEN email ILIKE '%@insighted.app' THEN 0 ELSE 1 END), email LIMIT 1",
        [resolvedIern, `${schoolId}@%`]
      );
    } else {
      result = await pool.query(
        "SELECT email FROM users WHERE email ILIKE $1 ORDER BY (CASE WHEN email ILIKE '%@insighted.app' THEN 0 ELSE 1 END), email LIMIT 1",
        [`${schoolId}@%`]
      );
    }

    if (result.rows.length > 0) {
      return res.json({ found: true, email: result.rows[0].email, iern: resolvedIern });
    }

    // 2. Fallback: Try SCHOOL_PROFILES table (Legacy)
    result = await pool.query(
      "SELECT email FROM school_profiles WHERE school_id = $1 AND email IS NOT NULL LIMIT 1",
      [schoolId]
    );

    // 3. Check Firebase Auth for @insighted.app specific account
    // This handles cases where the user is registered in Firebase but not yet synced to the USERS table
    try {
      const fbUser = await admin.auth().getUserByEmail(`${schoolId}@insighted.app`);
      return res.json({ found: true, email: fbUser.email });
    } catch (fbErr) {
      // Ignore user-not-found, proceed with DB result if any
    }

    if (result.rows.length > 0) {
      return res.json({ found: true, email: result.rows[0].email });
    }

    return res.json({ found: false });

  } catch (error) {
    console.error("Lookup Email Error:", error);
    res.status(500).json({ error: "Database error during lookup." });
  }
});






// --- 3g. Consolidated Auth: Lookup Registered Email & Forgot Password ---
app.get('/api/lookup-email/:identifier', async (req, res) => {
  const { identifier } = req.params;
  try {
    const isSchoolId = /^\d{6,}$/.test(identifier);
    const query = isSchoolId 
      ? "SELECT email FROM users WHERE school_id = $1 LIMIT 1"
      : "SELECT email FROM users WHERE LOWER(email) = $1 LIMIT 1";

    const result = await pool.query(query, [isSchoolId ? identifier : identifier.toLowerCase()]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ found: false, error: "No user found with this identifier." });
    }

    const email = result.rows[0].email;
    if (!email) {
      return res.status(404).json({ found: false, error: "No email address registered for this account." });
    }

    const [username, domain] = email.split('@');
    const maskedEmail = username[0] + '*'.repeat(username.length - 1) + '@' + domain;
    res.json({ found: true, email: email, maskedEmail });
  } catch (err) {
    console.error("Lookup Email Error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  const { schoolId, email: providedEmail, identifier } = req.body;
  const input = (identifier || schoolId || providedEmail || '').trim();
  
  if (!input) return res.status(400).json({ error: "Identifier (Email or School ID) required." });

  try {
    const isSchoolId = /^\d{6,}$/.test(input);
    const query = isSchoolId 
      ? "SELECT email FROM users WHERE school_id = $1 LIMIT 1"
      : "SELECT email FROM users WHERE LOWER(email) = $1 LIMIT 1";

    const result = await pool.query(query, [isSchoolId ? input : input.toLowerCase()]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "No user found with this identifier." });

    const email = result.rows[0].email;
    if (!email) {
      return res.status(404).json({ error: "No email address registered for this account. Please contact an administrator." });
    }

    console.log(`[STUB] Password reset sent to ${email} for identifier ${input}`);
    res.json({ success: true, message: `Reset link sent to registered email: ${email[0]}***@${email.split('@')[1]}` });
  } catch (err) {
    console.error("Forgot Password Error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- 5. GET: Cascading Location Endpoints ---
app.get('/api/locations/regions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT MAX("Region") as region 
      FROM "schools_IERN" 
      WHERE "Region" IS NOT NULL AND "Region" != '' 
      GROUP BY UPPER(TRIM("Region"))
      ORDER BY region ASC
    `);
    res.json(result.rows.map(r => r.region));
  } catch (err) {
    console.error("GET Regions Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/locations/divisions', async (req, res) => {
  const { region } = req.query;
  try {
    const result = await pool.query(`
      SELECT MAX("Division") as division 
      FROM "schools_IERN" 
      WHERE UPPER(TRIM("Region")) = UPPER(TRIM($1)) 
      AND "Division" IS NOT NULL AND "Division" != '' 
      GROUP BY UPPER(TRIM("Division"))
      ORDER BY division ASC
    `, [region]);
    res.json(result.rows.map(r => r.division));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/locations/districts', async (req, res) => {
  const { region, division } = req.query;
  try {
    const result = await pool.query(`
      SELECT MAX("District") as district 
      FROM "schools_IERN" 
      WHERE UPPER(TRIM("Region")) = UPPER(TRIM($1)) 
      AND UPPER(TRIM("Division")) = UPPER(TRIM($2)) 
      AND "District" IS NOT NULL AND "District" != '' 
      GROUP BY UPPER(TRIM("District"))
      ORDER BY district ASC
    `, [region, division]);
    res.json(result.rows.map(r => r.district));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/locations/leg-districts', async (req, res) => {
  const { region } = req.query;
  try {
    const result = await pool.query(`
      SELECT MAX("Legislative_District") as leg_district 
      FROM "schools_IERN" 
      WHERE UPPER(TRIM("Region")) = UPPER(TRIM($1)) 
      AND "Legislative_District" IS NOT NULL AND "Legislative_District" != '' 
      GROUP BY UPPER(TRIM("Legislative_District"))
      ORDER BY leg_district ASC
    `, [region]);
    res.json(result.rows.map(r => r.leg_district));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/locations/municipalities', async (req, res) => {
  const { region, division, district } = req.query;
  try {
    const result = await pool.query(`
      SELECT MAX("Municipality") as municipality 
      FROM "schools_IERN" 
      WHERE UPPER(TRIM("Region")) = UPPER(TRIM($1)) 
      AND UPPER(TRIM("Division")) = UPPER(TRIM($2)) 
      AND UPPER(TRIM("District")) = UPPER(TRIM($3)) 
      AND "Municipality" IS NOT NULL AND "Municipality" != '' 
      GROUP BY UPPER(TRIM("Municipality"))
      ORDER BY municipality ASC
    `, [region, division, district]);
    res.json(result.rows.map(r => r.municipality));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Province lookup (for LGU Super User Selector) ---
app.get('/api/locations/provinces', async (req, res) => {
  const { region } = req.query;
  try {
    const result = await pool.query(
      'SELECT DISTINCT "Province" as province FROM "schools_IERN" WHERE UPPER(TRIM("Region")) = UPPER(TRIM($1)) AND "Province" IS NOT NULL AND "Province" != \'\' ORDER BY "Province" ASC',
      [region]
    );
    res.json(result.rows.map(r => r.province));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Municipality by Province lookup (for LGU Super User Selector) ---
app.get('/api/locations/municipalities-by-province', async (req, res) => {
  const { region, province } = req.query;
  try {
    const result = await pool.query(
      'SELECT DISTINCT "Municipality" as municipality FROM "schools_IERN" WHERE UPPER(TRIM("Region")) = UPPER(TRIM($1)) AND UPPER(TRIM("Province")) = UPPER(TRIM($2)) AND "Municipality" IS NOT NULL AND "Municipality" != \'\' ORDER BY "Municipality" ASC',
      [region, province]
    );
    res.json(result.rows.map(r => r.municipality));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/locations/schools', async (req, res) => {
  const { region, division, district, municipality } = req.query;
  try {
    const result = await pool.query(
      'SELECT "SchoolID" as school_id, "School_Name" as school_name, "Region" as region, "Division" as division, "District" as district, "Province" as province, "Municipality" as municipality, "Legislative_District" as legislative_district, "Curricular_Offering" as curricular_offering, "Latitude" as latitude, "Longitude" as longitude FROM "schools_IERN" WHERE UPPER(TRIM("Region")) = UPPER(TRIM($1)) AND UPPER(TRIM("Division")) = UPPER(TRIM($2)) AND UPPER(TRIM("District")) = UPPER(TRIM($3)) AND UPPER(TRIM("Municipality")) = UPPER(TRIM($4)) ORDER BY "School_Name" ASC',
      [region, division, district, municipality]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 4. POST: Save School Profile (With Detailed Audit Log) ---
app.post('/api/save-school', async (req, res) => {
  const data = req.body;
  console.log("Saving School Profile. Payload received:", JSON.stringify(data, null, 2)); // DEBUG LOG
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. FETCH EXISTING DATA FIRST
    const checkQuery = 'SELECT * FROM school_profiles WHERE school_id = $1';
    const existingRes = await client.query(checkQuery, [data.schoolId]);
    const oldData = existingRes.rows[0];

    // 2. DETECT CHANGES
    let changes = [];
    let actionType = "Profile Created"; // Default for new rows
    let existingIern = oldData ? oldData.iern : null;

    if (oldData) {
      actionType = "Profile Updated";

      // List of fields to monitor for changes
      // (Map frontend keys to database columns)
      const fieldMap = {
        schoolName: 'school_name',
        region: 'region',
        province: 'province',
        division: 'division',
        district: 'district',
        municipality: 'municipality',
        legDistrict: 'legislative_district',
        barangay: 'barangay',
        motherSchoolId: 'mother_school_id',
        latitude: 'latitude',
        longitude: 'longitude',
        curricularOffering: 'curricular_offering'
      };

      for (const [frontKey, dbCol] of Object.entries(fieldMap)) {
        const newValue = data[frontKey];
        const oldValue = oldData[dbCol];

        // Compare values (ignoring loose type differences like null vs undefined)
        // We trim strings to avoid false positives on whitespace
        const cleanNew = String(newValue || '').trim();
        const cleanOld = String(oldValue || '').trim();

        if (cleanNew !== cleanOld) {
          changes.push({
            field: dbCol,
            old_value: cleanOld || "N/A",
            new_value: cleanNew || "N/A"
          });
        }
      }
    }

    // 3. CREATE DETAILED LOG ENTRY
    const newLogEntry = {
      timestamp: new Date().toISOString(),
      user: data.submittedBy,
      action: actionType,
      changes: changes // <--- Now includes the specific changes!
    };

    // 4. GENERATE IERN IF MISSING
    let finalIern = existingIern;
    if (!finalIern) {
      const year = new Date().getFullYear();
      const iernResult = await client.query(
        "SELECT iern FROM school_profiles WHERE iern LIKE $1 ORDER BY iern DESC LIMIT 1",
        [`${year}-%`]
      );

      let nextSeq = 1;
      if (iernResult.rows.length > 0) {
        const lastIern = iernResult.rows[0].iern;
        const parts = lastIern.split('-');
        if (parts.length === 2 && !isNaN(parts[1])) {
          const lastSeq = parseInt(parts[1], 10);
          nextSeq = lastSeq + 1;
        }
      }
      finalIern = `${year}-${String(nextSeq).padStart(5, '0')}`;
    }

    // 5. PERFORM INSERT OR UPDATE
    const query = `
      INSERT INTO school_profiles (
        school_id, school_name, region, province, division, district, 
        municipality, leg_district, barangay, mother_school_id, 
        latitude, longitude, submitted_by, submitted_at, 
        curricular_offering,
        history_logs,
        iern
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, 
        $14,
        jsonb_build_array($15::jsonb),
        $16
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
        curricular_offering = EXCLUDED.curricular_offering,
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = CURRENT_TIMESTAMP,
        history_logs = school_profiles.history_logs || $15::jsonb,
        iern = COALESCE(school_profiles.iern, EXCLUDED.iern);
    `;

    const values = [
      data.schoolId, data.schoolName, data.region, data.province,
      data.division, data.district, data.municipality, data.legDistrict,
      data.barangay, data.motherSchoolId, data.latitude, data.longitude,
      data.submittedBy,
      normalizeOffering(data.curricularOffering), // $14
      JSON.stringify(newLogEntry), // $15
      finalIern // $16
    ];

    await client.query(query, values);
    await client.query('COMMIT');

    // --- DUAL WRITE: SCHOOL PROFILE ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing School Profile...");
        const clientNew = await poolNew.connect();
        try {
          await clientNew.query('BEGIN');
          // Re-use logic: Insert/Update using the exact same IERN and Values
          // Note: values array includes finalIern at index 16 (derived from primary)
          await clientNew.query(query, values);
          await clientNew.query('COMMIT');
          console.log("… Dual-Write: School Profile Synced!");

          // Calculate Snapshot on Secondary
          await calculateSchoolProgress(data.schoolId, poolNew);
        } catch (dwErr) {
          await clientNew.query('ROLLBACK');
          console.error("âŒ Dual-Write Error (Save School):", dwErr.message);
        } finally {
          clientNew.release();
        }
      } catch (connErr) {
        console.error("âŒ Dual-Write Connection Error (Save School):", connErr.message);
      }
    }

    // --- CENTRALIZED AUDIT LOGGING ---
    // Log to activity_logs table for admin Dashboard visibility
    try {
      await logActivity(
        data.submittedBy,
        'School Head',
        'School Head',
        actionType === 'Profile Created' ? 'CREATE' : 'UPDATE',
        `School Profile: ${data.schoolId}`,
        `Submitted profile for ${data.schoolName}`
      );
    } catch (logErr) {
      console.error("Failed to log activity centrally:", logErr);
    }

    res.status(200).json({ message: "Profile saved successfully!", changes: changes, iern: finalIern });

    // SNAPSHOT UPDATE (Primary)
    await calculateSchoolProgress(data.schoolId, pool);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Save Error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    client.release();
  }
});

// --- 4b. GET: Fetch Full School Profile ---
app.get('/api/school-profile/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const query = `
      SELECT 
        p.* 
      FROM school_profiles p 
      WHERE p.submitted_by = $1
    `;
    const result = await pool.query(query, [uid]);
    if (result.rows.length === 0) return res.json({ exists: false });
    // Return standard format expected by frontend
    res.json({
      exists: true,
      data: result.rows[0],
      school_id: result.rows[0].school_id,
      curricular_offering: result.rows[0].curricular_offering
    });
  } catch (err) {
    console.error("Fetch School Profile Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- 5. POST: Save School Head Info (Updated to match Enrolment logic) ---
app.post('/api/save-school-head', async (req, res) => {
  const data = req.body;

  // Create a log entry similar to your enrolment logic
  const newLogEntry = {
    timestamp: new Date().toISOString(),
    user: data.uid,
    action: "School Head Info Update"
  };

  try {
    const query = `
      UPDATE school_profiles SET 
        head_last_name = $2,
        head_first_name = $3,
        head_middle_name = $4,
        head_item_number = $5,
        head_position_title = $6,
        head_date_hired = $7,
        updated_at = CURRENT_TIMESTAMP,
        history_logs = history_logs || $8::jsonb
      WHERE submitted_by = $1;
    `;

    const values = [
      data.uid,
      data.lastName || null,
      data.firstName || null,
      data.middleName || null,
      data.itemNumber || null,
      data.positionTitle || null,
      data.dateHired || null,
      JSON.stringify(newLogEntry)
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "School Profile not found. Please create the School Profile first." });
    }

    // --- CENTRALIZED AUDIT LOG ---
    await logActivity(
      data.uid,
      'School Head', // Ideally pass name from frontend, but role suffices if unknown
      'School Head',
      'UPDATE',
      'School Head Info',
      'Updated personal information'
    );

    res.json({ success: true, message: "School Head information updated successfully!" });

    // --- DUAL WRITE: SCHOOL HEAD ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing School Head...");
        await poolNew.query(query, values);
        console.log("… Dual-Write: School Head Synced!");

        // Snapshot trigger logic repeated for secondary
        try {
          const spRes = await poolNew.query("SELECT school_id FROM school_profiles WHERE submitted_by = $1", [data.uid]);
          if (spRes.rows.length > 0) {
            await calculateSchoolProgress(spRes.rows[0].school_id, poolNew);
          }
        } catch (e) { console.warn("Secondary Snapshot Trigger Failed (School Head)", e); }

      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (School Head):", dwErr.message);
      }
    }

    // SNAPSHOT UPDATE - Need SchoolID first. The endpoint receives UID.
    // We can fetch school_id from result of update or query it.
    // Let's rely on submitted_by to find school_id.
    try {
      const spRes = await pool.query("SELECT school_id FROM school_profiles WHERE submitted_by = $1", [data.uid]);
      if (spRes.rows.length > 0) {
        await calculateSchoolProgress(spRes.rows[0].school_id, pool);
      }
    } catch (e) { console.warn("Snapshot Trigger User Lookup Failed", e); }

  } catch (err) {
    console.error("Save Head Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 6. GET: Get School Head Info ---
app.get('/api/school-head/:uid', async (req, res) => {
  const { uid } = req.params;

  if (uid === '000000') {
    return res.json({
      exists: true,
      data: {
        user_uid: "000000",
        name: "Super User (Preview)",
        position: "Principal I",
        contact_number: "09000000000",
        email: "superuser@deped.gov.ph"
      }
    });
  }

  try {
    const query = `
      SELECT 
        head_last_name as last_name, 
        head_first_name as first_name, 
        head_middle_name as middle_name, 
        head_item_number as item_number, 
        head_position_title as position_title, 
        head_date_hired as date_hired,
        region, 
        division,
        updated_at
      FROM school_profiles 
      WHERE submitted_by = $1;
    `;
    const result = await pool.query(query, [uid]);

    if (result.rows.length > 0 && result.rows[0].last_name) {
      res.json({ exists: true, data: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error("Get Head Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- 6b. GET: Get Enrolment Data ---
app.get('/api/enrolment/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE submitted_by = $1', [uid]);
    if (result.rows.length === 0) return res.json({ exists: false });
    res.json({ exists: true, data: result.rows[0], school_id: result.rows[0].school_id, curricular_offering: result.rows[0].curricular_offering });
  } catch (err) {
    console.error("Get Enrolment Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- SDO: UPDATE SCHOOL PROFILE ---
// Add this to api/index.js after the /api/enrolment/:uid endpoint (around line 2426)

app.post('/api/sdo/update-school-profile', async (req, res) => {
  const { sdoUid, schoolId, profileData } = req.body;

  if (!sdoUid || !schoolId || !profileData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify SDO permissions
    const sdoRes = await client.query(
      'SELECT role, division, region FROM users WHERE uid = $1',
      [sdoUid]
    );

    if (sdoRes.rows.length === 0 || sdoRes.rows[0].role !== 'School Division Office') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied: Must be SDO user' });
    }

    const sdoUser = sdoRes.rows[0];

    // 2. Verify school is in SDO's division
    const schoolRes = await client.query(
      'SELECT division, region, school_name FROM school_profiles WHERE school_id = $1',
      [schoolId]
    );

    if (schoolRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'School not found' });
    }

    const school = schoolRes.rows[0];

    if (school.division !== sdoUser.division) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: `School not in your division. School: ${school.division}, You: ${sdoUser.division}`
      });
    }

    // 3. Update school profile
    await client.query(`
      UPDATE school_profiles 
      SET 
        school_name = $1,
        region = $2,
        province = $3,
        municipality = $4,
        barangay = $5,
        division = $6,
        district = $7,
        legislative_district = $8,
        mother_school_id = $9,
        latitude = $10,
        longitude = $11,
        curricular_offering = $12,
        submitted_at = CURRENT_TIMESTAMP
      WHERE school_id = $13
    `, [
      profileData.school_name || profileData.schoolName,
      profileData.region,
      profileData.province,
      profileData.municipality,
      profileData.barangay,
      profileData.division,
      profileData.district,
      profileData.legislative_district || profileData.legDistrict,
      profileData.mother_school_id || profileData.motherSchoolId,
      profileData.latitude,
      profileData.longitude,
      profileData.curricular_offering || profileData.curricularOffering,
      schoolId
    ]);

    // 4. Log activity
    await client.query(`
      INSERT INTO activity_logs (user_uid, user_name, role, action_type, target_entity, details)
      VALUES ($1, 'SDO User', 'School Division Office', 'SDO_UPDATE_SCHOOL', $2, $3)
    `, [
      sdoUid,
      schoolId,
      `SDO updated profile for ${school.school_name} (${schoolId})`
    ]);

    await client.query('COMMIT');

    console.log(`… SDO (${sdoUid}) updated school: ${schoolId}`);
    res.json({
      success: true,
      message: 'School profile updated successfully',
      schoolId: schoolId
    });

    // SNAPSHOT UPDATE
    await calculateSchoolProgress(schoolId, client);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SDO Update Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});






// --- 5c. POST: Validate School Data (School Head Override) ---
app.post('/api/school/validate-data', async (req, res) => {
  const { schoolId, uid } = req.body;

  if (!schoolId || !uid) {
    return res.status(400).json({ message: 'Missing schoolId or uid.' });
  }

  try {
    const query = `
      UPDATE school_summary
      SET school_head_validation = true
      WHERE school_id = $1
      RETURNING school_id;
    `;

    const result = await pool.query(query, [schoolId]);

    // --- DUAL WRITE: VALIDATION ---
    if (poolNew) {
      try {
        await poolNew.query(query, [schoolId]);
        console.log("… Dual-Write: Validation synced!");
        // Trigger summary update on secondary
        await updateSchoolSummary(schoolId, poolNew);
      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Validation):", dwErr.message);
      }
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "School Profile not found." });
    }

    // Log Activity (Direct Insert)
    try {
      await pool.query(`
        INSERT INTO activity_logs (uid, user_name, role, action_type, target_entity, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [uid, 'School Head', 'School Head', 'VALIDATE', `Data Validation: ${schoolId}`, `School Head affirmed data accuracy despite warnings.`]);
    } catch (logErr) {
      console.error("Failed to log activity:", logErr.message);
      // Constructive failure: Don't fail the validation just because logging failed
    }

    // Trigger Instant Summary Update
    await updateSchoolSummary(schoolId, pool);

    res.json({ success: true, message: "Data validated successfully." });

  } catch (err) {
    console.error("âŒ Data Validation Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- 6. GET: Fetch Enrolment ---


// ==================================================================
//                    ENGINEER FORMS ROUTES
// ==================================================================

// --- 7. POST: Save Enrolment (Fixed with snake_case and null safety) ---
app.post('/api/save-enrolment', async (req, res) => {
  const data = req.body;
  console.log('“¥ RECEIVED ENROLMENT DATA:', JSON.stringify(data, null, 2));

  const newLogEntry = {
    timestamp: new Date().toISOString(),
    user: data.submittedBy,
    action: 'Enrolment Update',
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
        
        -- ARAL Fields
        aral_math_g1=$41, aral_read_g1=$42, aral_sci_g1=$43,
        aral_math_g2=$44, aral_read_g2=$45, aral_sci_g2=$46,
        aral_math_g3=$47, aral_read_g3=$48, aral_sci_g3=$49,
        aral_math_g4=$50, aral_read_g4=$51, aral_sci_g4=$52,
        aral_math_g5=$53, aral_read_g5=$54, aral_sci_g5=$55,
        aral_math_g6=$56, aral_read_g6=$57, aral_sci_g6=$58,
        aral_total=$59,
        sned_learners=$60, non_graded_learners=$61,

        submitted_at = CURRENT_TIMESTAMP,
        history_logs = history_logs || $40::jsonb
      WHERE school_id = $1;
    `;

    const values = [
      data.schoolId, data.curricularOffering,
      data.esTotal || 0, data.jhsTotal || 0, data.shsTotal || 0, data.grandTotal || 0,

      // Elementary (Corrected to use snake_case + null safety)
      data.grade_kinder || 0, data.grade_1 || 0, data.grade_2 || 0, data.grade_3 || 0,
      data.grade_4 || 0, data.grade_5 || 0, data.grade_6 || 0,

      // JHS (Corrected)
      data.grade_7 || 0, data.grade_8 || 0, data.grade_9 || 0, data.grade_10 || 0,

      // SHS (Corrected)
      data.grade_11 || 0, data.grade_12 || 0,
      data.abm_11 || 0, data.abm_12 || 0, data.stem_11 || 0, data.stem_12 || 0,
      data.humss_11 || 0, data.humss_12 || 0, data.gas_11 || 0, data.gas_12 || 0,
      data.tvl_ict_11 || 0, data.tvl_ict_12 || 0, data.tvl_he_11 || 0, data.tvl_he_12 || 0,
      data.tvl_ia_11 || 0, data.tvl_ia_12 || 0, data.tvl_afa_11 || 0, data.tvl_afa_12 || 0,
      data.arts_11 || 0, data.arts_12 || 0, data.sports_11 || 0, data.sports_12 || 0,

      JSON.stringify(newLogEntry),

      // ARAL Values
      data.aral_math_g1 || 0, data.aral_read_g1 || 0, data.aral_sci_g1 || 0,
      data.aral_math_g2 || 0, data.aral_read_g2 || 0, data.aral_sci_g2 || 0,
      data.aral_math_g3 || 0, data.aral_read_g3 || 0, data.aral_sci_g3 || 0,
      data.aral_math_g4 || 0, data.aral_read_g4 || 0, data.aral_sci_g4 || 0,
      data.aral_math_g5 || 0, data.aral_read_g5 || 0, data.aral_sci_g5 || 0,
      data.aral_math_g6 || 0, data.aral_read_g6 || 0, data.aral_sci_g6 || 0,
      data.aral_total || 0,

      // Inclusive Options
      data.sned_learners || 0, data.non_graded_learners || 0
    ];

    const result = await pool.query(query, values);

    // --- DUAL WRITE: SAVE ENROLMENT ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing Enrolment to Secondary DB...");
        await poolNew.query(query, values);
        console.log("… Dual-Write: Enrolment synced!");
      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Enrolment):", dwErr.message);
      }
    }

    if (result.rowCount === 0) {
      console.error("âŒ School Profile not found for ID:", data.schoolId);
      return res.status(404).json({ message: "School Profile not found." });
    }

    // DEBUG: Immediate Verification
    const verify = await pool.query("SELECT grade_kinder, es_enrollment FROM school_profiles WHERE school_id = $1", [data.schoolId]);
    if (verify.rows.length > 0) {
      console.log("… DB VERIFY: grade_kinder =", verify.rows[0].grade_kinder);
    }

    await logActivity(
      data.submittedBy, 'School Head', 'School Head', 'UPDATE',
      `Enrolment Data: ${data.schoolId}`,
      `Updated enrolment (Total: ${data.grandTotal})`
    );

    console.log("… Enrolment updated successfully!");
    res.status(200).json({ message: "Enrolment updated successfully!" });
    // SNAPSHOT UPDATE
    await calculateSchoolProgress(data.schoolId, pool);

  } catch (err) {
    console.error("âŒ Enrolment Save Error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// --- 7b. POST: Update Curricular Offering (Completion Gate) ---
app.post('/api/update-offering', async (req, res) => {
  const { uid, schoolId, offering } = req.body;

  if (!uid || !schoolId || !offering) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const query = `
      UPDATE school_profiles
      SET curricular_offering = $1
      WHERE school_id = $2
      RETURNING school_id;
    `;

    const result = await pool.query(query, [offering, schoolId]);

    // --- DUAL WRITE: UPDATE OFFERING ---
    if (poolNew) {
      try {
        await poolNew.query(query, [offering, schoolId]);
        console.log("… Dual-Write: Offering synced!");
      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Offering):", dwErr.message);
      }
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "School Profile not found." });
    }

    await logActivity(
      uid, 'School Head', 'School Head', 'UPDATE',
      `Curricular Offering: ${schoolId}`,
      `Set curricular offering to ${offering}`
    );

    res.json({ success: true, message: "Curricular offering updated." });

    // SNAPSHOT UPDATE
    await calculateSchoolProgress(schoolId, pool);

  } catch (err) {
    console.error("âŒ Update Offering Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// --- 8. POST: Save New Project (Updated for Images & Transactions) ---
// --- 8. POST: Save New Project (Updated for Images, Transactions & IPC) ---
app.post('/api/save-project', async (req, res) => {
  const data = req.body;

  if (!data.schoolName || !data.projectName || !data.schoolId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  let client;
  let clientNew; // For secondary DB transaction

  // Validation: Scope of Work limit
  if (data.scopeOfWork && data.scopeOfWork.length > 200) {
    return res.status(400).json({ message: "Scope of Work must be 200 characters or less." });
  }

  try {
    client = await pool.connect();
    await client.query('BEGIN'); // Start Transaction

    // --- DUAL WRITE: START TRANSACTION ---
    if (poolNew) {
      try {
        clientNew = await poolNew.connect();
        await clientNew.query('BEGIN');
      } catch (connErr) {
        console.error("âŒ Dual-Write: Failed to start transaction:", connErr.message);
        clientNew = null; // Proceed without secondary sync
      }
    }

    // --- MIGRATION: ADD PDF COLUMNS IF NOT EXIST ---
    // MOVED TO initDB() AT STARTUP TO ENSURE COLUMNS EXIST IMMEDATELY

    // 1. Resolve Project Category ID and Generate IPC (INF-CATID-YYYY-XXXXX)
    const year = data.fundingYear || new Date().getFullYear();
    const categoryMapping = {
      "New Construction": "01",
      "Repair and Rehab": "02",
      "Last Mile Schools": "03",
      "Health facilities": "04",
      "Gabaldon Restoration": "05",
      "Library Hub": "06",
      "SpEd Inclusive Learning Resource Centers (ILRC)": "07",
      "Alternative Learning System - Community Based Learning Centers (ALS-CLC)": "08",
      "Midrise School Building": "09"
    };
    const catId = categoryMapping[data.projectCategory] || "10";
    
    const ipcResult = await client.query(
      "SELECT ipc FROM engineer_form WHERE ipc LIKE $1 ORDER BY ipc DESC LIMIT 1",
      [`INF-${catId}-${year}-%`]
    );

    let nextSeq = 1;
    if (ipcResult.rows.length > 0) {
      const lastIpc = ipcResult.rows[0].ipc;
      const parts = lastIpc.split('-');
      if (parts.length === 4 && !isNaN(parts[3])) {
        nextSeq = parseInt(parts[3]) + 1;
      }
    }
    const newIpc = `INF-${catId}-${year}-${String(nextSeq).padStart(5, '0')}`;

    // 2. Prepare Project Data
    const engineerName = await getUserFullName(data.uid);
    const resolvedEngineerName = engineerName || data.modifiedBy || 'Engineer';

    // Normalization Mapping
    const statusMapping = {
      'ongoing': 'Ongoing',
      'completed': 'Completed',
      'terminated': 'Terminated',
      'suspended': 'Suspended',
      'final inspection': 'For Final Inspection',
      'for final inspection': 'For Final Inspection',
      'under procurement': 'Under procurement',
      'not yet started': 'Not Yet Started',
      'not yet procured': 'Not yet procured'
    };

    const normalizedConstructionStatus = statusMapping[data.statusOfConstructionPhase?.toLowerCase()] || data.statusOfConstructionPhase || '';
    const normalizedDesignStatus = statusMapping[data.statusDesignPhase?.toLowerCase()] || data.statusDesignPhase || '';

    // Extract Documents
    const docs = data.documents || [];
    const powDoc = docs.find(d => d.type === 'POW')?.base64 || null;
    const dupaDoc = docs.find(d => d.type === 'DUPA')?.base64 || null;
    const contractDoc = docs.find(d => d.type === 'CONTRACT')?.base64 || null;

    const projectValues = [
      data.projectName, data.schoolName, data.schoolId, // $1, $2, $3
      valueOrNull(data.region), valueOrNull(data.division), // $4, $5
      normalizedConstructionStatus, parseIntOrNull(data.accomplishmentPercentage), // $6, $7
      valueOrNull(data.statusAsOfDate), valueOrNull(data.targetCompletionDate), // $8, $9
      valueOrNull(data.actualCompletionDate), valueOrNull(data.noticeToProceed), // $10, $11
      valueOrNull(data.contractorName), parseNumberOrNull(data.approved_budget_for_contract || data.projectAllocation), // $12, $13
      parseNumberOrNull(data.contract_amount), // $14
      valueOrNull(data.batchOfFunds), valueOrNull(data.otherRemarks), // $15, $16
      data.uid, // $17
      newIpc, // $18
      resolvedEngineerName, // $19
      valueOrNull(data.latitude), // $20
      valueOrNull(data.longitude), // $21
      valueOrNull(data.constructionStartDate), // $22
      valueOrNull(data.projectCategory), // $23
      valueOrNull(data.scopeOfWork), // $24
      parseIntOrNull(data.numberOfClassrooms), // $25
      parseIntOrNull(data.numberOfSites), // $26
      parseIntOrNull(data.numberOfStoreys), // $27
      parseNumberOrNull(data.fundsUtilized), // $28
      'Newly Created', // $29
      parseNumberOrNull(data.approved_budget_for_contract || data.projectAllocation) - parseNumberOrNull(data.contract_amount), // $30
      normalizedDesignStatus, // $31
      valueOrNull(data.contractId), // $32
      valueOrNull(data.dateNoticeOfAward), // $33
      valueOrNull(data.issuanceOfInvitationToBid), // $34
      valueOrNull(data.preBidConference), // $35
      valueOrNull(data.openingOfTechnicalProposal), // $36
      valueOrNull(data.openingOfFinancialProposal), // $37
      valueOrNull(data.requestForQuotation), // $38
      valueOrNull(data.negotiation), // $39
      valueOrNull(data.openingOfQuotation), // $40
      parseIntOrNull(data.fundingYear), // $41
      null, // $42
      data.delay_reason || null, // $43
      valueOrNull(data.revised_target_completion_date) || null, // $44
      parseIntOrNull(data.time_lapsed_days || data.time_lapsed) || null, // $45
      valueOrNull(data.time_lapsed_percentage) || null, // $46
      data.is_donated || false, // $47
      data.uploader_type || null, // $48
      (data.implementingAgency || data.implementingAgencySpecific) ? 'MOA' : (data.mode_of_project || 'Direct'), // $49
      valueOrNull(data.implementingAgency), // $50
      valueOrNull(data.implementingAgencySpecific), // $51
      parseIntOrNull(data.numberOfUnits) || 0, // $52
      data.program_type || (data.is_donated ? 'Donated' : 'BEFF'), // $53
      valueOrNull(data.province), // $54
      valueOrNull(data.city), // $55
      valueOrNull(data.municipality), // $56
      catId // $57
    ];

    const projectQuery = `
      INSERT INTO "engineer_form" (
        project_name, school_name, school_id, region, division,
        status_of_construction_phase, accomplishment_percentage, status_as_of,
        target_completion_date, actual_completion_date, notice_to_proceed,
        contractor_name, approved_budget_for_contract, contract_amount, batch_of_funds, other_remarks,
        engineer_id, ipc, engineer_name, latitude, longitude,
        construction_start_date, project_category, scope_of_work,
        number_of_classrooms, number_of_sites, number_of_storeys, funds_utilized,
        actions, savings,
        status_design_phase, contract_id, date_notice_of_award,
        issuance_of_invitation_to_bid, pre_bid_conference, opening_of_technical_proposal,
        opening_of_financial_proposal, request_for_quotation, negotiation, opening_of_quotation,
        funding_year, funding_year_justification,
        delay_reason, revised_target_completion_date, time_lapsed_days, time_lapsed_percentage, is_donated, uploader_type,
        mode_of_project, implementing_agency, implementing_agency_specific, no_of_units, program_type,
        province, city, municipality, project_category_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57)
      RETURNING project_id, project_name, ipc;
    `;

    // 3. Insert Project
    const projectResult = await client.query(projectQuery, projectValues);
    const newProject = projectResult.rows[0];
    const newProjectId = newProject.project_id;

    // --- 3.1 Insert into engineer_documents ---
    const moaDoc = docs.find(d => d.type === 'MOA')?.base64 || null;
    const rtaDoc = docs.find(d => d.type === 'RTA')?.base64 || null;
    await client.query(`
      INSERT INTO engineer_documents (project_id, ipc, pow_pdf, dupa_pdf, contract_pdf, moa_pdf, rta_pdf, uploader_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [newProjectId, newIpc, powDoc, dupaDoc, contractDoc, moaDoc, rtaDoc, data.uid]);

    // --- 3.5 Insert into Extension Tables (Conditional) ---
    // HRODI Extension - Merged into engineer_form directly above

    // Finance Extension - Only if tranche data is present (though usually tranches come later, we keep it conditional)
    if (data.tranche_1 || data.tranche_2 || data.tranche_3) {
      await client.query(`
        INSERT INTO co_finance (project_id, ipc, tranche_1, tranche_2, tranche_3)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        newProjectId,
        newIpc,
        data.tranche_1 || 0,
        data.tranche_2 || 0,
        data.tranche_3 || 0
      ]);
    }

    // 4. Insert Images (If they exist in the payload)
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const imageQuery = `
        INSERT INTO "engineer_image" (project_id, image_data, uploaded_by, category, ipc)
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (const imgItem of data.images) {
        // Handle both string (legacy) and object formats
        const imgData = typeof imgItem === 'string' ? imgItem : imgItem.image_data;
        const category = typeof imgItem === 'object' ? imgItem.category : 'Internal';

        await client.query(imageQuery, [newProjectId, imgData, data.uid, category, newIpc]);
      }
    }

    // 5. NO External Document Table Insert needed (Stored in engineer_form)

    await client.query('COMMIT');

    // --- DUAL WRITE: REPLAY ON SECONDARY DB ---
    if (clientNew) {
      try {
        console.log("”„ Dual-Write: Replaying Project Creation...");

        // Ensure Schema Sync on Secondary (Comprehensive check)
        await clientNew.query(`
          ALTER TABLE engineer_form
          DROP COLUMN IF EXISTS has_variation_order,
          DROP COLUMN IF EXISTS variation_order_amount,
          DROP COLUMN IF EXISTS variation_order_remarks,
          DROP COLUMN IF EXISTS variation_order_no,
          DROP COLUMN IF EXISTS variation_order_date,
          DROP COLUMN IF EXISTS variation_order_pdf,
          DROP COLUMN IF EXISTS vo_number,
          DROP COLUMN IF EXISTS vo_requested_date,
          DROP COLUMN IF EXISTS vo_requested_by;

          ALTER TABLE lgu_projects 
          ADD COLUMN IF NOT EXISTS has_variation_order BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS variation_order_amount NUMERIC DEFAULT 0,
          ADD COLUMN IF NOT EXISTS variation_order_remarks TEXT;
        `).catch(() => { });

        // 1. Insert Project (Using SAME IPC and Data)
        const newProjRes = await clientNew.query(projectQuery, projectValues);
        const newProjIdSecondary = newProjRes.rows[0].project_id;

        // 2. Insert Images
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          const imageQuery = `
            INSERT INTO "engineer_image" (project_id, image_data, uploaded_by, category, ipc)
            VALUES ($1, $2, $3, $4, $5)
          `;
          for (const imgItem of data.images) {
            const imgData = typeof imgItem === 'string' ? imgItem : imgItem.image_data;
            const category = typeof imgItem === 'object' ? imgItem.category : 'Internal';
            await clientNew.query(imageQuery, [newProjIdSecondary, imgData, data.uid, category, newIpc]);
          }
        }

        await clientNew.query('COMMIT');
        console.log("… Dual-Write: Project Creation Synced!");
      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Project Create):", dwErr.message);
        await clientNew.query('ROLLBACK').catch(() => { });
      }
    }

    // 5. Log Activity (Detailed for History)
    const logDetails = {
      action: "Project Created",
      ipc: newIpc,
      status: data.status || 'Not Yet Started',
      accomplishment: parseIntOrNull(data.accomplishmentPercentage) || 0,
      allocation: parseNumberOrNull(data.projectAllocation),
      timestamp: new Date().toISOString()
    };

    // Fix: Ensure we have a valid user name for the log
    // Fix: Ensure we have a valid user name for the log (Fetch from DB first)
    let finalUserName = await getUserFullName(data.uid);

    // Fallback to frontend provided data if DB fetch returns null
    if (!finalUserName) {
      finalUserName = data.modifiedBy;
    }

    // Final fallback
    if (!finalUserName || finalUserName === 'undefined') {
      finalUserName = "Engineer (Unknown)";
    }

    console.log("“ Attempting to log CREATE activity for:", newIpc);

    try {
      await logActivity(
        data.uid,
        finalUserName,
        'Engineer',
        'CREATE',
        `Project: ${newProject.project_name} (${newIpc})`,
        JSON.stringify(logDetails)
      );
      console.log("… Activity logged successfully for:", newIpc);
    } catch (logErr) {
      console.error(" ï¸  Activity Log Error (Non-blocking):", logErr.message);
      console.error(" ï¸  Log Payload:", { uid: data.uid, user: finalUserName, ipc: newIpc });
    }

    res.status(200).json({ message: "Project and images saved!", project: newProject, ipc: newIpc });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (clientNew) await clientNew.query('ROLLBACK').catch(e => console.error("Dual-Write Rollback Err:", e.message)); // Rollback secondary too
    console.error("â Œ SQL ERROR:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    if (client) client.release();
    if (clientNew) clientNew.release();
  }
});
// --- 9. PUT: Update Project ---
// --- 9. PUT: Update Project (With History Logging) ---
app.put('/api/update-project/:id', upload.fields([
  { name: 'pow_pdf', maxCount: 1 },
  { name: 'dupa_pdf', maxCount: 1 },
  { name: 'contract_pdf', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  console.log("🔥 HIT: PUT /api/update-project/" + id);


  let client;
  let clientNew = null;
  try {
    client = await pool.connect();

    if (poolNew) {
      try {
        clientNew = await poolNew.connect();
        await clientNew.query('BEGIN');
      } catch (connErr) {
        console.error("⚠️ Dual-Write Conn Error (Update Project):", connErr.message);
        clientNew = null;
      }
    }

    await client.query('BEGIN');

    // 1. Fetch Existing Data for Comparison & Document Carry-over
    const oldRes = await client.query('SELECT * FROM "engineer_form" WHERE project_id = $1', [id]);
    if (oldRes.rows.length === 0) {
      await client.query('ROLLBACK');
      if (clientNew) await clientNew.query('ROLLBACK');
      return res.status(404).json({ message: "Project not found" });
    }
    const oldData = oldRes.rows[0];


    // Fetch existing documents for carry-over
    const oldDocsRes = await client.query('SELECT * FROM engineer_documents WHERE project_id = $1', [id]);
    const d = oldDocsRes.rows[0];

    // 2. Handle File Uploads
    let pow_pdf_base64 = data.pow_pdf || (d ? d.pow_pdf : null);
    let dupa_pdf_base64 = data.dupa_pdf || (d ? d.dupa_pdf : null);
    let contract_pdf_base64 = data.contract_pdf || (d ? d.contract_pdf : null);

    if (req.files) {
        if (req.files['pow_pdf']) {
            pow_pdf_base64 = fs.readFileSync(req.files['pow_pdf'][0].path, { encoding: 'base64' });
        }
        if (req.files['dupa_pdf']) {
            dupa_pdf_base64 = fs.readFileSync(req.files['dupa_pdf'][0].path, { encoding: 'base64' });
        }
        if (req.files['contract_pdf']) {
            contract_pdf_base64 = fs.readFileSync(req.files['contract_pdf'][0].path, { encoding: 'base64' });
        }
    }

    // 3. Prepare Data for New Row (Append History)
    let finalUserName = await getUserFullName(data.uid);
    if (!finalUserName) finalUserName = data.modifiedBy || 'Engineer (Unknown)';

    const statusMapping = {
      'ongoing': 'Ongoing',
      'completed': 'Completed',
      'terminated': 'Terminated',
      'suspended': 'Suspended',
      'final inspection': 'For Final Inspection',
      'under procurement': 'Under procurement',
      'not yet started': 'Not Yet Started',
      'not yet procured': 'Not yet procured'
    };

    const rawStatus = (data.statusOfConstructionPhase !== undefined) ? data.statusOfConstructionPhase : (data.status !== undefined ? data.status : oldData.status_of_construction_phase);
    const newStatus = statusMapping[rawStatus?.toLowerCase()] || rawStatus || null;

    const rawProc = valueOrNull(data.procurement_status || data.statusDesignPhase) || oldData.procurement_status || oldData.status_design_phase;
    const newProcurementStatus = statusMapping[rawProc?.toLowerCase()] || rawProc || null;

    const newStatusDesignPhase = newProcurementStatus;
    const newAccomplishment = parseIntOrNull(data.accomplishmentPercentage) !== null ? parseIntOrNull(data.accomplishmentPercentage) : oldData.accomplishment_percentage;
    const newStatusAsOf = valueOrNull(data.statusAsOfDate) || oldData.status_as_of;
    const newRemarks = valueOrNull(data.otherRemarks) || oldData.other_remarks;
    const newActualDate = valueOrNull(data.actualCompletionDate) || oldData.actual_completion_date;
    const newLat = valueOrNull(data.latitude) || oldData.latitude;
    const newLong = valueOrNull(data.longitude) || oldData.longitude;

    const categoryMapping = {
      "New Construction": "01",
      "Repair and Rehab": "02",
      "Last Mile Schools": "03",
      "Health facilities": "04",
      "Gabaldon Restoration": "05",
      "Library Hub": "06",
      "SpEd Inclusive Learning Resource Centers (ILRC)": "07",
      "Alternative Learning System - Community Based Learning Centers (ALS-CLC)": "08",
      "Midrise School Building": "09"
    };
    const newProjectCategory = valueOrNull(data.projectCategory) || oldData.project_category;
    const newCatId = categoryMapping[newProjectCategory] || oldData.project_category_id || "10";

    const rawAbc = valueOrNull(data.approved_budget_for_contract || data.projectAllocation) || oldData.approved_budget_for_contract || oldData.project_allocation;
    const rawContract = valueOrNull(data.contract_amount) || oldData.contract_amount;
    const cleanedAbc = parseNumberOrNull(rawAbc) || 0;
    const cleanedContract = parseNumberOrNull(rawContract) || 0;

    const insertValues = [
      data.project_name || oldData.project_name,
      data.school_name || oldData.school_name,
      data.school_id || oldData.school_id,
      data.region || oldData.region,
      data.division || oldData.division,
      newStatus, newAccomplishment, newStatusAsOf,
      valueOrNull(data.targetCompletionDate) || oldData.target_completion_date,
      newActualDate,
      valueOrNull(data.noticeToProceed) || oldData.notice_to_proceed,
      valueOrNull(data.contractorName) || oldData.contractor_name,
      rawAbc,
      rawContract,
      valueOrNull(data.batchOfFunds) || oldData.batch_of_funds,
      newRemarks,
      oldData.engineer_id,
      oldData.ipc,
      finalUserName,
      newLat,
      newLong,
      valueOrNull(data.constructionStartDate) || oldData.construction_start_date,
      newProjectCategory,
      valueOrNull(data.scopeOfWork) || oldData.scope_of_work,
      valueOrNull(data.numberOfClassrooms) || oldData.number_of_classrooms,
      valueOrNull(data.numberOfSites) || oldData.number_of_sites,
      valueOrNull(data.numberOfStoreys) || oldData.number_of_storeys,
      valueOrNull(data.fundsUtilized) || oldData.funds_utilized,
      valueOrNull(data.update_type) || 'Status Update',
      cleanedAbc - cleanedContract,
      newStatusDesignPhase,
      valueOrNull(data.contractId) || oldData.contract_id,
      valueOrNull(data.dateNoticeOfAward) || oldData.date_notice_of_award,
      valueOrNull(data.issuanceOfInvitationToBid) || oldData.issuance_of_invitation_to_bid,
      valueOrNull(data.preBidConference) || oldData.pre_bid_conference,
      valueOrNull(data.openingOfTechnicalProposal) || oldData.opening_of_technical_proposal,
      valueOrNull(data.openingOfFinancialProposal) || oldData.opening_of_financial_proposal,
      valueOrNull(data.requestForQuotation) || oldData.request_for_quotation,
      valueOrNull(data.negotiation) || oldData.negotiation,
      valueOrNull(data.openingOfQuotation) || oldData.opening_of_quotation,
      parseIntOrNull(data.fundingYear) || oldData.funding_year,
      data.fundingYearJustification || null,
      data.delay_reason || oldData.delay_reason,
      valueOrNull(data.revised_target_completion_date) || oldData.revised_target_completion_date,
      parseIntOrNull(data.time_lapsed_days || data.time_lapsed || data.days_lapsed) || oldData.time_lapsed_days,
      valueOrNull(data.time_lapsed_percentage) || oldData.time_lapsed_percentage,
      data.isDonated !== undefined ? data.isDonated : (data.is_donated !== undefined ? data.is_donated : oldData.is_donated),
      data.uploader_type || oldData.uploader_type,
      data.mode_of_project || oldData.mode_of_project,
      oldData.assigned_engineer_id,
      oldData.assigned_engineer_name,
      valueOrNull(data.implementingAgency) || oldData.implementing_agency,
      valueOrNull(data.implementingAgencySpecific) || oldData.implementing_agency_specific,
      oldData.uploader_id_moa_rta,
      parseIntOrNull(data.numberOfUnits) || oldData.no_of_units || 0,
      data.program_type || (data.isDonated === true || data.is_donated === true ? 'Donated' : (data.isDonated === false || data.is_donated === false ? 'BEFF' : oldData.program_type || 'BEFF')),
      valueOrNull(data.province) || oldData.province,
      valueOrNull(data.city) || oldData.city,
      valueOrNull(data.municipality) || oldData.municipality,
      pow_pdf_base64, dupa_pdf_base64, contract_pdf_base64,
      newProcurementStatus,
      oldData.mother_moa_id,
      oldData.supplamental_moa_id,
      oldData.sangguniang_resolution_id,
      newCatId
    ];

    const insertQuery = `
      INSERT INTO "engineer_form" (

        project_name, school_name, school_id, region, division,
        status_of_construction_phase, accomplishment_percentage, status_as_of,
        target_completion_date, actual_completion_date, notice_to_proceed,
        contractor_name, approved_budget_for_contract, contract_amount, batch_of_funds, other_remarks,
        engineer_id, ipc, engineer_name, latitude, longitude,
        construction_start_date, project_category, scope_of_work,
        number_of_classrooms, number_of_sites, number_of_storeys, funds_utilized,
        actions, savings,
        status_design_phase, contract_id, date_notice_of_award,
        issuance_of_invitation_to_bid, pre_bid_conference, opening_of_technical_proposal,
        opening_of_financial_proposal, request_for_quotation, negotiation, opening_of_quotation,
        funding_year, funding_year_justification,
        delay_reason, revised_target_completion_date, time_lapsed_days, time_lapsed_percentage, is_donated, uploader_type,
        mode_of_project, assigned_engineer_id, assigned_engineer_name,
        implementing_agency, implementing_agency_specific, uploader_id_moa_rta, no_of_units, program_type,
        province, city, municipality,
        pow_pdf, dupa_pdf, contract_pdf,
        procurement_status,
        mother_moa_id, supplamental_moa_id, sangguniang_resolution_id, project_category_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67)
      RETURNING *;
    `;

    console.log("🚀 INSERTING MAPPED VALUES:", insertValues.slice(0, 5));
    fs.appendFileSync('debug.log', `[${new Date().toISOString()}] INSERTING PROJECT_NAME: ${insertValues[0]}\n`);
    const result = await client.query(insertQuery, insertValues);


    const newData = result.rows[0];

    // --- 2.2a Handle Documents Insert for new snapshot (engineer_documents) ---
    // NOTE: Each update creates a NEW engineer_form row (append-only snapshot), so project_id
    // is always brand new here. Plain INSERT is correct — no conflict is possible.
    await client.query(`
      INSERT INTO engineer_documents (project_id, ipc, pow_pdf, dupa_pdf, contract_pdf, rta_pdf, moa_pdf, uploader_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      newData.project_id, newData.ipc,
      pow_pdf_base64,
      dupa_pdf_base64,
      contract_pdf_base64,
      data.rta_pdf || (d ? d.rta_pdf : null),
      data.moa_pdf || (d ? d.moa_pdf : null),
      (data.pow_pdf || data.dupa_pdf || data.contract_pdf || (req.files && Object.keys(req.files).length > 0)) ? data.uid : (d ? d.uploader_id : null)
    ]);

    // Handle background compression if new files were uploaded
    if (req.files) {
        ['pow_pdf', 'dupa_pdf', 'contract_pdf'].forEach(field => {
            if (req.files[field] && req.files[field][0]) {
                processPdfFile(req.files[field][0]).then(async compressedBase64 => {
                    try {
                        await pool.query(`UPDATE engineer_documents SET ${field} = $1 WHERE project_id = $2`, [compressedBase64, newData.project_id]);
                        await pool.query(`UPDATE engineer_form SET ${field} = $1 WHERE project_id = $2`, [compressedBase64, newData.project_id]);
                        console.log(`✅ Background ${field} Compression Success for project ${newData.project_id}`);
                    } catch (e) {
                        console.error(`❌ Background ${field} Update Failed`, e);
                    }
                }).catch(err => console.error(`${field} bg compress err`, err));
            }
        });
    }

    // --- 2.3 Handle Extension Tables Update (Conditional Carry Over + Changes) ---
    // HRODI Extension - Merged into engineer_form directly above
    const oldFinance = await client.query('SELECT * FROM co_finance WHERE project_id = $1', [id]);
    const f = (oldFinance.rows[0]);

    // Finance Extension - Only if they already had a record OR if tranche data is being provided
    if (f || data.tranche_1 !== undefined || data.tranche_2 !== undefined || data.tranche_3 !== undefined ||
      data.liquidated_tranche_1 !== undefined || data.liquidated_tranche_2 !== undefined || data.liquidated_tranche_3 !== undefined) {
      await client.query(`
        INSERT INTO co_finance (
          project_id, ipc, tranche_1, tranche_2, tranche_3, liquidated_tranche_1, liquidated_tranche_2, liquidated_tranche_3
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        newData.project_id, newData.ipc,
        (data.tranche_1 !== undefined ? data.tranche_1 : (f ? f.tranche_1 : 0)),
        (data.tranche_2 !== undefined ? data.tranche_2 : (f ? f.tranche_2 : 0)),
        (data.tranche_3 !== undefined ? data.tranche_3 : (f ? f.tranche_3 : 0)),
        (data.liquidated_tranche_1 !== undefined ? data.liquidated_tranche_1 : (f ? f.liquidated_tranche_1 : 0)),
        (data.liquidated_tranche_2 !== undefined ? data.liquidated_tranche_2 : (f ? f.liquidated_tranche_2 : 0)),
        (data.liquidated_tranche_3 !== undefined ? data.liquidated_tranche_3 : (f ? f.liquidated_tranche_3 : 0))
      ]);
    }

    // --- 2.5 HANDLE VARIATION ORDER RECORD ---
    if (data.update_type === 'Variation Order' || data.actions === 'Variation Order') {
      try {
        // Fetch cumulative VO total before this update
        const voSumRes = await client.query(
          'SELECT SUM(net_vo_amount) FROM variation_orders WHERE project_id = $1',
          [id]
        );
        const previousVoTotal = parseFloat(voSumRes.rows[0].sum || 0);

        const voValues = [
          newData.project_id,
          newData.ipc,
          data.vo_number || null,
          parseInt(data.vo_sequence_no) || null,
          data.vo_type || 'Combined',
          data.vo_requested_date || new Date(),
          data.vo_requested_by || finalUserName,
          oldData.contract_amount, // original_contract_amount
          parseFloat(data.additive_amount) || 0,
          parseFloat(data.deductive_amount) || 0,
          parseFloat(data.net_vo_amount) || 0,
          newData.contract_amount,         // revised_contract_amount (already updated in newData)
          oldData.target_completion_date, // original_target_completion_date
          newData.target_completion_date, // revised_target_completion_date
          parseInt(data.time_extension_days) || 0,
          data.revised_expiry_date || newData.target_completion_date,
          data.otherRemarks || '',
          data.caf_reference || null,
          'Approved', // Default to approved as it's signed off by the engineer in this flow
          data.revised_pow_pdf || data.pow_pdf || null,
          data.revised_dupa_pdf || data.dupa_pdf || null,
          data.revised_contract_pdf || data.contract_pdf || null,
          finalUserName,
          data.justification_category || 'Other',
          data.justification_details || data.otherRemarks || '',
          previousVoTotal,
          oldData.target_completion_date // original_expiry_date reference
        ];

        const voQuery = `
          INSERT INTO variation_orders (
            project_id, ipc, variation_name, vo_sequence_no, variation_type, 
            requested_date, requested_by, original_amount, 
            additive, deductive, modified_amount, revised_contract_amount,
            original_target_completion_date, revised_target_completion_date,
            time_extension_days, revised_expiry_date, justification, caf_reference, 
            status, revised_pow_pdf, revised_dupa_pdf, revised_contract_pdf, created_by,
            justification_category, justification_details, previous_vo_total, original_expiry_date,
            reused_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        `;

        // Add reused_amount (default 0 for this flow)
        voValues.push(0);


        await client.query(voQuery, voValues);
        if (clientNew) {
          try {
            await clientNew.query(voQuery, voValues);
          } catch (dwErr) {
            console.error("Dual-Write Variation Order Err:", dwErr.message);
          }
        }
        console.log("✅ Variation Order Record Created for IPC:", newData.ipc);
      } catch (voErr) {
        console.error("❌ ERROR CREATING VO RECORD:", voErr.message);
        // Non-blocking for the main update, but we should log it
      }
    }

    // --- DUAL WRITE: UPDATE PROJECT ---
    if (clientNew) {
      try {
        // We need to fetch the OLD data from the secondary DB too to handle snapshot nicely?
        // Or just blindly insert the new row?
        // The `insertQuery` is an INSERT (Append Only).
        // It relies on `oldData` which came from Primary DB.
        // We can use the SAME `insertValues`!
        // The `insertValues` contains primitive data (status_of_construction_phase, etc.) and `finalUserName`.
        // It does NOT contain `project_id` reference (except implicitly? No, engineer_form PK is `project_id` serial).
        // Wait, `insertQuery` inserts a NEW row. 
        // Is `engineer_form` storing `school_id`? Yes.
        // History is tracked via `ipc`. 
        // As long as IPC matches, we are good.
        // The values array has IPC at index 17 ($17).

        await clientNew.query(insertQuery, insertValues);
        await clientNew.query('COMMIT');
        console.log("… Dual-Write: Project Update Synced!");
      } catch (dwErr) {
        console.error("âŒ Dual-Write Project Update Err:", dwErr.message);
        await clientNew.query('ROLLBACK').catch(() => { });
      }
    }

    await client.query('COMMIT');

    // 3. Track Changes (History)
    const changes = [];
    if (oldData.status_of_construction_phase !== newData.status_of_construction_phase) changes.push(`Construction Status: '${oldData.status_of_construction_phase || 'None'}' -> '${newData.status_of_construction_phase}'`);
    if (oldData.procurement_status !== newProcurementStatus) changes.push(`Procurement Status: '${oldData.procurement_status || 'None'}' -> '${newProcurementStatus}'`);
    if (oldData.accomplishment_percentage !== newData.accomplishment_percentage) changes.push(`Accomplishment: ${oldData.accomplishment_percentage}% -> ${newData.accomplishment_percentage}%`);
    if (oldData.other_remarks !== newData.other_remarks) changes.push(`Remarks updated`);

    // Create a detailed log object
    const historyLog = {
      action: "Project Update",
      ipc: newData.ipc,
      changes: changes, // List of human-readable changes
      snapshot: { // Save key metrics
        status_of_construction_phase: newData.status_of_construction_phase,
        procurement_status: newProcurementStatus,
        accomplishment: newData.accomplishment_percentage,
        date: new Date().toISOString()
      }
    };

    // 4. Log Activity
    // Note: finalUserName is already computed above logic
    const primaryAction = changes.length > 0 ? changes[0].split(':')[0] + ' Update' : (data.update_type || 'Project Update');

    await logActivity(
      data.uid,
      finalUserName,
      'Engineer',
      primaryAction, // Dynamic Action Label
      `Project: ${newData.project_name} (${newData.ipc || 'No IPC'})`,
      JSON.stringify(historyLog) // Storing structured history
    );

    res.json({ message: "Update successful", project: newData });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (clientNew) await clientNew.query('ROLLBACK').catch(() => { });
    console.error("âŒ Error updating project:", err.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message, 
      detail: err.detail || "No additional detail" 
    });
  } finally {
    if (client) client.release();
    if (clientNew) clientNew.release();
  }
});

// --- 9.4 POST: Upload Project Document (POW / DUPA / CONTRACT) ---
app.post('/api/upload-project-document', upload.single('document_pdf'), async (req, res) => {
  const { project_id, type, uid, ipc } = req.body;
  const validTypes = ['POW', 'DUPA', 'CONTRACT'];

  if (!project_id || !validTypes.includes(type?.toUpperCase())) {
    return res.status(400).json({ error: 'project_id and a valid type (POW, DUPA, CONTRACT) are required.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file provided.' });
  }

  try {
    // Verify project exists
    const check = await pool.query('SELECT project_id FROM engineer_form WHERE project_id = $1', [project_id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json({ success: true, message: `${type} upload received. Compressing in background…` });

    // Background compression + save (reuses existing processPdfInBackground helper)
    processPdfInBackground(req.file, project_id, type.toUpperCase(), ipc || null, uid || null);
  } catch (err) {
    console.error('❌ upload-project-document error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// --- 9.5 GET: Variation Orders by IPC ---
app.get('/api/projects/variation-orders/:ipc', async (req, res) => {
  const { ipc } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM variation_orders WHERE ipc = $1 ORDER BY COALESCE(vo_sequence_no, 0) ASC, created_at ASC',
      [ipc]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching VO history:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 9.6 POST: Save Variation Order (Simplified Flow) ---
app.post('/api/variation-orders', async (req, res) => {
  const { 
    projectId, ipc, variationName, variationType, 
    originalAmount, additive, deductive, reusedAmount,
    uid, userName 
  } = req.body;

  if (!projectId || !variationName || !variationType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const original = parseFloat(originalAmount) || 0;
    const add = parseFloat(additive) || 0;
    const ded = parseFloat(deductive) || 0;
    const reused = parseFloat(reusedAmount) || 0;
    
    // Calculate total modified amount
    const modified = original + add - ded;

    // Fetch latest IPC and record info for history consistency
    const projectRes = await pool.query('SELECT ipc, project_name FROM engineer_form WHERE project_id = $1', [projectId]);
    const project = projectRes.rows[0];
    const resolvedIpc = ipc || project?.ipc;

    const query = `
      INSERT INTO variation_orders (
        project_id, ipc, variation_name, variation_type, 
        original_amount, additive, deductive, reused_amount, modified_amount, created_by,
        requested_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'Approved')
      RETURNING *;
    `;
    const values = [projectId, resolvedIpc, variationName, variationType, original, add, ded, reused, modified, uid];
    const result = await pool.query(query, values);

    await logActivity(
      uid, userName || 'Engineer', 'Engineer', 'VARIATION',
      `VO: ${variationName} (${project?.project_name || resolvedIpc})`,
      JSON.stringify({
        variation_name: variationName,
        type: variationType,
        original: original,
        additive: add,
        deductive: ded,
        reused: reused,
        total: modified
      })
    );

    res.status(201).json({ success: true, variation: result.rows[0] });
  } catch (err) {
    console.error("❌ Variation Order Error:", err.message);
    res.status(500).json({ error: "Failed to save variation order" });
  }
});

// --- 9.7 GET: Variation Orders by Project ID ---
app.get('/api/variation-orders/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM variation_orders WHERE project_id = $1 OR ipc IN (SELECT ipc FROM engineer_form WHERE project_id = $1) ORDER BY created_at DESC',
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Fetch VO Error:", err.message);
    res.status(500).json({ error: "Failed to fetch variation orders" });
  }
});

// --- 10. REALIGNMENT ROUTES ---
app.get('/api/projects/realignment-candidates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get source project's geographic attributes from 'schools' table
    const sourceRes = await pool.query(`
      SELECT 
        e.project_category, s.district, s.region
      FROM engineer_form e
      LEFT JOIN schools s ON e.school_id = s.school_id
      WHERE e.project_id = $1
    `, [id]);

    if (sourceRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });

    const { project_category, district, region } = sourceRes.rows[0];

    // 2. Find eligible candidate projects strictly matching DepEd realignment requirements
    // Must match Category, Region, and District
    const candidatesRes = await pool.query(`
      SELECT DISTINCT ON (e.ipc) 
        e.project_id AS id, e.ipc, e.project_name AS "projectName", e.school_name AS "schoolName", 
        e.approved_budget_for_contract AS "approved_budget_for_contract",
        e.contract_amount AS "contract_amount",
        s.district, e.status_of_construction_phase AS status
      FROM engineer_form e
      JOIN schools s ON e.school_id = s.school_id
      WHERE 
        e.project_category = $1 AND 
        s.region = $2 AND 
        (s.district = $3 OR ($3 IS NULL AND s.district IS NULL)) AND
        e.project_id != $4
      ORDER BY e.ipc, e.project_id DESC
    `, [project_category, region, district, id]);

    res.json(candidatesRes.rows);
  } catch (err) {
    console.error("Candidates Fetch Error:", err);
    res.status(500).json({ message: "Candidates error", error: err.message });
  }
});

app.post('/api/projects/realign', async (req, res) => {
  const { sourceProjectId, targetIpc } = req.body;
  const realignmentDate = new Date();

  let client;
  let clientNew = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    if (poolNew) {
      try {
        clientNew = await poolNew.connect();
        await clientNew.query('BEGIN');
      } catch (e) { console.warn("Secondary DB Conn Failed during realignment", e.message); }
    }

    // 1. Get source project current data
    const sourceRes = await client.query('SELECT * FROM engineer_form WHERE project_id = $1', [sourceProjectId]);
    const sourceData = sourceRes.rows[0];

    // 2. Get target project latest data
    const targetRes = await client.query('SELECT * FROM engineer_form WHERE ipc = $1 ORDER BY project_id DESC LIMIT 1', [targetIpc]);
    const targetData = targetRes.rows[0];

    if (!sourceData || !targetData) throw new Error("Source or Target project not found");

    const amount = sourceData.approved_budget_for_contract;
    const sourceRemarks = `Realignment: Full allocation of ₱${Number(amount).toLocaleString()} transferred to ${targetData.school_name}.`;
    const targetRemarks = `Realignment: Received ₱${Number(amount).toLocaleString()} from ${sourceData.school_name} (Full Project Transfer).`;

    const insertSql = `
      INSERT INTO engineer_form (
        project_name, school_name, school_id, region, division,
        status_of_construction_phase, accomplishment_percentage, status_as_of,
        target_completion_date, actual_completion_date, notice_to_proceed,
        contractor_name, approved_budget_for_contract, contract_amount, batch_of_funds, other_remarks,
        engineer_id, ipc, engineer_name, latitude, longitude,
        pow_pdf, dupa_pdf, contract_pdf,
        construction_start_date, project_category, scope_of_work,
        number_of_classrooms, number_of_storeys, number_of_sites, funds_utilized,
        actions, savings,
        status_design_phase, contract_id, date_notice_of_award,
        issuance_of_invitation_to_bid, pre_bid_conference, opening_of_technical_proposal,
        opening_of_financial_proposal, request_for_quotation, negotiation, opening_of_quotation,
        funding_year, funding_year_justification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45)
    `;

    // 3. Insert NEW record for Source Project (Reduced Allocation)
    const newSourceAllocation = Number(sourceData.approved_budget_for_contract) - Number(amount);
    const sourceVals = [
      sourceData.project_name, sourceData.school_name, sourceData.school_id, sourceData.region, sourceData.division,
      sourceData.status_of_construction_phase, sourceData.accomplishment_percentage, realignmentDate,
      sourceData.target_completion_date, sourceData.actual_completion_date, sourceData.notice_to_proceed,
      sourceData.contractor_name, newSourceAllocation, sourceData.contract_amount, sourceData.batch_of_funds, sourceRemarks,
      sourceData.engineer_id, sourceData.ipc, sourceData.engineer_name, sourceData.latitude, sourceData.longitude,
      sourceData.pow_pdf, sourceData.dupa_pdf, sourceData.contract_pdf,
      sourceData.construction_start_date, sourceData.project_category, sourceData.scope_of_work,
      sourceData.number_of_classrooms, sourceData.number_of_storeys, sourceData.number_of_sites, sourceData.funds_utilized,
      'Realignment (Source)',
      Number(newSourceAllocation) - Number(sourceData.contract_amount), // savings
      sourceData.status_design_phase, sourceData.contract_id, sourceData.date_notice_of_award,
      sourceData.issuance_of_invitation_to_bid, sourceData.pre_bid_conference, sourceData.opening_of_technical_proposal,
      sourceData.opening_of_financial_proposal, sourceData.request_for_quotation, sourceData.negotiation, sourceData.opening_of_quotation,
      sourceData.funding_year, sourceData.funding_year_justification
    ];
    await client.query(insertSql, sourceVals);
    if (clientNew) await clientNew.query(insertSql, sourceVals);

    // 4. Insert NEW record for Target Project (Inherits Source Metadata + New Allocation)
    const newTargetAllocation = Number(targetData.approved_budget_for_contract) + Number(amount);
    const targetVals = [
      sourceData.project_name, targetData.school_name, targetData.school_id, targetData.region, targetData.division,
      targetData.status_of_construction_phase, targetData.accomplishment_percentage, realignmentDate,
      sourceData.target_completion_date, sourceData.actual_completion_date, sourceData.notice_to_proceed,
      sourceData.contractor_name, newTargetAllocation, targetData.contract_amount, sourceData.batch_of_funds, targetRemarks,
      targetData.engineer_id, targetData.ipc, targetData.engineer_name, targetData.latitude, targetData.longitude,
      sourceData.pow_pdf, sourceData.dupa_pdf, sourceData.contract_pdf,
      sourceData.construction_start_date, sourceData.project_category, sourceData.scope_of_work,
      sourceData.number_of_classrooms, sourceData.number_of_storeys, sourceData.number_of_sites, targetData.funds_utilized,
      'Realignment (Target)',
      Number(newTargetAllocation) - Number(targetData.contract_amount), // savings
      sourceData.status_design_phase, sourceData.contract_id, sourceData.date_notice_of_award,
      sourceData.issuance_of_invitation_to_bid, sourceData.pre_bid_conference, sourceData.opening_of_technical_proposal,
      sourceData.opening_of_financial_proposal, sourceData.request_for_quotation, sourceData.negotiation, sourceData.opening_of_quotation,
      targetData.funding_year, targetData.funding_year_justification
    ];
    await client.query(insertSql, targetVals);
    if (clientNew) await clientNew.query(insertSql, targetVals);

    await client.query('COMMIT');
    if (clientNew) await clientNew.query('COMMIT');

    res.json({ message: "Realignment successful" });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (clientNew) await clientNew.query('ROLLBACK');
    console.error("Realignment Error:", err);
    res.status(500).json({ message: "Realignment failed", error: err.message });
  } finally {
    if (client) client.release();
    if (clientNew) clientNew.release();
  }
});

// ==================================================================
//               FINANCE DASHBOARD ENDPOINTS
// ==================================================================
app.get('/api/finance-dashboard/projects', async (req, res) => {
  try {
    const baseQuery = `
      SELECT DISTINCT ON (COALESCE(e.ipc, e.project_id::text)) 
        e.project_id, e.project_name, e.school_name, e.school_id, e.region, e.division,
        e.status_of_construction_phase AS status,
        e.mode_of_project, f.tranche_1, f.tranche_2, f.tranche_3,
        e.ipc, e.assigned_engineer_name as assigned_engineer,
        (NULLIF(e.moa_pdf, '') IS NOT NULL) AS has_moa
      FROM engineer_form e
      LEFT JOIN co_finance f ON e.project_id = f.project_id
      WHERE NULLIF(e.moa_pdf, '') IS NOT NULL
      ORDER BY COALESCE(e.ipc, e.project_id::text), e.project_id DESC
    `;

    const aggregateQuery = `
      SELECT 
        COUNT(*) as total_projects,
        SUM(COALESCE(tranche_1, 0)) as total_tranche_1,
        SUM(COALESCE(tranche_2, 0)) as total_tranche_2,
        SUM(COALESCE(tranche_3, 0)) as total_tranche_3
      FROM (${baseQuery}) Latest
    `;
    const aggResult = await pool.query(aggregateQuery);
    const tableQuery = `SELECT * FROM (${baseQuery}) Latest ORDER BY project_id DESC`;
    const tableResult = await pool.query(tableQuery);

    res.json({
      aggregates: {
        totalProjects: parseInt(aggResult.rows[0].total_projects || 0, 10),
        totalTranche1: parseFloat(aggResult.rows[0].total_tranche_1 || 0),
        totalTranche2: parseFloat(aggResult.rows[0].total_tranche_2 || 0),
        totalTranche3: parseFloat(aggResult.rows[0].total_tranche_3 || 0)
      },
      projects: tableResult.rows
    });
  } catch (err) {
    console.error("❌ Error fetching finance projects:", err);
    res.status(500).json({ error: "Failed to fetch finance projects", details: err.message });
  }
});

app.patch('/api/finance-dashboard/projects/:id/tranches', async (req, res) => {
  const { id } = req.params;
  const { tranche_1, tranche_2, tranche_3 } = req.body;
  try {
    const query = `
      UPDATE co_finance 
      SET 
        tranche_1 = COALESCE($1, tranche_1), 
        tranche_2 = COALESCE($2, tranche_2), 
        tranche_3 = COALESCE($3, tranche_3)
      WHERE project_id = $4
      RETURNING project_id, tranche_1, tranche_2, tranche_3
    `;
    const result = await pool.query(query, [tranche_1, tranche_2, tranche_3, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ success: true, project: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating project tranches:", err.message);
    res.status(500).json({ error: "Failed to update project tranches" });
  }
});

// ==================================================================
//               IMPLEMENTING AGENCY DASHBOARD ENDPOINTS
// ==================================================================
app.get('/api/agency-dashboard/projects', async (req, res) => {
  const { agency, region, province, city } = req.query;
  try {
    let filterClause = '';
    let params = [];
    let paramCount = 1;

    if (agency && agency !== 'All') {
      const agencyClean = agency.replace(/^MGO\s+|PGO\s+|CGO\s+/i, '').trim();
      if (agencyClean) {
        filterClause += ` AND (implementing_agency ILIKE $${paramCount} OR implementing_agency_specific ILIKE $${paramCount})`;
        params.push(`%${agencyClean}%`);
        paramCount++;
      }
    }

    if (region && region !== 'All') {
      // Precise wildcard to ensure 'CAR' != 'CARAGA' if they are passing raw strings
      filterClause += ` AND CASE WHEN $${paramCount} = 'CAR' THEN region = 'CAR' ELSE region ILIKE '%' || $${paramCount} || '%' END`;
      params.push(region.replace(/^Region\s+|^Reg-\s*|^R-\s*/i, '').trim());
      paramCount++;
    }

    if (province && province !== 'All' && province !== 'null') {
      filterClause += ` AND province ILIKE $${paramCount}`;
      params.push(`%${province}%`);
      paramCount++;
    }

    if (city && city !== 'All' && city !== 'null') {
      filterClause += ` AND (municipality ILIKE $${paramCount} OR city ILIKE $${paramCount} OR implementing_agency ILIKE $${paramCount})`;
      params.push(`%${city}%`);
      paramCount++;
    }

    const baseConditions = `
        (e.implementing_agency IS NOT NULL OR e.implementing_agency_specific IS NOT NULL)
        AND NULLIF(d.moa_pdf, '') IS NOT NULL
        AND NULLIF(d.rta_pdf, '') IS NOT NULL
        AND f.tranche_1 > 0
    `;

    const aggregateQuery = `
      WITH ValidProjects AS (
          SELECT DISTINCT ON (COALESCE(e.ipc, e.project_id::text))
            e.project_id, e.implementing_agency, e.region, f.tranche_1, f.tranche_2, f.tranche_3, e.status_of_construction_phase AS status
          FROM engineer_form e
          INNER JOIN co_finance f ON e.project_id = f.project_id
          LEFT JOIN engineer_documents d ON e.project_id = d.project_id
          WHERE ${baseConditions} ${filterClause}
          ORDER BY COALESCE(e.ipc, e.project_id::text), e.project_id DESC
      )
      SELECT 
        COUNT(DISTINCT implementing_agency) as total_active_agencies,
        COUNT(*) as total_moa_projects,
        SUM(COALESCE(tranche_1, 0) + COALESCE(tranche_2, 0) + COALESCE(tranche_3, 0)) as total_tranche_value,
        COUNT(*) FILTER (WHERE status != 'Completed' AND status IS NOT NULL) as pending_moa_tasks
      FROM ValidProjects
    `;
    const aggResult = await pool.query(aggregateQuery, params);

    const tableQuery = `
      WITH LatestFiltered AS (
          SELECT DISTINCT ON (COALESCE(e.ipc, e.project_id::text)) 
            e.project_id, e.implementing_agency, e.region, e.project_name, 
            f.tranche_1, f.tranche_2, f.tranche_3, e.assigned_engineer_name, 
            e.mode_of_project, e.status_of_construction_phase AS status,
            f.liquidated_tranche_1, f.liquidated_tranche_2, f.liquidated_tranche_3,
            (NULLIF(d.moa_pdf, '') IS NOT NULL) AS has_moa,
            (NULLIF(d.rta_pdf, '') IS NOT NULL) AS has_rta
          FROM engineer_form e
          INNER JOIN co_finance f ON e.project_id = f.project_id
          LEFT JOIN engineer_documents d ON e.project_id = d.project_id
          WHERE ${baseConditions} ${filterClause}
          ORDER BY COALESCE(e.ipc, e.project_id::text), e.project_id DESC
      )
      SELECT * FROM LatestFiltered
      ORDER BY project_id DESC
    `;
    const tableResult = await pool.query(tableQuery, params);

    const allProjectsQuery = `
      SELECT DISTINCT ON (COALESCE(e.ipc, e.project_id::text)) 
        e.project_id, e.implementing_agency, e.implementing_agency_specific, e.region, e.project_name, 
        f.tranche_1, f.tranche_2, f.tranche_3, e.assigned_engineer_name, 
        e.mode_of_project, e.status_of_construction_phase AS status,
        (NULLIF(d.moa_pdf, '') IS NOT NULL) AS has_moa,
        (NULLIF(d.rta_pdf, '') IS NOT NULL) AS has_rta
      FROM engineer_form e
      INNER JOIN co_finance f ON e.project_id = f.project_id
      LEFT JOIN engineer_documents d ON e.project_id = d.project_id
      WHERE ${baseConditions} ${filterClause}
      ORDER BY COALESCE(e.ipc, e.project_id::text), e.project_id DESC
    `;
    const allProjectsResult = await pool.query(allProjectsQuery, params);

    res.json({
      aggregates: {
        totalActiveAgencies: parseInt(aggResult.rows[0].total_active_agencies || 0, 10),
        totalMoaProjects: parseInt(aggResult.rows[0].total_moa_projects || 0, 10),
        totalTrancheValue: parseFloat(aggResult.rows[0].total_tranche_value || 0),
        pendingMoaTasks: parseInt(aggResult.rows[0].pending_moa_tasks || 0, 10)
      },
      projects: tableResult.rows,
      allProjects: allProjectsResult.rows
    });
  } catch (err) {
    console.error("❌ Error fetching agency projects:", err.message);
    res.status(500).json({ error: "Failed to fetch agency projects" });
  }
});

app.patch('/api/agency-dashboard/projects/:id/liquidation', async (req, res) => {
  const { id } = req.params;
  const { liquidated_tranche_1, liquidated_tranche_2, liquidated_tranche_3 } = req.body;
  try {
    const query = `
      UPDATE co_finance 
      SET 
        liquidated_tranche_1 = COALESCE($1, liquidated_tranche_1), 
        liquidated_tranche_2 = COALESCE($2, liquidated_tranche_2), 
        liquidated_tranche_3 = COALESCE($3, liquidated_tranche_3)
      WHERE project_id = $4
      RETURNING project_id, liquidated_tranche_1, liquidated_tranche_2, liquidated_tranche_3
    `;
    const result = await pool.query(query, [liquidated_tranche_1, liquidated_tranche_2, liquidated_tranche_3, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ success: true, project: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating project liquidation:", err.message);
    res.status(500).json({ error: "Failed to update project liquidation" });
  }
});

// ==================================================================
//         HRODI / EFD DASHBOARD PERFORMANCE ENDPOINTS
// ==================================================================

// 1. GET: EFD Dashboard Summary (Aggregated Chart Data)
app.get('/api/dashboard/efd-summary', async (req, res) => {
  try {
    const { engineer_id, is_donated, region, division, search, category, year } = req.query;
    let queryParams = [];
    let whereClauses = [];

    // Shared Filtering Logic (MUST match /api/projects)
    if (engineer_id) {
      const userResult = await pool.query('SELECT role, region, division FROM users WHERE uid = $1', [engineer_id]);
      const userProfile = userResult.rows[0];
      if (userProfile) {
        const role = userProfile.role?.trim().toLowerCase();
        const isAdmin = ['central office', 'hrodi', 'super user', 'super admin', 'admin', 'efd', 'efd engineer', 'hrodi engineer', 'central office finance'].includes(role);
        const isDivEng = ['division engineer', 'sdo', 'ro', 'regional office', 'school division office', 'deped engineer', 'engineer'].includes(role);

        if (isAdmin) {
          // admin/HRODI sees all summary stats; skip engineer_id/region/division filters
        } else if (isDivEng) {
          if (userProfile.region) {
            queryParams.push(userProfile.region.trim());
            whereClauses.push(`TRIM(e.region) ILIKE TRIM($${queryParams.length})`);
          }
          if (userProfile.division) {
            queryParams.push(userProfile.division.trim());
            whereClauses.push(`TRIM(e.division) ILIKE TRIM($${queryParams.length})`);
          }
        } else {
          queryParams.push(engineer_id);
          whereClauses.push(`e.engineer_id = $${queryParams.length}`);
        }
      }
    }

    if (is_donated === 'Donated') {
      queryParams.push('Donated');
      whereClauses.push(`e.program_type = $${queryParams.length}`);
    } else if (is_donated === 'BEFF' || is_donated === 'Non-Donated') {
      queryParams.push('BEFF');
      whereClauses.push(`e.program_type = $${queryParams.length}`);
    }

    if (region) { queryParams.push(region); whereClauses.push(`e.region = $${queryParams.length}`); }
    if (division) { queryParams.push(division); whereClauses.push(`e.division = $${queryParams.length}`); }
    if (category) { queryParams.push(category); whereClauses.push(`e.project_category = $${queryParams.length}`); }
    if (year) { queryParams.push(year); whereClauses.push(`e.funding_year = $${queryParams.length}`); }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(e.school_name ILIKE $${queryParams.length} OR e.project_name ILIKE $${queryParams.length})`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ` + whereClauses.join(' AND ') : '';

    // We use DISTINCT ON to get the latest entry per project, then aggregate
    const sql = `
      WITH LatestProjects AS (
        SELECT DISTINCT ON (COALESCE(e.ipc, e.school_id || '-' || e.project_name))
          e.region, e.division, e.project_category, e.funding_year, e.approved_budget_for_contract, e.program_type,
          (NULLIF(d.moa_pdf, '') IS NOT NULL) AS has_moa,
          (NULLIF(d.rta_pdf, '') IS NOT NULL) AS has_rta
        FROM engineer_form e
        LEFT JOIN engineer_documents d ON e.project_id = d.project_id
        ${whereStr}
        ORDER BY COALESCE(e.ipc, e.school_id || '-' || e.project_name), e.project_id DESC
      )
      SELECT 
        jsonb_build_object(
          'regionalData', (
            SELECT jsonb_agg(r) FROM (
              SELECT region as name, project_category as category, COUNT(*) as count, SUM(approved_budget_for_contract) as total_abc
              FROM LatestProjects 
              GROUP BY region, project_category
            ) r
          ),
          'divisionData', (
            SELECT jsonb_agg(d) FROM (
              SELECT division as name, project_category as category, COUNT(*) as count, SUM(approved_budget_for_contract) as total_abc
              FROM LatestProjects 
              GROUP BY division, project_category
            ) d
          ),
          'categoryData', (
            SELECT jsonb_agg(c) FROM (
              SELECT project_category as name, COUNT(*) as value
              FROM LatestProjects 
              GROUP BY project_category
            ) c
          ),
          'yearData', (
            SELECT jsonb_agg(y) FROM (
              SELECT funding_year as name, COUNT(*) as count
              FROM LatestProjects 
              GROUP BY funding_year
            ) y
          ),
          'totalStats', (
            SELECT jsonb_build_object(
              'totalProjects', COUNT(*),
              'totalABC', SUM(approved_budget_for_contract),
              'donatedCount', COUNT(*) FILTER (WHERE program_type = 'Donated'),
              'beffCount', COUNT(*) FILTER (WHERE program_type = 'BEFF'),
              'completeDocs', COUNT(*) FILTER (WHERE has_moa AND has_rta)
            ) FROM LatestProjects
          )
        ) as summary;
    `;

    const result = await pool.query(sql, queryParams);
    res.json(result.rows[0].summary || {});
    
  } catch (err) {
    console.error("❌ Error fetching EFD summary:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- 11. GET: Get Projects (Filtered by Engineer) ---
app.get('/api/projects', async (req, res) => {
  try {
    // We catch the engineer_id sent from EngineerDashboard.jsx
    const { status, region, division, search, engineer_id, is_donated, implementing_agency, sty, cl, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let queryParams = [];
    let whereClauses = [];

    let sql = `
      WITH RankedProjects AS (
          SELECT 
            e.project_id, e.school_name, e.project_name, e.school_id, e.division, e.region, e.status_of_construction_phase AS status, e.ipc, e.engineer_name, e.engineer_id,
            e.accomplishment_percentage,
            LAG(e.accomplishment_percentage) OVER (
                PARTITION BY COALESCE(e.ipc, e.school_id || '-' || e.project_name) 
                ORDER BY e.project_id ASC
            ) as previous_percentage,
            e.approved_budget_for_contract, e.contract_amount, e.batch_of_funds, e.contractor_name, e.other_remarks,
            e.status_as_of, e.target_completion_date, e.actual_completion_date, e.notice_to_proceed, e.latitude, e.longitude,
            e.construction_start_date, e.project_category, e.scope_of_work,
            e.province, e.city, e.municipality,
            e.number_of_classrooms, e.number_of_storeys, e.number_of_sites, e.funds_utilized,
            e.is_donated, e.program_type, e.status_design_phase, e.procurement_status, e.actions, e.savings, e.funding_year, e.funding_year_justification,
            e.sangguniang_resolution_id, e.mother_moa_id, e.supplamental_moa_id,
            (NULLIF(d.moa_pdf, '') IS NOT NULL) AS has_moa,
            (NULLIF(d.rta_pdf, '') IS NOT NULL) AS has_rta,
            (NULLIF(d.pow_pdf, '') IS NOT NULL) AS has_pow,
            (NULLIF(d.dupa_pdf, '') IS NOT NULL) AS has_dupa,
            (NULLIF(d.contract_pdf, '') IS NOT NULL) AS has_contract,
            e.implementing_agency,
            e.implementing_agency_specific,
            COALESCE(f.tranche_1, 0) as tranche_1,
            COALESCE(f.tranche_2, 0) as tranche_2,
            COALESCE(f.tranche_3, 0) as tranche_3,
            COALESCE(f.liquidated_tranche_1, 0) as liquidated_tranche_1,
            COALESCE(f.liquidated_tranche_2, 0) as liquidated_tranche_2,
            COALESCE(f.liquidated_tranche_3, 0) as liquidated_tranche_3,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(e.ipc, e.school_id || '-' || e.project_name) 
                ORDER BY e.project_id DESC
            ) as rn
          FROM engineer_form e
          LEFT JOIN co_finance f ON e.project_id = f.project_id
          LEFT JOIN school_profiles sp ON e.school_id = sp.school_id
          LEFT JOIN engineer_documents d ON e.project_id = d.project_id
      ),
      LatestProjects AS (
          SELECT * FROM RankedProjects WHERE rn = 1
      )
      SELECT
        p.project_id AS "id", p.school_name AS "schoolName", p.school_name AS "school_name", p.project_name AS "projectName", p.project_name AS "project_name",
        p.school_id AS "schoolId", p.school_id AS "school_id", p.division, p.region, p.province, p.city, p.municipality, p.status AS "status", p.ipc, p.engineer_name AS "engineerName",
        p.accomplishment_percentage AS "accomplishmentPercentage", p.accomplishment_percentage AS "accomplishment_percentage",
        p.previous_percentage AS "previousPercentage",
        p.approved_budget_for_contract AS "projectAllocation", p.approved_budget_for_contract AS "amount", 
        p.contract_amount AS "contractAmount", p.contract_amount AS "contract_amount",
        p.batch_of_funds AS "batchOfFunds",
        p.contractor_name AS "contractorName", p.other_remarks AS "otherRemarks",
        p.status_as_of AS "statusAsOf", p.target_completion_date AS "targetCompletionDate",
        p.actual_completion_date AS "actualCompletionDate", p.notice_to_proceed AS "noticeToProceed",
        p.latitude, p.longitude, p.construction_start_date AS "constructionStartDate",
        p.project_category AS "projectCategory", p.scope_of_work AS "scopeOfWork",
        p.number_of_classrooms AS "numberOfClassrooms", p.number_of_storeys AS "numberOfStoreys",
        p.number_of_sites AS "numberOfSites", p.funds_utilized AS "fundsUtilized",
        p.status_design_phase AS "statusDesignPhase",
        p.procurement_status AS "procurement_status",
        p.actions AS "updateType",
        (p.actions LIKE 'Realignment%') AS "isRealigned",
        p.savings,
        p.funding_year AS "fundingYear",
        p.funding_year AS "funding_year",
        p.funding_year_justification AS "fundingYearJustification",
        p.is_donated AS "isDonated",
        p.is_donated AS "is_donated",
        p.program_type AS "programType",
        p.program_type AS "program_type",
        p.sangguniang_resolution_id AS "sangguniang_resolution_id",
        p.mother_moa_id AS "mother_moa_id",
        p.supplamental_moa_id AS "supplamental_moa_id",
        p.has_moa AS "hasMoa",
        p.has_rta AS "hasRta",
        p.has_pow AS "hasPow",
        p.has_dupa AS "hasDupa",
        p.has_contract AS "hasContract",
        p.implementing_agency AS "implementingAgency",
        p.implementing_agency_specific AS "implementingAgencySpecific",
        p.province, p.city, p.municipality,
        p.tranche_1, p.tranche_2, p.tranche_3,
        p.liquidated_tranche_1, p.liquidated_tranche_2, p.liquidated_tranche_3
      FROM LatestProjects p
    `;

    // 1. ADD FILTER: Robust Jurisdiction Filtering for Division Engineers
    if (engineer_id) {
      const userResult = await pool.query('SELECT role, region, division FROM users WHERE uid = $1', [engineer_id]);
      const userProfile = userResult.rows[0];

      if (userProfile) {
        const role = userProfile.role?.trim().toLowerCase();
        const isAdmin = ['central office', 'hrodi', 'super user', 'super admin', 'admin', 'efd', 'efd engineer', 'hrodi engineer', 'central office finance'].includes(role);
        const isDivEng = ['division engineer', 'sdo', 'ro', 'regional office', 'school division office', 'deped engineer', 'engineer'].includes(role);

        if (isAdmin) {
          // admin/HRODI can see all projects; don't add engineer_id or region/division filters
          console.log(`[AUTH] admin bypass for role: ${role}`);
        } else if (isDivEng) {
          if (userProfile.region) {
            queryParams.push(userProfile.region.trim());
            whereClauses.push(`TRIM(p.region) ILIKE TRIM($${queryParams.length})`);
          }
          if (userProfile.division) {
            queryParams.push(userProfile.division.trim());
            whereClauses.push(`TRIM(p.division) ILIKE TRIM($${queryParams.length})`);
          }
        } else {
          queryParams.push(engineer_id);
          whereClauses.push(`p.engineer_id = $${queryParams.length}`);
        }
      } else {
        queryParams.push(engineer_id);
        whereClauses.push(`p.engineer_id = $${queryParams.length}`);
      }
    } else if (implementing_agency) {
      queryParams.push(implementing_agency);
      whereClauses.push(`p.implementing_agency = $${queryParams.length}`);
    }

    if (req.query.beff === 'true') {
      whereClauses.push(`p.implementing_agency IS NOT NULL`);
    }

    // 2. Add your existing filters
    if (status) {
      queryParams.push(status);
      whereClauses.push(`p.status = $${queryParams.length}`);
    }
    if (region) {
      queryParams.push(region);
      whereClauses.push(`p.region = $${queryParams.length}`);
    }
    if (division) {
      queryParams.push(division);
      whereClauses.push(`p.division = $${queryParams.length}`);
    }
    // NEW: Municipality Filter for LGU
    if (req.query.municipality) {
      queryParams.push(req.query.municipality);
      whereClauses.push(`sp.municipality = $${queryParams.length}`);
    }

    // NEW: Program Type (Donated/BEFF) Filter
    if (is_donated !== undefined && is_donated !== null && is_donated !== '' && is_donated !== 'All') {
      if (is_donated === 'Donated' || is_donated === 'true' || is_donated === true) {
        queryParams.push('Donated');
        whereClauses.push(`p.program_type = $${queryParams.length}`);
      } else if (is_donated === 'Non-Donated' || is_donated === 'false' || is_donated === false || is_donated === 'BEFF') {
        queryParams.push('BEFF');
        whereClauses.push(`p.program_type = $${queryParams.length}`);
      }
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(p.school_name ILIKE $${queryParams.length} OR p.project_name ILIKE $${queryParams.length})`);
    }

    if (sty) {
      queryParams.push(Number(sty));
      whereClauses.push(`p.number_of_storeys = $${queryParams.length}`);
    }
    if (cl) {
      queryParams.push(Number(cl));
      whereClauses.push(`p.number_of_classrooms = $${queryParams.length}`);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    // Get Total Count for Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS total`;
    const countResult = await pool.query(countSql, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY p.project_id DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(sql, queryParams);
    res.json({
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error("âŒ Error fetching projects:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET: Fetch a specific project document on demand
app.get('/api/projects/:id/document/:type', async (req, res) => {
  const { id, type } = req.params;
  const allowedTypes = ['pow_pdf', 'dupa_pdf', 'contract_pdf', 'rta_pdf', 'moa_pdf'];

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid document type requested' });
  }

  try {
    const result = await pool.query(
      `SELECT ${type} as document FROM engineer_form WHERE project_id = $1`,
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ success: true, data: result.rows[0].document });
  } catch (err) {
    console.error(`❌ Error fetching project document (${type}):`, err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================================================================
//         INFINITE-SIZE (2GB+) PDF CHUNKED UPLOADING ROUTES
// ==================================================================

// 1. Receive and Stream Chunk (Local Fallback)
app.post('/api/upload/pdf-chunk', (req, res) => {
  const bb = busboy({ headers: req.headers });
  let uploadMetadata = {};

  bb.on('field', (name, val) => {
    uploadMetadata[name] = val;
  });

  bb.on('file', async (name, file, info) => {
    try {
      const { fileUUID, chunkIndex } = uploadMetadata;
      if (!fileUUID || chunkIndex === undefined) {
        throw new Error("Missing UUID or chunkIndex metadata");
      }

      // Local Fallback: Save chunk as a binary file
      const chunkDir = path.join(process.cwd(), 'api', 'tmp_chunks', fileUUID);
      if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true });
      }

      const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
      const writeStream = fs.createWriteStream(chunkPath);
      file.pipe(writeStream);

      writeStream.on('finish', () => {
        res.status(200).json({ success: true, chunkIndex });
      });

      writeStream.on('error', (err) => {
        throw err;
      });
    } catch (err) {
      console.error(`❌ Chunk Upload Error:`, err.message);
      res.status(500).json({ error: 'Chunk upload failed' });
    }
  });

  bb.on('error', (err) => {
    console.error('Busboy error:', err);
    res.status(500).send('Upload Failed');
  });

  req.pipe(bb);
});

// 2. Finalize Multipart Upload (Concatenate to Base64)
app.post('/api/upload/multipart-finalize', async (req, res) => {
  const { fileUUID, totalChunks, contentType } = req.body;
  if (!fileUUID || !totalChunks) return res.status(400).json({ error: "Missing required metadata" });

  try {
    const chunkDir = path.join(process.cwd(), 'api', 'tmp_chunks', fileUUID);
    if (!fs.existsSync(chunkDir)) {
      throw new Error("Chunk directory not found");
    }

    // Read all chunks in order
    const chunkBuffers = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) throw new Error(`Missing chunk ${i}`);
      chunkBuffers.push(fs.readFileSync(chunkPath));
    }

    // Concatenate all chunks
    const finalBuffer = Buffer.concat(chunkBuffers);

    // Convert to Base64
    const base64Content = finalBuffer.toString('base64');
    const dataUrl = `data:${contentType || 'application/pdf'};base64,${base64Content}`;

    // Cleanup: Remove temporary chunks
    fs.rmSync(chunkDir, { recursive: true, force: true });

    res.status(200).json({
      success: true,
      message: 'Upload complete',
      url: dataUrl // Returning the full data URL to be stored in DB
    });
  } catch (err) {
    console.error(`❌ Finalize Error:`, err.message);
    res.status(500).json({ error: "Failed to merge chunk blocks" });
  }
});
// --- 11f. GET: List Engineers (For EFD Assignment) ---
app.get('/api/engineers', async (req, res) => {
  const { role } = req.query;
  try {
    let query;
    let values = [];

    if (role) {
      query = `
        SELECT uid, first_name AS "firstName", last_name AS "lastName", division, position, region, role 
        FROM users 
        WHERE role = $1
        ORDER BY first_name ASC;
      `;
      values = [role];
    } else {
      query = `
        SELECT uid, first_name AS "firstName", last_name AS "lastName", division, position, region, role 
        FROM users 
        WHERE role = 'DepEd Engineer' OR role = 'Division Engineer' OR role = 'Non-DepEd Engineer'
        ORDER BY first_name ASC;
      `;
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Engineers Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 11g. POST: Assign Project to Engineer (EFD) ---
app.post('/api/assign-project', async (req, res) => {
  const { projectId, engineerId, engineerName } = req.body;

  if (!projectId || !engineerId || !engineerName) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const query = `
      UPDATE engineer_form 
      SET assigned_engineer_id = $1, assigned_engineer_name = $2, date_assigned = CURRENT_TIMESTAMP
      WHERE project_id = $3
      RETURNING project_id;
    `;
    const result = await pool.query(query, [engineerId, engineerName, projectId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    // --- DUAL WRITE: ASSIGN PROJECT ---
    if (poolNew) {
      try {
        await poolNew.query(query, [engineerId, engineerName, projectId]);
      } catch (dwErr) {
        console.error("Dual-Write Error (Assign Project):", dwErr.message);
      }
    }

    res.json({ success: true, message: "Project assigned successfully" });
  } catch (err) {
    console.error("Assign Project Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 11. GET: Get Single Project ---
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        e.*,
        e.project_id AS "id", e.school_name AS "schoolName", e.project_name AS "projectName",
        e.school_id AS "schoolId", e.status_of_construction_phase AS "status", e.ipc,
        e.accomplishment_percentage AS "accomplishmentPercentage",
        e.approved_budget_for_contract AS "projectAllocation", 
        e.contract_amount AS "contractAmount", e.contract_amount AS "contract_amount",
        e.batch_of_funds AS "batchOfFunds",
        e.contractor_name AS "contractorName", e.other_remarks AS "otherRemarks",
        TO_CHAR(e.status_as_of, 'YYYY-MM-DD') AS "statusAsOfDate",
        TO_CHAR(e.target_completion_date, 'YYYY-MM-DD') AS "targetCompletionDate",
        TO_CHAR(e.actual_completion_date, 'YYYY-MM-DD') AS "actualCompletionDate",
        TO_CHAR(e.notice_to_proceed, 'YYYY-MM-DD') AS "noticeToProceed",
        TO_CHAR(e.construction_start_date, 'YYYY-MM-DD') AS "constructionStartDate",
        e.project_category AS "projectCategory", e.scope_of_work AS "scopeOfWork",
        e.number_of_classrooms AS "numberOfClassrooms", e.number_of_storeys AS "numberOfStoreys",
        e.number_of_sites AS "numberOfSites", e.funds_utilized AS "fundsUtilized",
        e.actions AS "updateType",
        (e.actions LIKE 'Realignment%') AS "isRealigned",
        e.funding_year AS "fundingYear",
        e.funding_year AS "funding_year",
        e.is_donated AS "isDonated",
        e.is_donated AS "is_donated",
        d.moa_pdf, d.rta_pdf, d.pow_pdf, d.dupa_pdf, d.contract_pdf,
        (NULLIF(d.moa_pdf, '') IS NOT NULL) AS "hasMoa",
        (NULLIF(d.rta_pdf, '') IS NOT NULL) AS "hasRta",
        e.implementing_agency AS "implementingAgency",
        e.implementing_agency_specific AS "implementingAgencySpecific"
      FROM engineer_form e
      LEFT JOIN engineer_documents d ON e.project_id = d.project_id
      WHERE e.project_id = $1;
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Project not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching project detail:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});
// --- 11b. GET: Get Projects by School ID (For School Head Validation) ---
app.get('/api/projects-by-school-id/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const query = `
      SELECT 
        project_id AS "id", school_name AS "schoolName", project_name AS "projectName",
        school_id AS "schoolId", division, region, status_of_construction_phase AS "status", validation_status_of_construction_phase, ipc,
        validation_remarks AS "validationRemarks", validated_by AS "validatedBy",
        accomplishment_percentage AS "accomplishmentPercentage",
        approved_budget_for_contract AS "approved_budget_for_contract",
        contract_amount AS "contract_amount", contract_amount AS "contractAmount",
        batch_of_funds AS "batchOfFunds",
        contractor_name AS "contractorName", other_remarks AS "otherRemarks",
        TO_CHAR(status_as_of, 'YYYY-MM-DD') AS "statusAsOfDate",
        TO_CHAR(target_completion_date, 'YYYY-MM-DD') AS "targetCompletionDate",
        TO_CHAR(actual_completion_date, 'YYYY-MM-DD') AS "actualCompletionDate",
        TO_CHAR(notice_to_proceed, 'YYYY-MM-DD') AS "noticeToProceed",
        TO_CHAR(construction_start_date, 'YYYY-MM-DD') AS "constructionStartDate",
        project_category AS "projectCategory", scope_of_work AS "scopeOfWork",
        number_of_classrooms AS "numberOfClassrooms", number_of_storeys AS "numberOfStoreys",
        number_of_sites AS "numberOfSites", funds_utilized AS "fundsUtilized",
        (NULLIF(pow_pdf, '') IS NOT NULL) AS "hasPow",
        (NULLIF(dupa_pdf, '') IS NOT NULL) AS "hasDupa",
        (NULLIF(contract_pdf, '') IS NOT NULL) AS "hasContract",
        latitude, longitude,
        actions AS "updateType",
        savings,
        is_donated AS "isDonated",
        is_donated AS "is_donated",
        status_design_phase, contract_id,
        TO_CHAR(date_notice_of_award, 'YYYY-MM-DD') AS "date_notice_of_award",
        TO_CHAR(issuance_of_invitation_to_bid, 'YYYY-MM-DD') AS "issuance_of_invitation_to_bid",
        TO_CHAR(pre_bid_conference, 'YYYY-MM-DD') AS "pre_bid_conference",
        TO_CHAR(opening_of_technical_proposal, 'YYYY-MM-DD') AS "opening_of_technical_proposal",
        TO_CHAR(opening_of_financial_proposal, 'YYYY-MM-DD') AS "opening_of_financial_proposal",
        TO_CHAR(request_for_quotation, 'YYYY-MM-DD') AS "request_for_quotation",
        TO_CHAR(negotiation, 'YYYY-MM-DD') AS "negotiation",
        TO_CHAR(opening_of_quotation, 'YYYY-MM-DD') AS "opening_of_quotation",
        funding_year AS "fundingYear",
        funding_year AS "funding_year",
        funding_year_justification AS "fundingYearJustification"
      FROM engineer_form WHERE TRIM(school_id) = TRIM($1)
      ORDER BY project_id DESC;
    `;
    const result = await pool.query(query, [schoolId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Projects by School Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 11d. DELETE: Delete Project ---
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  const clientNew = poolNew ? await poolNew.connect() : null;

  try {
    await client.query('BEGIN');
    if (clientNew) await clientNew.query('BEGIN');

    // 0. Get the IPC of the project to delete ALL history rows
    const ipcRes = await client.query('SELECT ipc FROM engineer_form WHERE project_id = $1', [id]);
    if (ipcRes.rows.length === 0) {
      throw new Error("Project not found");
    }
    const targetIpc = ipcRes.rows[0].ipc;

    // 1. Delete Documents (by project_id or ipc? project_documents usually uses project_id, but better delete for all related)
    // To be safe, delete docs and images linked to any project_id with this ipc
    const idsRes = await client.query('SELECT project_id FROM engineer_form WHERE ipc = $1', [targetIpc]);
    const projectIds = idsRes.rows.map(r => r.project_id);

    if (projectIds.length > 0) {
      // 1. Delete Documents
      await client.query('DELETE FROM project_documents WHERE project_id = ANY($1::int[])', [projectIds]);
      if (clientNew) await clientNew.query('DELETE FROM project_documents WHERE project_id = ANY($1::int[])', [projectIds]);

      // 2. Delete Images
      await client.query('DELETE FROM engineer_image WHERE project_id = ANY($1::int[]) OR ipc = $2', [projectIds, targetIpc]);
      if (clientNew) await clientNew.query('DELETE FROM engineer_image WHERE project_id = ANY($1::int[]) OR ipc = $2', [projectIds, targetIpc]);
    }

    // 3. Delete Project (All history rows)
    const result = await client.query('DELETE FROM engineer_form WHERE ipc = $1', [targetIpc]);
    if (clientNew) await clientNew.query('DELETE FROM engineer_form WHERE ipc = $1', [targetIpc]);

    await client.query('COMMIT');
    if (clientNew) await clientNew.query('COMMIT');

    res.json({ success: true, message: "Project and all its history deleted successfully" });
  } catch (err) {
    await client.query('ROLLBACK');
    if (clientNew) await clientNew.query('ROLLBACK');
    console.error("Delete Project Error:", err);
    res.status(500).json({ message: "Failed to delete project", error: err.message });
  } finally {
    client.release();
    if (clientNew) clientNew.release();
  }
});

// --- 11c. POST: Validate Project (School Head) ---
app.post('/api/validate-project', async (req, res) => {
  const { projectId, status_of_construction_phase, userUid, userName, remarks } = req.body;
  try {
    const query = `
      UPDATE "engineer_form" 
      SET validation_status = $1, validation_remarks = $3, validated_by = $4
      WHERE project_id = $2;
    `;
    await pool.query(query, [status_of_construction_phase, projectId, remarks || '', userName]);

    await logActivity(
      userUid,
      userName || 'School Head',
      'School Head',
      'VALIDATE',
      `Project ID: ${projectId}`,
      `Marked as ${status}. Remarks: ${remarks || 'None'}`
    );

    res.json({ success: true, message: `Project ${status}` });

    // --- DUAL WRITE: VALIDATE PROJECT ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing Project Validation...");
        await poolNew.query(query, [status_of_construction_phase, projectId, remarks || '', userName]);
        console.log("… Dual-Write: Project Validation Synced!");
      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Validate Project):", dwErr.message);
      }
    }
  } catch (err) {
    console.error("Validation Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 11d. GET: Get Project History by IPC ---
app.get('/api/project-history/:ipc', async (req, res) => {
  const { ipc } = req.params;
  const isLgu = ipc?.startsWith('LGU-');

  try {
    const tableName = isLgu ? "lgu_projects" : "engineer_form";
    const nameColumn = isLgu ? "lgu_name" : "engineer_name";
    const idColumn = isLgu ? "lgu_project_id" : "project_id";
    const statusCol = isLgu ? "project_status" : "status_of_construction_phase";
    const statusAsOfCol = isLgu ? "status_as_of_date" : "status_as_of";

    // Resolve identifier if ipc is a project_id
    let resolvedIpc = ipc;
    let fallbackWhere = isLgu ? `lgu_project_id = $1` : `ipc = $1`;
    
    if (!isLgu && !isNaN(ipc)) {
      const pRes = await pool.query('SELECT ipc, school_id, project_name FROM engineer_form WHERE project_id = $1', [ipc]);
      if (pRes.rows.length > 0) {
        const p = pRes.rows[0];
        if (p.ipc) {
          resolvedIpc = p.ipc;
        } else {
          resolvedIpc = [p.school_id, p.project_name];
          fallbackWhere = `school_id = $1 AND project_name = $2 AND ipc IS NULL`;
        }
      }
    }

    const query = `
      SELECT 
        *,
        ${idColumn} AS "id", 
        other_remarks AS "remarks", 
        ${nameColumn} AS "engineerName", 
        ${statusCol} AS "status", 
        project_name AS "projectName",
        project_category AS "projectCategory",
        scope_of_work AS "scopeOfWork",
        ${isLgu ? 'project_allocation' : 'approved_budget_for_contract'} AS "projectAllocation",
        ${isLgu ? 'NULL' : 'contract_amount'} AS "contractAmount", ${isLgu ? 'NULL' : 'contract_amount'} AS "contract_amount",
        batch_of_funds AS "batchOfFunds",
        contractor_name AS "contractorName",
        number_of_classrooms AS "numberOfClassrooms",
        number_of_storeys AS "numberOfStoreys",
        number_of_sites AS "numberOfSites",
        funds_utilized AS "fundsUtilized",
        TO_CHAR(${statusAsOfCol}, 'YYYY-MM-DD') AS "statusAsOf",
        TO_CHAR(target_completion_date, 'YYYY-MM-DD') AS "targetCompletionDate",
        TO_CHAR(actual_completion_date, 'YYYY-MM-DD') AS "actualCompletionDate",
        TO_CHAR(notice_to_proceed, 'YYYY-MM-DD') AS "noticeToProceed",
        TO_CHAR(construction_start_date, 'YYYY-MM-DD') AS "constructionStartDate",
        status_design_phase, contract_id,
        TO_CHAR(date_notice_of_award, 'YYYY-MM-DD') AS "date_notice_of_award",
        TO_CHAR(issuance_of_invitation_to_bid, 'YYYY-MM-DD') AS "issuance_of_invitation_to_bid",
        TO_CHAR(pre_bid_conference, 'YYYY-MM-DD') AS "pre_bid_conference",
        TO_CHAR(opening_of_technical_proposal, 'YYYY-MM-DD') AS "opening_of_technical_proposal",
        TO_CHAR(opening_of_financial_proposal, 'YYYY-MM-DD') AS "opening_of_financial_proposal",
        TO_CHAR(request_for_quotation, 'YYYY-MM-DD') AS "request_for_quotation",
        TO_CHAR(negotiation, 'YYYY-MM-DD') AS "negotiation",
        TO_CHAR(opening_of_quotation, 'YYYY-MM-DD') AS "opening_of_quotation",
        created_at
      FROM ${tableName}
      WHERE ${fallbackWhere}
      ORDER BY project_id ASC
    `;

    const queryParams = Array.isArray(resolvedIpc) ? resolvedIpc : [resolvedIpc];
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Project History Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 20. POST: Upload Project Image (Base64) ---
app.post('/api/upload-image', (req, res, next) => {
    // Accept multipart/form-data (file upload) OR application/json (legacy Base64 / offline outbox)
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
        projectPhotosUpload.single('image')(req, res, next);
    } else {
        next();
    }
}, async (req, res) => {
  // Determine the image value to store: file path (new) or Base64 (legacy)
  let imageValue;
  if (req.file) {
      imageValue = `/uploads/project_photos/${req.file.filename}`;
  } else {
      imageValue = req.body.imageData;
  }

  const projectId = req.body.projectId;
  const uploadedBy = req.body.uploadedBy;
  const category = req.body.category;

  if (!projectId || !imageValue) return res.status(400).json({ error: "Missing required data" });

  try {
    // 1. Fetch IPC first
    const ipcRes = await pool.query('SELECT ipc FROM engineer_form WHERE project_id = $1', [projectId]);
    const ipc = ipcRes.rows.length > 0 ? ipcRes.rows[0].ipc : null;

    // 2. Resolve Latest Project ID (Fix for Updates)
    let finalProjectId = projectId;
    if (ipc) {
      const latestRes = await pool.query(
        'SELECT project_id FROM engineer_form WHERE ipc = $1 ORDER BY project_id DESC LIMIT 1',
        [ipc]
      );
      if (latestRes.rows.length > 0) {
        finalProjectId = latestRes.rows[0].project_id;
      }
    }

    // 3. Insert with Latest Project ID
    const query = `INSERT INTO engineer_image (project_id, image_data, uploaded_by, category, ipc) VALUES ($1, $2, $3, $4, $5) RETURNING id;`;
    const result = await pool.query(query, [finalProjectId, imageValue, uploadedBy, category || 'Internal', ipc]);

    await logActivity(uploadedBy, 'Engineer', 'Engineer', 'UPLOAD', `Project ID: ${projectId}`, `Uploaded a new site image (${category || 'Internal'})`);
    res.status(201).json({ success: true, imageId: result.rows[0].id });

    // --- Background: optimize image file if saved to disk ---
    if (req.file) {
        const filePath = path.join(__dirname, '..', 'uploads/project_photos', req.file.filename);
        const tmpOut = filePath + '.tmp.jpg';
        const scriptPath = path.resolve(__dirname, '..', 'compress_image.py');
        const cmd = (py) => `${py} "${scriptPath}" "${filePath}" "${tmpOut}"`;
        const tryCompress = async () => {
            for (const py of ['python', 'py', 'python3']) {
                try {
                    await execAsync(cmd(py));
                    fs.renameSync(tmpOut, filePath);
                    console.log(`✅ [BG] Image optimized: ${req.file.filename}`);
                    return;
                } catch (_) {}
            }
            console.warn(`⚠️ [BG] Image compression skipped (Python/Pillow unavailable)`);
            if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
        };
        tryCompress().catch(() => {});
    }

    // --- DUAL WRITE: UPLOAD IMAGE ---
    if (poolNew) {
      try {
        if (ipc) {
          const dwQuery = `
                INSERT INTO engineer_image (project_id, image_data, uploaded_by, category, ipc)
                VALUES ((SELECT project_id FROM engineer_form WHERE ipc = $1 ORDER BY project_id DESC LIMIT 1), $2, $3, $4, $1);
            `;
          await poolNew.query(dwQuery, [ipc, imageValue, uploadedBy, category || 'Internal']);
        }
      } catch (dwErr) {
        console.error("❌ Dual-Write Error (Upload Image):", dwErr.message);
      }
    }
  } catch (err) {
    console.error("❌ Image Upload Error:", err.message);
    res.status(500).json({ error: "Failed to save image to database" });
  }
});

// --- 20b. POST: Upload Project Document (Append Version) ---
app.post('/api/upload-project-document', async (req, res) => {
  const { projectId, type, base64, uid } = req.body;

  console.log(`📂 Incoming Doc Upload: [${type}] for Project [${projectId}]`);

  if (!projectId || !type || !base64) {
    return res.status(400).json({ error: "Missing required data" });
  }

  let column = '';
  if (type === 'POW') column = 'pow_pdf';
  else if (type === 'DUPA') column = 'dupa_pdf';
  else if (type === 'CONTRACT') column = 'contract_pdf';
  else if (type === 'RTA') column = 'rta_pdf';
  else if (type === 'MOA') column = 'moa_pdf';
  else return res.status(400).json({ error: "Invalid document type" });

  let client;
  try {
    client = await pool.connect();

    // 1. Get the IPC from engineer_form to ensure consistent records
    const projectRes = await client.query('SELECT ipc FROM engineer_form WHERE project_id = $1', [parseInt(projectId)]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const { ipc } = projectRes.rows[0];

    // 2. UPSERT into engineer_documents
    const upsertQuery = `
      INSERT INTO engineer_documents (project_id, ipc, ${column}, uploader_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id) 
      DO UPDATE SET 
        ${column} = EXCLUDED.${column},
        uploader_id = EXCLUDED.uploader_id,
        created_at = CURRENT_TIMESTAMP
      RETURNING project_id;
    `;

    const result = await client.query(upsertQuery, [parseInt(projectId), ipc, base64, uid]);

    console.log(`✅ Updated ${type} in engineer_documents for project_id ${projectId}`);

    // --- DUAL WRITE ---
    if (poolNew) {
      try {
        await poolNew.query(upsertQuery, [parseInt(projectId), ipc, base64, uid]);
        console.log(`✅ Dual-Write: ${type} UPSERT Synced!`);
      } catch (dwErr) {
        console.error("❌ Dual-Write Doc UPSERT Error:", dwErr.message);
      }
    }

    res.json({ success: true, projectId: projectId });
  } catch (err) {
    console.error("❌ Doc Upload Error:", err.message);
    res.status(500).json({ error: "Failed to save document" });
  } finally {
    if (client) client.release();
  }
});

// --- UNIT 1: Nexus Ownership Document Upload ---
app.post('/api/schools/:iern/ownership-docs', upload.single('file'), async (req, res) => {
  try {
    const { iern } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = `/uploads/${req.file.filename}`;
    const docId = `doc_${Date.now()}_${iern}`;
    
    res.json({
      success: true,
      data: {
        id: docId,
        filePath: filePath
      }
    });
  } catch (error) {
    console.error("Ownership Doc Upload Error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

app.delete('/api/schools/:iern/ownership-docs/:id', async (req, res) => {
  try {
    // Return success to allow frontend to remove the reference in its state.
    res.json({ success: true, message: "Document mapping removed" });
  } catch (error) {
    console.error("Ownership Doc Delete Error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// --- NEW BLUK UPLOAD ENDPOINT TO PREVENT DUPLICATES ---
const bulkUploadFields = upload.fields([
  { name: 'POW', maxCount: 1 },
  { name: 'DUPA', maxCount: 1 },
  { name: 'CONTRACT', maxCount: 1 },
  { name: 'RTA', maxCount: 1 },
  { name: 'MOA', maxCount: 1 }
]);

app.post('/api/bulk-upload-project-documents', bulkUploadFields, async (req, res) => {
  const { projectId, uid } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: "Missing required project ID" });
  }

  try {
    const projectRes = await pool.query('SELECT ipc FROM engineer_form WHERE project_id = $1', [parseInt(projectId)]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const { ipc } = projectRes.rows[0];

    // Response immediately to avoid timeout
    res.status(200).json({ 
      success: true, 
      projectId: projectId, 
      message: "Sync started. Documents are being optimized in the background." 
    });

    // Process files in background
    if (req.files) {
      ['POW', 'DUPA', 'CONTRACT', 'RTA', 'MOA'].forEach(type => {
        if (req.files[type] && req.files[type][0]) {
          processPdfInBackground(req.files[type][0], projectId, type, ipc, uid, false);
        }
      });
    }
  } catch (err) {
    console.error("❌ Bulk Upload Error:", err.message);
    if (!res.headersSent) {
        res.status(500).json({ error: "Failed to initiate bulk upload" });
    }
  }
});

// --- LGU Bulk Document Upload Support ---
app.post('/api/lgu/bulk-upload-project-documents', bulkUploadFields, async (req, res) => {
  const { projectId, uid } = req.body;

  if (!projectId) return res.status(400).json({ error: "Missing required project ID" });

  try {
    const projectRes = await pool.query('SELECT ipc FROM lgu_forms WHERE project_id = $1', [parseInt(projectId)]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: "LGU Project not found" });
    }
    const { ipc } = projectRes.rows[0];

    // Respond immediately
    res.status(200).json({ 
      success: true, 
      projectId: projectId, 
      message: "LGU Documents optimization started in background." 
    });

    // Background process for each file
    if (req.files) {
      ['POW', 'DUPA', 'CONTRACT', 'RTA', 'MOA'].forEach(type => {
        if (req.files[type] && req.files[type][0]) {
          processPdfInBackground(req.files[type][0], projectId, type, ipc, uid, true);
        }
      });
    }
  } catch (err) {
    console.error("❌ LGU Bulk Upload Error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to initiate LGU bulk upload" });
    }
  }
});


// --- 21. GET: Fetch Project Images (Active) ---



app.get('/api/project-images/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    // Fetch via IPC column directly (much faster and cleaner)
    // We first need the IPC of the requested project

    const query = `
      SELECT id, uploaded_by, created_at, image_data, category, ipc 
      FROM engineer_image 
      WHERE ipc = (
          SELECT ipc FROM engineer_form WHERE project_id = $1
      ) 
      OR project_id = $1 -- Fallback for old images before migration if backfill missed anything (unlikely)
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [projectId]);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching project images:", err.message);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// --- 21b. GET: Fetch Single Image Content (BLOB) ---
app.get('/api/image/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `SELECT image_data FROM engineer_image WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json({ id, image_data: result.rows[0].image_data });
  } catch (err) {
    console.error("âŒ Error fetching image blob:", err.message);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

// --- 22. GET: Fetch All Images for an Engineer (METADATA ONLY) ---
app.get('/api/engineer-images/:engineerId', async (req, res) => {
  const { engineerId } = req.params;
  try {
    // OPTIMIZATION: Removed image_data, added id for on-demand fetch
    const query = `
      SELECT ei.id, ei.created_at, ef.school_name 
      FROM engineer_image ei
      LEFT JOIN engineer_form ef ON ei.project_id = ef.project_id
      WHERE ei.uploaded_by = $1 
      ORDER BY ei.created_at DESC;
    `;
    const result = await pool.query(query, [engineerId]);
    res.json(result.rows);
  } catch (err) {
    console.error("âŒ Error fetching engineer gallery:", err.message);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

// --- 15. GET: Get Organized Classes Data ---
app.get('/api/organized-classes/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    // Fetch offering AND class counts from the SAME table
    const query = `
            SELECT 
                school_id, school_name, curricular_offering,
                classes_kinder, classes_grade_1, classes_grade_2, classes_grade_3,
                classes_grade_4, classes_grade_5, classes_grade_6,
                classes_grade_7, classes_grade_8, classes_grade_9, classes_grade_10,
                classes_grade_11, classes_grade_12, multigrade_classes,
                
                cnt_less_kinder, cnt_within_kinder, cnt_above_kinder,
                cnt_less_g1, cnt_within_g1, cnt_above_g1,
                cnt_less_g2, cnt_within_g2, cnt_above_g2,
                cnt_less_g3, cnt_within_g3, cnt_above_g3,
                cnt_less_g4, cnt_within_g4, cnt_above_g4,
                cnt_less_g5, cnt_within_g5, cnt_above_g5,
                cnt_less_g6, cnt_within_g6, cnt_above_g6,
                cnt_less_g7, cnt_within_g7, cnt_above_g7,
                cnt_less_g8, cnt_within_g8, cnt_above_g8,
                cnt_less_g9, cnt_within_g9, cnt_above_g9,
                cnt_less_g10, cnt_within_g10, cnt_above_g10,
                cnt_less_g11, cnt_within_g11, cnt_above_g11,
                cnt_less_g12, cnt_within_g12, cnt_above_g12
            FROM school_profiles 
            WHERE submitted_by = $1
        `;

    const result = await pool.query(query, [uid]);

    if (result.rows.length === 0) return res.json({ exists: false });

    // Return structured data for the frontend
    const row = result.rows[0];
    res.json({
      exists: true,
      schoolId: row.school_id,
      offering: row.curricular_offering,
      data: {
        kinder: row.classes_kinder,
        grade_1: row.classes_grade_1, grade_2: row.classes_grade_2,
        grade_3: row.classes_grade_3, grade_4: row.classes_grade_4,
        grade_5: row.classes_grade_5, grade_6: row.classes_grade_6,
        grade_7: row.classes_grade_7, grade_8: row.classes_grade_8,
        grade_9: row.classes_grade_9, grade_10: row.classes_grade_10,
        grade_11: row.classes_grade_11, grade_12: row.classes_grade_12,

        cnt_less_kinder: row.cnt_less_kinder, cnt_within_kinder: row.cnt_within_kinder, cnt_above_kinder: row.cnt_above_kinder,
        cnt_less_g1: row.cnt_less_g1, cnt_within_g1: row.cnt_within_g1, cnt_above_g1: row.cnt_above_g1,
        cnt_less_g2: row.cnt_less_g2, cnt_within_g2: row.cnt_within_g2, cnt_above_g2: row.cnt_above_g2,
        cnt_less_g3: row.cnt_less_g3, cnt_within_g3: row.cnt_within_g3, cnt_above_g3: row.cnt_above_g3,
        cnt_less_g4: row.cnt_less_g4, cnt_within_g4: row.cnt_within_g4, cnt_above_g4: row.cnt_above_g4,
        cnt_less_g5: row.cnt_less_g5, cnt_within_g5: row.cnt_within_g5, cnt_above_g5: row.cnt_above_g5,
        cnt_less_g6: row.cnt_less_g6, cnt_within_g6: row.cnt_within_g6, cnt_above_g6: row.cnt_above_g6,
        cnt_less_g7: row.cnt_less_g7, cnt_within_g7: row.cnt_within_g7, cnt_above_g7: row.cnt_above_g7,
        cnt_less_g8: row.cnt_less_g8, cnt_within_g8: row.cnt_within_g8, cnt_above_g8: row.cnt_above_g8,
        cnt_less_g9: row.cnt_less_g9, cnt_within_g9: row.cnt_within_g9, cnt_above_g9: row.cnt_above_g9,
        cnt_less_g10: row.cnt_less_g10, cnt_within_g10: row.cnt_within_g10, cnt_above_g10: row.cnt_above_g10,
        cnt_less_g11: row.cnt_less_g11, cnt_within_g11: row.cnt_within_g11, cnt_above_g11: row.cnt_above_g11,
        cnt_less_g12: row.cnt_less_g12, cnt_within_g12: row.cnt_within_g12, cnt_above_g12: row.cnt_above_g12,
        multigrade_classes: typeof row.multigrade_classes === 'string' ? JSON.parse(row.multigrade_classes) : (row.multigrade_classes || [])
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// --- 16. POST: Save Organized Classes (UPDATED) ---
// --- 16. POST: Save Organized Classes (UPDATED with Class Size Standards) ---
app.post('/api/save-organized-classes', async (req, res) => {
  const data = req.body;
  try {
    const query = `
            UPDATE school_profiles SET
                classes_kinder = $2, 
                classes_grade_1 = $3, classes_grade_2 = $4, classes_grade_3 = $5,
                classes_grade_4 = $6, classes_grade_5 = $7, classes_grade_6 = $8,
                classes_grade_7 = $9, classes_grade_8 = $10, classes_grade_9 = $11,
                classes_grade_10 = $12, classes_grade_11 = $13, classes_grade_12 = $14,
                
                cnt_less_kinder = $51, cnt_within_kinder = $52, cnt_above_kinder = $53,
                cnt_less_g1 = $15, cnt_within_g1 = $16, cnt_above_g1 = $17,
                cnt_less_g2 = $18, cnt_within_g2 = $19, cnt_above_g2 = $20,
                cnt_less_g3 = $21, cnt_within_g3 = $22, cnt_above_g3 = $23,
                cnt_less_g4 = $24, cnt_within_g4 = $25, cnt_above_g4 = $26,
                cnt_less_g5 = $27, cnt_within_g5 = $28, cnt_above_g5 = $29,
                cnt_less_g6 = $30, cnt_within_g6 = $31, cnt_above_g6 = $32,
                cnt_less_g7 = $33, cnt_within_g7 = $34, cnt_above_g7 = $35,
                cnt_less_g8 = $36, cnt_within_g8 = $37, cnt_above_g8 = $38,
                cnt_less_g9 = $39, cnt_within_g9 = $40, cnt_above_g9 = $41,
                cnt_less_g10 = $42, cnt_within_g10 = $43, cnt_above_g10 = $44,
                cnt_less_g11 = $45, cnt_within_g11 = $46, cnt_above_g11 = $47,
                cnt_less_g12 = $48, cnt_within_g12 = $49, cnt_above_g12 = $50,
                multigrade_classes = $54,

                updated_at = CURRENT_TIMESTAMP
            WHERE school_id = $1
        `;

    const result = await pool.query(query, [
      data.schoolId,
      data.kinder,
      data.g1, data.g2, data.g3, data.g4, data.g5, data.g6,
      data.g7, data.g8, data.g9, data.g10,
      data.g11, data.g12,

      data.cntLessG1 || 0, data.cntWithinG1 || 0, data.cntAboveG1 || 0,
      data.cntLessG2 || 0, data.cntWithinG2 || 0, data.cntAboveG2 || 0,
      data.cntLessG3 || 0, data.cntWithinG3 || 0, data.cntAboveG3 || 0,
      data.cntLessG4 || 0, data.cntWithinG4 || 0, data.cntAboveG4 || 0,
      data.cntLessG5 || 0, data.cntWithinG5 || 0, data.cntAboveG5 || 0,
      data.cntLessG6 || 0, data.cntWithinG6 || 0, data.cntAboveG6 || 0,
      data.cntLessG7 || 0, data.cntWithinG7 || 0, data.cntAboveG7 || 0,
      data.cntLessG8 || 0, data.cntWithinG8 || 0, data.cntAboveG8 || 0,
      data.cntLessG9 || 0, data.cntWithinG9 || 0, data.cntAboveG9 || 0,
      data.cntLessG10 || 0, data.cntWithinG10 || 0, data.cntAboveG10 || 0,
      data.cntLessG11 || 0, data.cntWithinG11 || 0, data.cntAboveG11 || 0,
      data.cntLessG12 || 0, data.cntWithinG12 || 0, data.cntAboveG12 || 0,

      data.cntLessKinder || 0, data.cntWithinKinder || 0, data.cntAboveKinder || 0,

      JSON.stringify(data.multigradeClasses) || '[]'
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "School Profile not found (Check School ID)" });
    }

    res.json({ message: "Classes saved successfully!" });
    // SNAPSHOT UPDATE (Primary)
    await calculateSchoolProgress(data.schoolId, pool);

    // --- DUAL WRITE: SAVE ORGANIZED CLASSES ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing Organized Classes...");
        // 1. Replay Update
        await poolNew.query(query, [
          data.schoolId,
          data.kinder,
          data.g1, data.g2, data.g3, data.g4, data.g5, data.g6,
          data.g7, data.g8, data.g9, data.g10,
          data.g11, data.g12,

          data.cntLessG1 || 0, data.cntWithinG1 || 0, data.cntAboveG1 || 0,
          data.cntLessG2 || 0, data.cntWithinG2 || 0, data.cntAboveG2 || 0,
          data.cntLessG3 || 0, data.cntWithinG3 || 0, data.cntAboveG3 || 0,
          data.cntLessG4 || 0, data.cntWithinG4 || 0, data.cntAboveG4 || 0,
          data.cntLessG5 || 0, data.cntWithinG5 || 0, data.cntAboveG5 || 0,
          data.cntLessG6 || 0, data.cntWithinG6 || 0, data.cntAboveG6 || 0,
          data.cntLessG7 || 0, data.cntWithinG7 || 0, data.cntAboveG7 || 0,
          data.cntLessG8 || 0, data.cntWithinG8 || 0, data.cntAboveG8 || 0,
          data.cntLessG9 || 0, data.cntWithinG9 || 0, data.cntAboveG9 || 0,
          data.cntLessG10 || 0, data.cntWithinG10 || 0, data.cntAboveG10 || 0,
          data.cntLessG11 || 0, data.cntWithinG11 || 0, data.cntAboveG11 || 0,
          data.cntLessG12 || 0, data.cntWithinG12 || 0, data.cntAboveG12 || 0,

          data.cntLessKinder || 0, data.cntWithinKinder || 0, data.cntAboveKinder || 0,

          JSON.stringify(data.multigradeClasses) || '[]'
        ]);

        // 2. Snapshot Update (Secondary)
        await calculateSchoolProgress(data.schoolId, poolNew);
        console.log("… Dual-Write: Organized Classes Synced!");

      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Organized Classes):", dwErr.message);
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- 17. GET: Get Teaching Personnel Data ---
app.get('/api/teaching-personnel/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const query = `
            SELECT 
                school_id, school_name, curricular_offering,
                teach_kinder, teach_g1, teach_g2, teach_g3, teach_g4, teach_g5, teach_g6,
                teach_g7, teach_g8, teach_g9, teach_g10,
                teach_g11, teach_g12,
                teach_multi_1_2, teach_multi_3_4, teach_multi_5_6, teach_multi_3plus_flag, teach_multi_3plus_count,
                
                -- Experience
                teach_exp_0_1, teach_exp_2_5, teach_exp_6_10,
                teach_exp_11_15, teach_exp_16_20, teach_exp_21_25,
                teach_exp_26_30, teach_exp_31_35, teach_exp_36_40,
                teach_exp_40_45,

                -- Departmentalized
                dept_english, dept_filipino, dept_science, dept_math, dept_ap,
                dept_mapeh, dept_tle, dept_values, dept_gen_ed, dept_ece, dept_others, non_advisory, sned_teachers
            FROM school_profiles 
            WHERE submitted_by = $1
        `;

    const result = await pool.query(query, [uid]);

    if (result.rows.length === 0) return res.json({ exists: false });

    const row = result.rows[0];
    res.json({
      exists: true,
      schoolId: row.school_id,
      offering: row.curricular_offering,
      data: {
        teach_kinder: row.teach_kinder,
        teach_g1: row.teach_g1, teach_g2: row.teach_g2, teach_g3: row.teach_g3,
        teach_g4: row.teach_g4, teach_g5: row.teach_g5, teach_g6: row.teach_g6,
        teach_g7: row.teach_g7, teach_g8: row.teach_g8, teach_g9: row.teach_g9, teach_g10: row.teach_g10,
        teach_g11: row.teach_g11, teach_g12: row.teach_g12,
        teach_multi_1_2: row.teach_multi_1_2, teach_multi_3_4: row.teach_multi_3_4, teach_multi_5_6: row.teach_multi_5_6,
        teach_multi_3plus_flag: row.teach_multi_3plus_flag,
        teach_multi_3plus_count: row.teach_multi_3plus_count,

        // Experience
        teach_exp_0_1: row.teach_exp_0_1,
        teach_exp_2_5: row.teach_exp_2_5,
        teach_exp_6_10: row.teach_exp_6_10,
        teach_exp_11_15: row.teach_exp_11_15,
        teach_exp_16_20: row.teach_exp_16_20,
        teach_exp_21_25: row.teach_exp_21_25,
        teach_exp_26_30: row.teach_exp_26_30,
        teach_exp_31_35: row.teach_exp_31_35,
        teach_exp_36_40: row.teach_exp_36_40,
        teach_exp_40_45: row.teach_exp_40_45,

        // Departmentalized
        dept_english: row.dept_english,
        dept_filipino: row.dept_filipino,
        dept_science: row.dept_science,
        dept_math: row.dept_math,
        dept_ap: row.dept_ap,
        dept_mapeh: row.dept_mapeh,
        dept_tle: row.dept_tle,
        dept_values: row.dept_values,
        dept_gen_ed: row.dept_gen_ed,
        dept_ece: row.dept_ece,
        dept_others: row.dept_others,
        non_advisory: row.non_advisory,
        sned_teachers: row.sned_teachers
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// --- 18. POST: Save Teaching Personnel ---
// api/index.js

app.post('/api/save-teaching-personnel', async (req, res) => {
  const d = req.body;

  // Logging to verify what the backend "sees"
  console.log("“¥ RECEIVED TEACHING PERSONNEL DATA:", JSON.stringify(d, null, 2));
  console.log("Saving for UID:", d.uid);

  try {
    const query = `
            UPDATE school_profiles 
            SET 
                teach_kinder = $2::INT, teach_g1 = $3::INT, teach_g2 = $4::INT, 
                teach_g3 = $5::INT, teach_g4 = $6::INT, teach_g7 = $7::INT, 
                teach_g8 = $8::INT, teach_g9 = $9::INT, teach_g10 = $10::INT, 
                teach_g11 = $11::INT, teach_g12 = $12::INT, teach_g5 = $13::INT, 
                teach_g6 = $14::INT,
                teach_multi_1_2 = $15::INT, teach_multi_3_4 = $16::INT, teach_multi_5_6 = $17::INT,
                teach_multi_3plus_flag = $18::BOOLEAN,
                teach_multi_3plus_count = $19::INT,
                
                -- Auto-Calculated Summaries
                teachers_es = $30::INT,
                teachers_jhs = $31::INT,
                teachers_shs = $32::INT,

                -- Experience Fields
                teach_exp_0_1 = $20::INT, teach_exp_2_5 = $21::INT, teach_exp_6_10 = $22::INT,
                teach_exp_11_15 = $23::INT, teach_exp_16_20 = $24::INT, teach_exp_21_25 = $25::INT,
                teach_exp_26_30 = $26::INT, teach_exp_31_35 = $27::INT, teach_exp_36_40 = $28::INT,
                teach_exp_40_45 = $29::INT,

                -- Departmentalized Teachers
                dept_english = $33::INT, dept_filipino = $34::INT, dept_science = $35::INT,
                dept_math = $36::INT, dept_ap = $37::INT, dept_mapeh = $38::INT,
                dept_tle = $39::INT, dept_values = $40::INT, dept_gen_ed = $41::INT,
                dept_ece = $42::INT, dept_others = $43::INT, non_advisory = $44::INT, sned_teachers = $45::INT,

                updated_at = CURRENT_TIMESTAMP
            WHERE TRIM(submitted_by) = TRIM($1)
            RETURNING school_id;
        `;

    // --- AUTO-CALCULATION LOGIC ---
    const t_es = (parseInt(d.teach_kinder) || 0) + (parseInt(d.teach_g1) || 0) + (parseInt(d.teach_g2) || 0) +
      (parseInt(d.teach_g3) || 0) + (parseInt(d.teach_g4) || 0) + (parseInt(d.teach_g5) || 0) + (parseInt(d.teach_g6) || 0) +
      (parseInt(d.teach_multi_1_2) || 0) + (parseInt(d.teach_multi_3_4) || 0) + (parseInt(d.teach_multi_5_6) || 0) + (parseInt(d.teach_multi_3plus_count) || 0);

    const t_jhs = (parseInt(d.teach_g7) || 0) + (parseInt(d.teach_g8) || 0) + (parseInt(d.teach_g9) || 0) + (parseInt(d.teach_g10) || 0);

    const t_shs = (parseInt(d.teach_g11) || 0) + (parseInt(d.teach_g12) || 0);

    const values = [
      d.uid,                          // $1
      d.teach_kinder || 0, d.teach_g1 || 0, d.teach_g2 || 0,
      d.teach_g3 || 0, d.teach_g4 || 0, d.teach_g7 || 0,
      d.teach_g8 || 0, d.teach_g9 || 0, d.teach_g10 || 0,
      d.teach_g11 || 0, d.teach_g12 || 0, d.teach_g5 || 0,
      d.teach_g6 || 0,
      d.teach_multi_1_2 || 0, d.teach_multi_3_4 || 0, d.teach_multi_5_6 || 0,
      d.teach_multi_3plus_flag || false,
      d.teach_multi_3plus_count || 0,
      // Experience Values (20-29)
      d.teach_exp_0_1 || 0, d.teach_exp_2_5 || 0, d.teach_exp_6_10 || 0, // 20-22
      d.teach_exp_11_15 || 0, d.teach_exp_16_20 || 0, d.teach_exp_21_25 || 0, // 23-25
      d.teach_exp_26_30 || 0, d.teach_exp_31_35 || 0, d.teach_exp_36_40 || 0, // 26-28
      d.teach_exp_40_45 || 0, // 29

      // Calculated Values (30-32)
      t_es, t_jhs, t_shs,

      // Departmentalized (33-43)
      d.dept_english || 0, d.dept_filipino || 0, d.dept_science || 0,
      d.dept_math || 0, d.dept_ap || 0, d.dept_mapeh || 0,
      d.dept_tle || 0, d.dept_values || 0, d.dept_gen_ed || 0,
      d.dept_ece || 0, d.dept_others || 0, d.non_advisory || 0,
      d.sned_teachers || 0
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      console.error("âŒ SQL matched 0 rows for UID:", d.uid);
      return res.status(404).json({ error: "No matching record found in Database." });
    }

    console.log("… Record Updated Successfully for School:", result.rows[0].school_id);
    await calculateSchoolProgress(result.rows[0].school_id, pool); // SNAPSHOT UPDATE (Primary)

    // --- DUAL WRITE: TEACHING PERSONNEL ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing Teaching Personnel...");
        await poolNew.query(query, values);
        // Snapshot secondary
        await calculateSchoolProgress(result.rows[0].school_id, poolNew);
        console.log("… Dual-Write: Teaching Personnel Synced!");
      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Teaching Personnel):", dwErr.message);
      }
    }

    res.json({ success: true });


  } catch (err) {
    console.error("âŒ Database Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- 19. GET: Get Learning Modalities (From School Profile) ---
app.get('/api/learning-modalities/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const query = `
            SELECT * FROM school_profiles WHERE submitted_by = $1
        `;
    const result = await pool.query(query, [uid]);

    if (result.rows.length === 0) return res.json({ exists: false });

    const row = result.rows[0];
    res.json({
      exists: true,
      schoolId: row.school_id,
      offering: row.curricular_offering,
      data: row // We just send the whole row, frontend picks what it needs
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// --- 20. POST: Save Learning Modalities (Update School Profile) ---
app.post('/api/save-learning-modalities', async (req, res) => {
  const data = req.body;
  try {
    const query = `
            UPDATE school_profiles SET
                shift_kinder = $2, shift_g1 = $3, shift_g2 = $4, shift_g3 = $5, shift_g4 = $6, shift_g5 = $7, shift_g6 = $8,
                shift_g7 = $9, shift_g8 = $10, shift_g9 = $11, shift_g10 = $12, shift_g11 = $13, shift_g12 = $14,

                mode_kinder = $15, mode_g1 = $16, mode_g2 = $17, mode_g3 = $18, mode_g4 = $19, mode_g5 = $20, mode_g6 = $21,
                mode_g7 = $22, mode_g8 = $23, mode_g9 = $24, mode_g10 = $25, mode_g11 = $26, mode_g12 = $27,

                adm_mdl = $28, adm_odl = $29, adm_tvi = $30, adm_blended = $31, adm_others = $32,
                updated_at = CURRENT_TIMESTAMP
            WHERE school_id = $1
        `;

    await pool.query(query, [
      data.schoolId,
      data.shift_kinder, data.shift_g1, data.shift_g2, data.shift_g3, data.shift_g4, data.shift_g5, data.shift_g6,
      data.shift_g7, data.shift_g8, data.shift_g9, data.shift_g10, data.shift_g11, data.shift_g12,

      data.mode_kinder, data.mode_g1, data.mode_g2, data.mode_g3, data.mode_g4, data.mode_g5, data.mode_g6,
      data.mode_g7, data.mode_g8, data.mode_g9, data.mode_g10, data.mode_g11, data.mode_g12,

      data.adm_mdl, data.adm_odl, data.adm_tvi, data.adm_blended, data.adm_others
    ]);

    res.json({ message: "Modalities saved successfully!" });
    // SNAPSHOT UPDATE (Primary)
    await calculateSchoolProgress(data.schoolId, pool);

    // --- DUAL WRITE: LEARNING MODALITIES ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing Learning Modalities...");
        await poolNew.query(query, [
          data.schoolId,
          data.shift_kinder, data.shift_g1, data.shift_g2, data.shift_g3, data.shift_g4, data.shift_g5, data.shift_g6,
          data.shift_g7, data.shift_g8, data.shift_g9, data.shift_g10, data.shift_g11, data.shift_g12,

          data.mode_kinder, data.mode_g1, data.mode_g2, data.mode_g3, data.mode_g4, data.mode_g5, data.mode_g6,
          data.mode_g7, data.mode_g8, data.mode_g9, data.mode_g10, data.mode_g11, data.mode_g12,

          data.adm_mdl, data.adm_odl, data.adm_tvi, data.adm_blended, data.adm_others
        ]);
        await calculateSchoolProgress(data.schoolId, poolNew);
        console.log("… Dual-Write: Learning Modalities Synced!");
      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Learning Modalities):", dwErr.message);
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- 21. GET: School Resources Data ---
app.get('/api/school-resources/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE submitted_by = $1', [uid]);
    if (result.rows.length === 0) return res.json({ exists: false });
    res.json({ exists: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 21a. GET: Check Legacy Specialization Data ---
app.get('/api/check-legacy-specialization/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query(
      `SELECT 
        spec_general_teaching, spec_ece_teaching, spec_english_major, spec_filipino_major,
        spec_math_major, spec_science_major, spec_ap_major, spec_tle_major,
        spec_mapeh_major, spec_esp_major, spec_bio_sci_major, spec_phys_sci_major,
        spec_agri_fishery_major, spec_others_major
       FROM school_profiles WHERE school_id = $1`,
      [schoolId]
    );

    if (result.rows.length === 0) {
      return res.json({ hasLegacyData: false });
    }

    const row = result.rows[0];
    const hasData = Object.values(row).some(val => (val || 0) > 0);

    res.json({ hasLegacyData: hasData });
  } catch (err) {
    console.error("Check Legacy Spec Error:", err);
    res.status(500).json({ error: "Failed to check legacy data" });
  }
});

// --- 21b. POST: Single Teacher Upsert (Fast Auto-Save) ---
app.post('/api/save-single-teacher', async (req, res) => {
  const { schoolId, teacher } = req.body;
  if (!schoolId || !teacher || !teacher.control_num) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // UPSERT Logic
    await client.query(`
      INSERT INTO teacher_specialization_details (
        control_num, school_id, full_name, position, position_group, 
        specialization, teaching_load, iern, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
      ON CONFLICT (control_num) 
      DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        position = EXCLUDED.position,
        specialization = EXCLUDED.specialization,
        teaching_load = EXCLUDED.teaching_load,
        status = 'ACTIVE'
    `, [
      teacher.control_num,
      schoolId,
      teacher.full_name,
      teacher.position,
      teacher.position_group || 'TBD',
      teacher.specialization,
      teacher.teaching_load || 0,
      teacher.iern || null
    ]);

    await client.query('COMMIT');
    res.json({ success: true, message: "Teacher saved" });

    // Background: Update Progress (Fire and Forget)
    calculateSchoolProgress(schoolId, pool).catch(err => console.error("Background Progress Calc Error:", err));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Single Teacher Save Error:", err);
    res.status(500).json({ error: "Failed to save teacher" });
  } finally {
    client.release();
  }
});

// --- 21c. DELETE: Remove Teacher Personnel ---
app.delete('/api/delete-teacher-personnel/:schoolId/:controlNum', async (req, res) => {
  const { schoolId, controlNum } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM teacher_specialization_details WHERE school_id = $1 AND control_num = $2 RETURNING *',
      [schoolId, controlNum]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Teacher not found or already deleted" });
    }

    res.json({ success: true, message: "Teacher deleted successfully" });

    // Background: Update Progress
    calculateSchoolProgress(schoolId, pool).catch(err => console.error("Background Progress Calc Error:", err));

  } catch (err) {
    console.error("Delete Teacher Error:", err);
    res.status(500).json({ error: "Failed to delete teacher" });
  }
});

// --- 21b. GET: Fetch e-Cart Batches ---
app.get('/api/ecart-batches/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // Attempt to find IERN first
    const sRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
    const iern = sRes.rows[0]?.iern;

    let result;
    if (iern) {
      result = await pool.query('SELECT * FROM ecart_batches WHERE iern = $1 OR school_id = $2 ORDER BY id ASC', [iern, schoolId]);
    } else {
      result = await pool.query('SELECT * FROM ecart_batches WHERE school_id = $1 ORDER BY id ASC', [schoolId]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch e-Cart Batches Error:', err);
    res.status(500).json({ error: 'Failed to fetch e-Cart batches' });
  }
});

// --- 22. POST: Save School Resources ---
app.post('/api/save-school-resources', async (req, res) => {
  const data = req.body;
  try {
    // Handle IERN identity anchoring
    let anchorClause = 'school_id = $1';
    let anchorVal = data.schoolId;
    if (data.iern) {
        anchorClause = 'iern = $1';
        anchorVal = data.iern;
    }

    const query = `
            UPDATE school_profiles SET 
                res_water_source=$2, res_tvl_workshops=$3, res_electricity_source=$4, 
                res_buildable_space=$5, sha_category=$6,
                
                res_sci_labs=$7, res_com_labs=$8,
                
                res_ecart_func=$9, res_ecart_nonfunc=$10,
                res_laptop_func=$11, res_laptop_nonfunc=$12,
                res_tv_func=$13, res_tv_nonfunc=$14,
                res_printer_func=$15, res_printer_nonfunc=$16,
                res_desk_func=$17, res_desk_nonfunc=$18,
                res_armchair_func=$19, res_armchair_nonfunc=$20,
                res_handwash_func=$21, res_handwash_nonfunc=$22,
                
                seats_kinder=$23, seats_grade_1=$24, seats_grade_2=$25, seats_grade_3=$26,
                seats_grade_4=$27, seats_grade_5=$28, seats_grade_6=$29,
                seats_grade_7=$30, seats_grade_8=$31, seats_grade_9=$32, seats_grade_10=$33,
                seats_grade_11=$34, seats_grade_12=$35,
 
                has_buildable_space=$36::BOOLEAN,
 
                female_bowls_func=$37, female_bowls_nonfunc=$38,
                male_bowls_func=$39, male_bowls_nonfunc=$40,
                male_urinals_func=$41, male_urinals_nonfunc=$42,
                pwd_bowls_func=$43, pwd_bowls_nonfunc=$44,
                toilet_common_functional=$45, toilet_common_nonfunctional=$46,
 
                updated_at=CURRENT_TIMESTAMP
            WHERE ${anchorClause}
        `;

    const values = [
      anchorVal,
      data.res_water_source, data.res_tvl_workshops, data.res_electricity_source,
      data.res_buildable_space, data.sha_category,

      data.res_sci_labs, data.res_com_labs,

      data.res_ecart_func || 0, data.res_ecart_nonfunc || 0,
      data.res_laptop_func || 0, data.res_laptop_nonfunc || 0,
      data.res_tv_func || 0, data.res_tv_nonfunc || 0,
      data.res_printer_func || 0, data.res_printer_nonfunc || 0,
      data.res_desk_func || 0, data.res_desk_nonfunc || 0,
      data.res_armchair_func || 0, data.res_armchair_nonfunc || 0,
      data.res_handwash_func || 0, data.res_handwash_nonfunc || 0,

      data.seats_kinder || 0, data.seats_grade_1 || 0, data.seats_grade_2 || 0, data.seats_grade_3 || 0,
      data.seats_grade_4 || 0, data.seats_grade_5 || 0, data.seats_grade_6 || 0,
      data.seats_grade_7 || 0, data.seats_grade_8 || 0, data.seats_grade_9 || 0, data.seats_grade_10 || 0,
      data.seats_grade_11 || 0, data.seats_grade_12 || 0,

      // $36
      data.res_buildable_space === 'Yes',

      // $37-$44: New sanitation fixture counts
      data.female_bowls_func || 0, data.female_bowls_nonfunc || 0,
      data.male_bowls_func || 0, data.male_bowls_nonfunc || 0,
      data.male_urinals_func || 0, data.male_urinals_nonfunc || 0,
      data.pwd_bowls_func || 0, data.pwd_bowls_nonfunc || 0,
      data.toilet_common_functional || 0, data.toilet_common_nonfunctional || 0
    ];

    await pool.query(query, values);

    // --- HANDLE BUILDABLE SPACES (Transactional) ---
    if (data.res_buildable_space === 'Yes' && data.spaces && Array.isArray(data.spaces)) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // 1. Delete existing for school
        await client.query('DELETE FROM buildable_spaces WHERE school_id = $1', [data.schoolId]);

        // 2. Insert new with stable space_number
        for (let i = 0; i < data.spaces.length; i++) {
          const space = data.spaces[i];
          await client.query(`
             INSERT INTO buildable_spaces (school_id, iern, space_number, latitude, longitude, length, width, total_area)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           `, [
            data.schoolId,
            data.iern || null,
            i + 1, // space_number: 1, 2, 3...
            space.lat, space.lng,
            space.length, space.width, space.area
          ]);
        }
        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        console.error("Buildable spaces transaction failed:", txErr);
      } finally {
        client.release();
      }
    } else if (data.res_buildable_space === 'No') {
      // Clear if No
      await pool.query('DELETE FROM buildable_spaces WHERE school_id = $1', [data.schoolId]);
    }

    // --- HANDLE E-CART BATCHES (Delete & Re-insert) ---
    if (data.ecartBatches && Array.isArray(data.ecartBatches) && data.ecartBatches.length > 0) {
      const ecClient = await pool.connect();
      try {
        await ecClient.query('BEGIN');
        await ecClient.query('DELETE FROM ecart_batches WHERE school_id = $1', [data.schoolId]);
        for (const b of data.ecartBatches) {
          await ecClient.query(`
            INSERT INTO ecart_batches (
              school_id, iern, batch_no, year_received, source_fund,
              ecart_qty_laptops, ecart_condition_laptops,
              ecart_has_smart_tv, ecart_tv_size, ecart_condition_tv,
              ecart_condition_charging, ecart_condition_cabinet
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          `, [
            data.schoolId,
            data.iern || null,
            b.batch_no || null,
            b.year_received ? parseInt(b.year_received) : null,
            b.source_fund || null,
            parseInt(b.ecart_qty_laptops) || 0,
            b.ecart_condition_laptops || null,
            b.ecart_has_smart_tv === true || b.ecart_has_smart_tv === 'true',
            b.ecart_tv_size || null,
            b.ecart_condition_tv || null,
            b.ecart_condition_charging || null,
            b.ecart_condition_cabinet || null
          ]);
        }
        await ecClient.query('COMMIT');
      } catch (ecErr) {
        await ecClient.query('ROLLBACK');
        console.error('e-Cart batches transaction failed:', ecErr);
      } finally {
        ecClient.release();
      }
    } else {
      // If array is empty or missing, clear existing rows
      await pool.query('DELETE FROM ecart_batches WHERE school_id = $1', [data.schoolId]);
    }

    res.json({ message: "Resources saved!" });

    // SNAPSHOT UPDATE (Primary)
    await calculateSchoolProgress(data.schoolId, pool);

    // --- DUAL WRITE: SCHOOL RESOURCES ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing School Resources...");
        await poolNew.query(query, values);

        // Sync Buildable Spaces
        if (data.res_buildable_space === 'Yes' && data.spaces) {
          await poolNew.query('DELETE FROM buildable_spaces WHERE school_id = $1', [data.schoolId]);
          for (let i = 0; i < data.spaces.length; i++) {
            const space = data.spaces[i];
            await poolNew.query(`
                INSERT INTO buildable_spaces (school_id, iern, space_number, latitude, longitude, length, width, total_area)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [data.schoolId, data.iern || null, i + 1, space.lat, space.lng, space.length, space.width, space.area]);
          }
        } else if (data.res_buildable_space === 'No') {
          await poolNew.query('DELETE FROM buildable_spaces WHERE school_id = $1', [data.schoolId]);
        }

        // Sync e-Cart Batches
        if (data.ecartBatches && Array.isArray(data.ecartBatches) && data.ecartBatches.length > 0) {
          await poolNew.query('DELETE FROM ecart_batches WHERE school_id = $1', [data.schoolId]);
          for (const b of data.ecartBatches) {
            await poolNew.query(`
              INSERT INTO ecart_batches (
                school_id, batch_no, year_received, source_fund,
                ecart_qty_laptops, ecart_condition_laptops,
                ecart_has_smart_tv, ecart_tv_size, ecart_condition_tv,
                ecart_condition_charging, ecart_condition_cabinet
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            `, [
              data.schoolId,
              b.batch_no || null,
              b.year_received ? parseInt(b.year_received) : null,
              b.source_fund || null,
              parseInt(b.ecart_qty_laptops) || 0,
              b.ecart_condition_laptops || null,
              b.ecart_has_smart_tv === true || b.ecart_has_smart_tv === 'true',
              b.ecart_tv_size || null,
              b.ecart_condition_tv || null,
              b.ecart_condition_charging || null,
              b.ecart_condition_cabinet || null
            ]);
          }
        } else {
          await poolNew.query('DELETE FROM ecart_batches WHERE school_id = $1', [data.schoolId]);
        }

        await calculateSchoolProgress(data.schoolId, poolNew);
        console.log("… Dual-Write: School Resources Synced!");
      } catch (dwErr) {
        console.error(" Dual-Write Error (School Resources):", dwErr.message);
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- 22a. GET: Fetch Facility Repairs (Updated to use new itemized table) ---
app.get('/api/facility-repairs/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM facility_repair_details WHERE school_id = $1 OR iern = $1 ORDER BY building_no, room_no, id ASC',
      [schoolId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Facility Repairs Error:", err);
    res.status(500).json({ error: "Failed to fetch facility repairs" });
  }
});

// --- 22b. POST: Save Facility Repair (LEGACY - DISABLED, replaced by new itemized endpoint below) ---
// Old endpoint removed — was inserting into dropped `facility_repairs` table.
// New endpoint at bottom of file uses `facility_repair_details` table.

// --- 22c. GET: Fetch Facility Demolitions ---
app.get('/api/facility-demolitions/:iern', async (req, res) => {
  const { iern } = req.params;
  try {
    const result = await pool.query('SELECT * FROM facility_demolitions WHERE iern = $1 OR school_id = $1 ORDER BY created_at ASC', [iern]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Facility Demolitions Error:", err);
    res.status(500).json({ error: "Failed to fetch facility demolitions" });
  }
});

// --- 22d. POST: Save Facility Demolition (Single Item) ---
app.post('/api/save-facility-demolition', async (req, res) => {
  const d = req.body;
  try {
    // Sanitize booleans
    const toBool = (val) => val === true || val === 'true' || val === 1;

    const query = `
            INSERT INTO facility_demolitions (
                school_id, iern, building_no,
                reason_age, reason_safety, reason_calamity, reason_upgrade
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING demolition_id;
        `;

    const values = [
      d.schoolId || d.iern, // Fallback
      d.iern || d.schoolId,
      d.building_no,
      toBool(d.reason_age),
      toBool(d.reason_safety),
      toBool(d.reason_calamity),
      toBool(d.reason_upgrade)
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, demolition_id: result.rows[0].demolition_id });

    // --- DUAL WRITE ---
    if (poolNew) {
      poolNew.query(query, values).catch(e => console.error("Dual-Write Demolition Error:", e));
    }

  } catch (err) {
    console.error("Save Demolition Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 22a. GET: Fetch Buildable Spaces ---
app.get('/api/buildable-spaces/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM buildable_spaces WHERE school_id = $1', [schoolId]);
    res.json(result.rows); // Returns array of spaces
  } catch (err) {
    console.error("Fetch Buildable Spaces Error:", err);
    res.status(500).json({ error: "Failed to fetch buildable spaces" });
  }
});



// --- 23. GET: Teacher Specialization Data ---
app.get('/api/teacher-specialization/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE submitted_by = $1', [uid]);
    if (result.rows.length === 0) return res.json({ exists: false });

    // DEBUG LOG
    const row = result.rows[0];
    console.log(`[GET Specialization] Gen: ${row.spec_general_major}, ECE: ${row.spec_ece_major}`);

    res.json({ exists: true, data: row });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 24. GET: Physical Facilities Data ---
app.get('/api/physical-facilities/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE submitted_by = $1', [uid]);
    if (result.rows.length === 0) return res.json({ exists: false });
    res.json({ exists: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 24b. GET: Facility Inventory Data ---
app.get('/api/facility-inventory/:iern', async (req, res) => {
  const { iern } = req.params;
  try {
    const buildings = await pool.query(
      'SELECT * FROM facility_inventory WHERE school_id = $1 OR iern = $1 ORDER BY id', [iern]
    );

    // Fetch rooms for each building
    const buildingsWithRooms = await Promise.all(buildings.rows.map(async (b) => {
      const rooms = await pool.query('SELECT * FROM facility_rooms WHERE building_id = $1', [b.id]);
      return { ...b, rooms: rooms.rows };
    }));

    res.json(buildingsWithRooms);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 24c. GET: Teachers for Advisory Dropdown ---
app.get('/api/unit8/teachers/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query(
      'SELECT full_name FROM teacher_specialization_details WHERE school_id = $1 ORDER BY full_name',
      [schoolId]
    );
    res.json(result.rows.map(r => r.full_name));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 25. POST: Save Physical Facilities (Unified Submission) ---
app.post('/api/save-physical-facilities', async (req, res) => {
  const data = req.body;
  const sId = data.schoolId || data.school_id;
  const client = await pool.connect();
  const sanitize = (val) => (val === '' || val === null || val === undefined) ? 0 : val;
  const toBool = (val) => val === true || val === 'true' || val === 1;

  try {
    if (!sId) throw new Error("Missing schoolId in payload");
    await client.query('BEGIN');
    // Schema should be initialized via manual SQL or startup, removing to prevent transactional locks
    // await ensureUnit10Tables(client);

    // 1. Update Main Profile
    let anchorClause = 'school_id = $1';
    let anchorVal = sId;
    if (data.iern) {
        anchorClause = 'iern = $1';
        anchorVal = data.iern;
    }

    const queryProfile = `
            UPDATE school_profiles SET
                build_classrooms_total=$2,
                build_classrooms_new=$3,
                build_classrooms_good=$4,
                build_classrooms_repair=$5,
                build_classrooms_demolition=$6,
                updated_at=CURRENT_TIMESTAMP
            WHERE ${anchorClause}
        `;

    await client.query(queryProfile, [
      anchorVal,
      sanitize(data.build_classrooms_total),
      sanitize(data.build_classrooms_new),
      sanitize(data.build_classrooms_good),
      sanitize(data.build_classrooms_repair),
      sanitize(data.build_classrooms_demolition)
    ]);

    // 2. Handle Repairs (ph_buildings_repairs)
    if (data.repairEntries && Array.isArray(data.repairEntries)) {
      if (data.iern) {
        await client.query('DELETE FROM ph_buildings_repairs WHERE iern = $1', [data.iern]);
      } else {
        await client.query('DELETE FROM ph_buildings_repairs WHERE school_id = $1', [sId]);
      }

      for (const r of data.repairEntries) {
        await client.query(`
                INSERT INTO ph_buildings_repairs (
                    school_id, iern, building_name, room_name, item_name,
                    oms, condition, damage_ratio, recommended_action, demo_justification, remarks
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
          sId, data.iern || sId,
          r.building_name || r.building_no, r.room_name || r.room_no, r.item_name,
          r.oms || '', r.condition || '', r.damage_ratio || 0,
          r.recommended_action || '', r.demo_justification || '', r.remarks || ''
        ]);
      }
    }

    // 3. Handle Demolitions (ph_buildings_demolition) - One row per room
    if (data.demolitionEntries && Array.isArray(data.demolitionEntries)) {
      if (data.iern) {
        await client.query('DELETE FROM ph_buildings_demolition WHERE iern = $1', [data.iern]);
      } else {
        await client.query('DELETE FROM ph_buildings_demolition WHERE school_id = $1', [sId]);
      }

      for (const d of data.demolitionEntries) {
        const counts = [
          { key: 'less_than_7x9', count: sanitize(d.less_than_7x9) },
          { key: '7x9', count: sanitize(d["7x9"]) },
          { key: 'above_7x9', count: sanitize(d.above_7x9) }
        ];

        let roomIndex = 1;
        for (const cat of counts) {
          for (let i = 0; i < cat.count; i++) {
            await client.query(`
                    INSERT INTO ph_buildings_demolition (
                        school_id, iern, building_name, room_name,
                        age, safety, calamity, upgrade,
                        less_than_7x9, "7x9", above_7x9
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
              sId, data.iern || sId,
              d.building_name || d.building_no,
              `${d.building_name || d.building_no} - Room ${roomIndex++}`,
              toBool(d.reason_age || d.age), toBool(d.reason_safety || d.safety),
              toBool(d.reason_calamity || d.calamity), toBool(d.reason_upgrade || d.upgrade),
              cat.key === 'less_than_7x9' ? 1 : 0,
              cat.key === '7x9' ? 1 : 0,
              cat.key === 'above_7x9' ? 1 : 0
            ]);
          }
        }
      }
    }

    // 4. Handle Building Inventory (ph_buildings_inventory) - One row per room
    if (data.inventoryEntries && Array.isArray(data.inventoryEntries)) {
      if (data.iern) {
        await client.query('DELETE FROM ph_buildings_inventory WHERE iern = $1', [data.iern]);
      } else {
        await client.query('DELETE FROM ph_buildings_inventory WHERE school_id = $1', [sId]);
      }

      const allRooms = data.rooms || [];
      const buildings = data.inventoryEntries;

      for (const room of allRooms) {
        const parentBuild = buildings.find(b => b.building_name === room.building_name || b.id === room.building_local_id);
        const roomDim = room.dimension || room.dimensions || '';

        await client.query(`
              INSERT INTO ph_buildings_inventory (
                  school_id, iern, building_name, room_name, category,
                  storey, classroom, year_completed, remarks,
                  less_than_7x9, "7x9", above_7x9, 
                  grade_level, advisory_teacher, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
          sId, data.iern || sId,
          room.building_name, room.room_name,
          parentBuild?.category || 'Classroom',
          sanitize(parentBuild?.storey) || 1, 1, // one classroom per row
          parentBuild?.year_completed || null, parentBuild?.remarks || '',
          roomDim === 'less than 7x9' ? 1 : 0,
          roomDim === '7x9' ? 1 : 0,
          roomDim === 'above 7x9' ? 1 : 0,
          room.grade_level || '', room.teacher_id || '',
          room.condition || 'Good Condition'
        ]);
      }
    }

    // 5. Mark unit8_completed flag in ph_schools
    // STRICT VALIDATION: Only mark as completed if there is at least one building in inventory
    const inventoryCount = (data.inventoryEntries && Array.isArray(data.inventoryEntries)) ? data.inventoryEntries.length : 0;
    const isUnit8Completed = inventoryCount > 0;

    await client.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit8_completed BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit8_updated_at TIMESTAMP;`);
    
    if (data.iern) {
        await client.query(`UPDATE ph_schools SET unit8_completed = $1, unit8 = $2, unit8_updated_at = CASE WHEN $1 = TRUE THEN CURRENT_TIMESTAMP ELSE unit8_updated_at END, updated_at = CURRENT_TIMESTAMP WHERE iern = $3`, [isUnit8Completed, isUnit8Completed ? 1 : 0, data.iern]);
    } else {
        await client.query(`UPDATE ph_schools SET unit8_completed = $1, unit8 = $2, unit8_updated_at = CASE WHEN $1 = TRUE THEN CURRENT_TIMESTAMP ELSE unit8_updated_at END, updated_at = CURRENT_TIMESTAMP WHERE school_id = $3`, [isUnit8Completed, isUnit8Completed ? 1 : 0, sId]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: "Facilities and details saved!" });

    // SNAPSHOT UPDATE
    await calculateSchoolProgress(data.schoolId, pool);

    // --- DUAL WRITE: PHYSICAL FACILITIES (Async, Best Effort) ---
    if (typeof poolNew !== 'undefined' && poolNew) {
      (async () => {
        const clientNew = await poolNew.connect();
        try {
          await clientNew.query('BEGIN');
          // DW 1. Update Profile
          await clientNew.query(queryProfile, [
            data.schoolId,
            sanitize(data.build_classrooms_total),
            sanitize(data.build_classrooms_new),
            sanitize(data.build_classrooms_good),
            sanitize(data.build_classrooms_repair),
            sanitize(data.build_classrooms_demolition)
          ]);

          // DW 2. Repairs
          if (data.repairEntries && Array.isArray(data.repairEntries)) {
            await clientNew.query('DELETE FROM facility_repair_details WHERE school_id = $1', [data.schoolId]);

            for (const r of data.repairEntries) {
              await clientNew.query(`
                        INSERT INTO facility_repair_details (
                            school_id, iern, building_no, room_no, item_name,
                            oms, condition, damage_ratio, recommended_action, demo_justification, remarks
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, [
                data.schoolId, data.iern || data.schoolId,
                r.building_no, r.room_no, r.item_name,
                r.oms || '', r.condition || '', r.damage_ratio || 0,
                r.recommended_action || '', r.demo_justification || '', r.remarks || ''
              ]);
            }
          }

          // DW 3. Demolitions
          if (data.demolitionEntries && Array.isArray(data.demolitionEntries)) {
            await clientNew.query('DELETE FROM facility_demolitions WHERE school_id = $1', [data.schoolId]);
            for (const d of data.demolitionEntries) {
              await clientNew.query(`
                        INSERT INTO facility_demolitions (
                            school_id, iern, building_no,
                            reason_age, reason_safety, reason_calamity, reason_upgrade
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [
                data.schoolId, data.schoolId, d.building_no,
                toBool(d.reason_age || d.age), toBool(d.reason_safety || d.safety),
                toBool(d.reason_calamity || d.calamity), toBool(d.reason_upgrade || d.upgrade)
              ]);
            }
          }

          // DW 4. Building Inventory
          if (data.inventoryEntries && Array.isArray(data.inventoryEntries)) {
            await clientNew.query('DELETE FROM facility_inventory WHERE school_id = $1', [data.schoolId]);
            for (const inv of data.inventoryEntries) {
              await clientNew.query(`
                        INSERT INTO facility_inventory (
                            school_id, iern, building_name, category, status_of_construction_phase,
                            no_of_storeys, no_of_classrooms, year_completed, remarks,
                            grade_level, teacher_name, less_than_7x9, "7x9", above_7x9
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    `, [
                data.schoolId, data.iern || data.schoolId,
                inv.building_name, inv.category, inv.status_of_construction_phase || 'Completed',
                sanitize(inv.no_of_storeys) || 1, sanitize(inv.no_of_classrooms),
                inv.year_completed || null, inv.remarks || '',
                inv.grade_level || '', inv.teacher_name || '',
                inv.less_than_7x9 || 0, inv["7x9"] || 0, inv.above_7x9 || 0
              ]);
            }
          }

          await clientNew.query('COMMIT');
          await calculateSchoolProgress(data.schoolId, poolNew);
          console.log("✅ Dual-Write: Physical Facilities Synced!");
        } catch (dwErr) {
          await clientNew.query('ROLLBACK');
          console.error("❌ Dual-Write Error (Physical Facilities):", dwErr.message);
        } finally {
          clientNew.release();
        }
      })();
    }
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("CRITICAL SQL ERROR in POST /api/save-physical-facilities:", err);
    res.status(500).json({ error: err.message, detail: err.stack });
  } finally {
    client.release();
  }
});

// --- 26. POST: Save Teacher Specialization ---
app.post('/api/save-teacher-specialization', async (req, res) => {
  const d = req.body;
  try {
    const query = `
            UPDATE school_profiles SET 
                spec_english_major=$2, spec_english_teaching=$3,

                spec_filipino_major=$4, spec_filipino_teaching=$5,
                spec_math_major=$6, spec_math_teaching=$7,
                spec_science_major=$8, spec_science_teaching=$9,
                spec_ap_major=$10, spec_ap_teaching=$11,
                spec_mapeh_major=$12, spec_mapeh_teaching=$13,
                spec_esp_major=$14, spec_esp_teaching=$15,
                spec_tle_major=$16, spec_tle_teaching=$17,
                spec_guidance=$18, spec_librarian=$19,
                spec_ict_coord=$20, spec_drrm_coord=$21,
                spec_general_major=$22, spec_general_teaching=$23,
                spec_ece_major=$24, spec_ece_teaching=$25,
                spec_bio_sci_major=$26, spec_bio_sci_teaching=$27,
                spec_phys_sci_major=$28, spec_phys_sci_teaching=$29,
                spec_agri_fishery_major=$30, spec_agri_fishery_teaching=$31,
                spec_others_major=$32, spec_others_teaching=$33,
                updated_at = CURRENT_TIMESTAMP
            WHERE submitted_by = $1;
        `;
    const values = [
      d.uid,
      d.spec_english_major || 0, d.spec_english_teaching || 0,
      d.spec_filipino_major || 0, d.spec_filipino_teaching || 0,
      d.spec_math_major || 0, d.spec_math_teaching || 0,
      d.spec_science_major || 0, d.spec_science_teaching || 0,
      d.spec_ap_major || 0, d.spec_ap_teaching || 0,
      d.spec_mapeh_major || 0, d.spec_mapeh_teaching || 0,
      d.spec_esp_major || 0, d.spec_esp_teaching || 0,
      d.spec_tle_major || 0, d.spec_tle_teaching || 0,
      d.spec_guidance || 0, d.spec_librarian || 0,
      d.spec_ict_coord || 0, d.spec_drrm_coord || 0,
      d.spec_general_teaching || 0,
      d.spec_ece_teaching || 0,
      d.spec_bio_sci_major || 0, d.spec_bio_sci_teaching || 0,
      d.spec_phys_sci_major || 0, d.spec_phys_sci_teaching || 0,
      d.spec_agri_fishery_major || 0, d.spec_agri_fishery_teaching || 0,
      d.spec_others_major || 0, d.spec_others_teaching || 0
    ];

    // DEBUG LOGGING
    console.log(`[Specialization Save] UID: ${d.uid}`);
    console.log(`[Specialization Save] General Teaching: ${d.spec_general_teaching}, ECE Teaching: ${d.spec_ece_teaching}`);

    const result = await pool.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ error: "Profile not found" });

    res.json({ success: true });
    // SNAPSHOT UPDATE (UID to School ID)
    try {
      const spRes = await pool.query("SELECT school_id FROM school_profiles WHERE submitted_by = $1", [d.uid]);
      if (spRes.rows.length > 0) {
        await calculateSchoolProgress(spRes.rows[0].school_id, pool);

        // --- DUAL WRITE: TEACHER SPECIALIZATION ---
        if (poolNew) {
          try {
            console.log("”„ Dual-Write: Syncing Teacher Specialization...");
            await poolNew.query(query, values);
            await calculateSchoolProgress(spRes.rows[0].school_id, poolNew);
            console.log("… Dual-Write: Teacher Specialization Synced!");
          } catch (dwErr) {
            console.error("âŒ Dual-Write Error (Teacher Specialization):", dwErr.message);
          }
        }
      }
    } catch (e) { console.warn("Snapshot Trigger Specialization User Lookup Failed", e); }

  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==================================================================
//                    MONITORING & JURISDICTION ROUTES
// ==================================================================

// --- SUPER USER: Export Summary Endpoint ---
app.get('/api/super-user/export-summary', async (req, res) => {
  const { role, region, division, district } = req.query;
  try {
    const result = { context: { role: role || 'Central Office', location: '' }, generated_at: new Date().toISOString() };

    // Build location string for context
    if (district) result.context.location = `${district}, ${division}`;
    else if (division) result.context.location = `${division} Division`;
    else if (region) result.context.location = region;
    else result.context.location = 'National';

    // --- 1. School KPIs ---
    let schoolSql = `
      SELECT 
        COUNT(s.school_id) as total_schools,
        COALESCE(SUM(CASE WHEN sp.f1_profile > 0 THEN 1 ELSE 0 END), 0) as profile,
        COALESCE(SUM(CASE WHEN sp.f2_head > 0 THEN 1 ELSE 0 END), 0) as head,
        COALESCE(SUM(CASE WHEN sp.f3_enrollment > 0 THEN 1 ELSE 0 END), 0) as enrollment,
        COALESCE(SUM(CASE WHEN sp.f4_classes > 0 THEN 1 ELSE 0 END), 0) as organizedclasses,
        COALESCE(SUM(CASE WHEN sp.f5_teachers > 0 THEN 1 ELSE 0 END), 0) as personnel,
        COALESCE(SUM(CASE WHEN sp.f6_specialization > 0 THEN 1 ELSE 0 END), 0) as specialization,
        COALESCE(SUM(CASE WHEN sp.f7_resources > 0 THEN 1 ELSE 0 END), 0) as resources,
        COALESCE(SUM(CASE WHEN sp.f8_facilities > 0 THEN 1 ELSE 0 END), 0) as facilities,
        COALESCE(SUM(CASE WHEN sp.f9_shifting > 0 THEN 1 ELSE 0 END), 0) as shifting,
        COALESCE(SUM(CASE WHEN sp.f10_stats > 0 THEN 1 ELSE 0 END), 0) as learner_stats,
        COALESCE(COUNT(CASE WHEN sp.completion_percentage = 100 THEN 1 END), 0) as completed_schools,
        COALESCE(COUNT(CASE WHEN sp.completion_percentage = 100 AND (ss.data_health_description = 'Excellent' OR sp.school_head_validation = TRUE) THEN 1 END), 0) as validated_schools
      FROM schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
    `;
    let schoolParams = [];
    let schoolWhere = [];

    if (region) {
      schoolParams.push(region);
      schoolWhere.push(`UPPER(TRIM(s.region)) = UPPER(TRIM($${schoolParams.length}))`);
    }
    if (division) {
      schoolParams.push(division);
      schoolWhere.push(`UPPER(TRIM(s.division)) = UPPER(TRIM($${schoolParams.length}))`);
    }
    if (district) {
      schoolParams.push(district);
      schoolWhere.push(`UPPER(TRIM(s.district)) = UPPER(TRIM($${schoolParams.length}))`);
    }

    if (schoolWhere.length > 0) schoolSql += ' WHERE ' + schoolWhere.join(' AND ');

    const schoolRes = await pool.query(schoolSql, schoolParams);
    const sr = schoolRes.rows[0];
    const totalSchools = parseInt(sr.total_schools) || 0;

    result.school_kpis = {
      total_schools: totalSchools,
      completed: parseInt(sr.completed_schools) || 0,
      validated: parseInt(sr.validated_schools) || 0,
      completion_pct: totalSchools > 0 ? parseFloat(((parseInt(sr.completed_schools) / totalSchools) * 100).toFixed(1)) : 0,
      form_breakdown: {
        profile: parseInt(sr.profile) || 0,
        head: parseInt(sr.head) || 0,
        enrollment: parseInt(sr.enrollment) || 0,
        organizedclasses: parseInt(sr.organizedclasses) || 0,
        personnel: parseInt(sr.personnel) || 0,
        specialization: parseInt(sr.specialization) || 0,
        resources: parseInt(sr.resources) || 0,
        facilities: parseInt(sr.facilities) || 0,
        shifting: parseInt(sr.shifting) || 0,
        learner_stats: parseInt(sr.learner_stats) || 0,
      }
    };

    // --- 2. Engineer KPIs ---
    let engSql = `
      SELECT
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'Ongoing' THEN 1 END) as ongoing,
        COUNT(CASE WHEN status = 'Not Yet Started' THEN 1 END) as not_yet_started,
        COUNT(CASE WHEN status = 'Under Procurement' THEN 1 END) as under_procurement,
        COUNT(CASE WHEN status = 'For Final Inspection' THEN 1 END) as for_final_inspection
      FROM (
        SELECT DISTINCT ON (ipc) project_id, status_of_construction_phase, region, division
        FROM engineer_form
        ORDER BY ipc, project_id DESC
      ) latest
    `;
    let engParams = [];
    let engWhere = [];

    if (region) {
      engParams.push(region);
      engWhere.push(`UPPER(TRIM(latest.region)) = UPPER(TRIM($${engParams.length}))`);
    }
    if (division) {
      engParams.push(division);
      engWhere.push(`UPPER(TRIM(latest.division)) = UPPER(TRIM($${engParams.length}))`);
    }

    if (engWhere.length > 0) engSql += ' WHERE ' + engWhere.join(' AND ');

    const engRes = await pool.query(engSql, engParams);
    const er = engRes.rows[0];

    result.engineer_kpis = {
      total_projects: parseInt(er.total_projects) || 0,
      completed: parseInt(er.completed) || 0,
      ongoing: parseInt(er.ongoing) || 0,
      not_yet_started: parseInt(er.not_yet_started) || 0,
      under_procurement: parseInt(er.under_procurement) || 0,
      for_final_inspection: parseInt(er.for_final_inspection) || 0,
    };

    res.json(result);

  } catch (err) {
    console.error("Export Summary Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 25. GET: Monitoring Stats (RO / SDO) ---
app.get('/api/monitoring/stats', async (req, res) => {
  const { region, division } = req.query;
  try {
    // REFACTOR: Use 'schools' table as the base to get accurate TOTAL SCHOOLS count.
    // LEFT JOIN 'school_profiles' to get the progress data.
    let statsQuery = `
      SELECT 
        COUNT(s.school_id) as total_schools,
        -- Sum up the modular unit flags from ph_schools (Mapping to legacy aliases)
        COALESCE(SUM(CASE WHEN s.unit1 > 0 THEN 1 ELSE 0 END), 0) as profile,
        COALESCE(SUM(CASE WHEN s.unit1 > 0 THEN 1 ELSE 0 END), 0) as head, 
        COALESCE(SUM(CASE WHEN s.unit2 > 0 THEN 1 ELSE 0 END), 0) as enrollment,
        COALESCE(SUM(CASE WHEN s.unit3 > 0 THEN 1 ELSE 0 END), 0) as organizedclasses,
        COALESCE(SUM(CASE WHEN s.unit5 > 0 THEN 1 ELSE 0 END), 0) as shifting,
        COALESCE(SUM(CASE WHEN s.unit6 > 0 THEN 1 ELSE 0 END), 0) as personnel,
        COALESCE(SUM(CASE WHEN s.unit6 > 0 THEN 1 ELSE 0 END), 0) as specialization,
        COALESCE(SUM(CASE WHEN s.unit7 > 0 THEN 1 ELSE 0 END), 0) as resources,
        COALESCE(SUM(CASE WHEN s.unit4 > 0 THEN 1 ELSE 0 END), 0) as learner_stats,
        COALESCE(SUM(CASE WHEN s.unit8 > 0 THEN 1 ELSE 0 END), 0) as facilities,
        
        -- Overall Completion (100%) - Using ph_schools unit_completion
        COALESCE(COUNT(CASE WHEN s.iern IS NOT NULL AND s.unit_completion >= 100 THEN 1 END), 0) as completed_schools_count,
        
        -- Validated Count
        COALESCE(COUNT(CASE WHEN s.iern IS NOT NULL AND s.unit_completion >= 100 AND (ss.data_health_description = 'Excellent' OR sp.school_head_validation = TRUE) THEN 1 END), 0) as validated_schools_count,
        
        -- Registered Count (Schools that have an IERN assigned)
        COUNT(CASE WHEN s.iern IS NOT NULL AND s.iern != '' THEN 1 END) as registered_schools_count
      FROM ph_schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      WHERE UPPER(TRIM(s.region)) ~* ('^' || $1 || '($|[^a-zA-Z0-9])')
    `;
    console.log("DEBUG: Running Monitoring Stats for Region:", region, "Division:", division);
    let params = [region];

    if (division) {
      statsQuery += ` AND UPPER(TRIM(s.division)) = UPPER(TRIM($2))`;
      params.push(division);
    }

    if (req.query.district) {
      statsQuery += ` AND UPPER(TRIM(s.district)) = UPPER(TRIM($${params.length + 1}))`;
      params.push(req.query.district);
    }

    if (req.query.school_id) {
       statsQuery += ` AND s.school_id = $${params.length + 1}`;
       params.push(req.query.school_id);
    }

    statsQuery += ` GROUP BY s.region ${division ? ', s.division' : ''} ${req.query.district ? ', s.district' : ''} ${req.query.school_id ? ', s.school_id' : ''}`;

    const result = await pool.query(statsQuery, params);

    // Safety: Ensure we return numbers
    const row = result.rows[0] || {};
    const safeRow = {
      total_schools: parseInt(row.total_schools || 0),
      profile: parseInt(row.profile || 0),
      head: parseInt(row.head || 0),
      enrollment: parseInt(row.enrollment || 0),
      organizedclasses: parseInt(row.organizedclasses || 0),
      shifting: parseInt(row.shifting || 0),
      personnel: parseInt(row.personnel || 0),
      specialization: parseInt(row.specialization || 0),
      resources: parseInt(row.resources || 0),
      facilities: parseInt(row.facilities || 0),
      learner_stats: parseInt(row.learner_stats || 0),
      completed_schools_count: parseInt(row.completed_schools_count || 0),
      validated_schools_count: parseInt(row.validated_schools_count || 0),
      registered_schools_count: parseInt(row.registered_schools_count || 0),
      accounts_count: parseInt(row.registered_schools_count || 0)
    };

    res.json(safeRow);
  } catch (err) {
    console.error("Monitoring Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch stats", details: err.message });
  }
});

// --- HROD DASHBOARD MONITORING ENDPOINT ---
app.get('/api/monitoring/hrod-dashboard', async (req, res) => {
  const { region, division, district, municipality, group_by = 'region' } = req.query;
  try {
    let selectGroup = '';
    let extraSelect = '';
    switch(group_by.toLowerCase()) {
      case 'division': selectGroup = 'TRIM(s.division)'; break;
      case 'district': selectGroup = 'TRIM(s.district)'; break;
      case 'municipality': selectGroup = 'TRIM(s.municipality)'; break;
      case 'region': selectGroup = 'TRIM(s.region)'; break;
      case 'school': 
        selectGroup = 'TRIM(s.school_name)'; 
        extraSelect = ', s.school_id';
        break;
      default: selectGroup = 'TRIM(s.region)';
    }

    // Dynamic filters based on hierarchy
    let filterClause = 'WHERE 1=1';
    const params = [];

    if (region) {
      filterClause += ` AND UPPER(TRIM(s.region)) = UPPER(TRIM($${params.length + 1}))`;
      params.push(region);
    }
    if (division) {
      filterClause += ` AND UPPER(TRIM(s.division)) = UPPER(TRIM($${params.length + 1}))`;
      params.push(division);
    }
    if (district) {
      filterClause += ` AND UPPER(TRIM(s.district)) = UPPER(TRIM($${params.length + 1}))`;
      params.push(district);
    }
    if (municipality) {
      filterClause += ` AND UPPER(TRIM(s.municipality)) = UPPER(TRIM($${params.length + 1}))`;
      params.push(municipality);
    }

    const query = `
      SELECT 
        ${selectGroup} as group_name
        ${extraSelect},
        COUNT(s.school_id) as total_schools,
        COUNT(s.iern) as registered_schools,
        COALESCE(SUM(CASE WHEN s.unit_completion >= 100 THEN 1 ELSE 0 END), 0) as unit_completed,
        COALESCE(COUNT(DISTINCT e.school_id) FILTER (WHERE e.status = 'VERIFIED' OR e.status = 'PENDING_SDO'), 0) as esf7_completed,
        -- NSPP placeholder (0 for now as module is coming soon)
        0 as nspp_completed
      FROM ph_schools s
      LEFT JOIN esf7_database e ON s.school_id = e.school_id
      ${filterClause}
      GROUP BY ${selectGroup} ${extraSelect}
      HAVING ${selectGroup} IS NOT NULL AND ${selectGroup} <> ''
      ORDER BY 
        CASE 
          WHEN COUNT(s.school_id) > 0 THEN (COALESCE(SUM(CASE WHEN s.unit_completion >= 100 THEN 1 ELSE 0 END), 0)::float / COUNT(s.school_id)::float)
          ELSE 0 
        END DESC,
        group_name ASC
    `;

    const result = await pool.query(query, params);
    
    // Calculate overall totals for the response
    const totals = {
      total_schools: 0,
      registered_schools: 0,
      unit_completed: 0,
      esf7_completed: 0,
      nspp_completed: 0
    };

    result.rows.forEach(row => {
      totals.total_schools += parseInt(row.total_schools);
      totals.registered_schools += parseInt(row.registered_schools);
      totals.unit_completed += parseInt(row.unit_completed);
      totals.esf7_completed += parseInt(row.esf7_completed);
    });

    res.json({
      summary: totals,
      breakdown: result.rows.map(r => ({
        ...r,
        total_schools: parseInt(r.total_schools),
        registered_schools: parseInt(r.registered_schools),
        unit_completed: parseInt(r.unit_completed),
        esf7_completed: parseInt(r.esf7_completed),
        progress: r.total_schools > 0 ? Math.round((parseInt(r.unit_completed) / parseInt(r.total_schools)) * 100) : 0
      }))
    });

  } catch (err) {
    console.error("HROD Dashboard Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// --- DEBUG: Temp endpoint to check ph_schools iern data ---
app.get('/api/debug/iern-check', async (req, res) => {
  const { region = 'Region V' } = req.query;
  try {
    const r1 = await pool.query(`
      SELECT division, COUNT(*) as total, COUNT(iern) as with_iern,
             ARRAY_AGG(iern) FILTER (WHERE iern IS NOT NULL) as iern_values
      FROM ph_schools
      WHERE UPPER(TRIM(region)) = UPPER(TRIM($1))
      GROUP BY division ORDER BY division
    `, [region]);
    const r2 = await pool.query(`
      SELECT school_id, school_name, division, iern
      FROM ph_schools
      WHERE UPPER(TRIM(region)) = UPPER(TRIM($1)) AND iern IS NOT NULL
      ORDER BY division, school_name
    `, [region]);
    res.json({ byDivision: r1.rows, schools_with_iern: r2.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 25b. GET: Monitoring Stats per Division (RO View) ---
// --- 26. GET: Division Stats (Within Region) ---
app.get('/api/monitoring/division-stats', async (req, res) => {
  const { region } = req.query;
  console.log("DEBUG: FETCHING DIV STATS FOR REGION:", region);
  try {
    // REFACTOR: Use 'schools' table as base
    const query = `
      SELECT 
        UPPER(TRIM(s.division)) as division, 
        COUNT(s.school_id) as total_schools, 
        COUNT(CASE WHEN s.iern IS NOT NULL AND s.iern != '' THEN 1 END) as registered_schools,
        COUNT(CASE WHEN s.unit_completion >= 100 THEN 1 END) as completed_schools,
        COUNT(CASE WHEN s.iern IS NOT NULL AND s.iern != '' AND s.unit_completion >= 100 AND (ss.data_health_description = 'Excellent' OR sp.school_head_validation = TRUE) THEN 1 END) as validated_schools,
        COUNT(CASE WHEN s.iern IS NOT NULL AND s.iern != '' AND s.unit_completion >= 100 AND ss.data_health_description IS NOT NULL AND ss.data_health_description != 'Excellent' THEN 1 END) as for_validation_schools,
        ROUND(COALESCE(AVG(CASE WHEN s.iern IS NOT NULL AND s.iern != '' THEN s.unit_completion ELSE NULL END), 0), 1) as avg_completion,
        
        -- Map modular units to legacy names for frontend bars
        COALESCE(SUM(s.unit1), 0) as profile,
        COALESCE(SUM(s.unit1), 0) as head,
        COALESCE(SUM(s.unit2), 0) as enrollment,
        COALESCE(SUM(s.unit3), 0) as organizedclasses,
        COALESCE(SUM(s.unit4), 0) as learner_stats,
        COALESCE(SUM(s.unit5), 0) as shifting,
        COALESCE(SUM(s.unit6), 0) as personnel,
        COALESCE(SUM(s.unit7), 0) as resources,
        COALESCE(SUM(s.unit8), 0) as facilities,

        SUM(COALESCE(sp.total_enrollment, 0)) as total_enrollment,
        SUM(COALESCE(sp.grade_kinder, 0)) as grade_kinder,
        SUM(COALESCE(sp.grade_1, 0)) as grade_1,
        SUM(COALESCE(sp.grade_2, 0)) as grade_2,
        SUM(COALESCE(sp.grade_3, 0)) as grade_3,
        SUM(COALESCE(sp.grade_4, 0)) as grade_4,
        SUM(COALESCE(sp.grade_5, 0)) as grade_5,
        SUM(COALESCE(sp.grade_6, 0)) as grade_6,
        SUM(COALESCE(sp.grade_7, 0)) as grade_7,
        SUM(COALESCE(sp.grade_8, 0)) as grade_8,
        SUM(COALESCE(sp.grade_9, 0)) as grade_9,
        SUM(COALESCE(sp.grade_10, 0)) as grade_10,
        SUM(COALESCE(sp.grade_11, 0)) as grade_11,
        SUM(COALESCE(sp.grade_12, 0)) as grade_12,

        SUM(COALESCE(sp.classes_kinder, 0)) as classes_kinder,
        SUM(COALESCE(sp.classes_grade_1, 0)) as classes_grade_1,
        SUM(COALESCE(sp.classes_grade_2, 0)) as classes_grade_2,
        SUM(COALESCE(sp.classes_grade_3, 0)) as classes_grade_3,
        SUM(COALESCE(sp.classes_grade_4, 0)) as classes_grade_4,
        SUM(COALESCE(sp.classes_grade_5, 0)) as classes_grade_5,
        SUM(COALESCE(sp.classes_grade_6, 0)) as classes_grade_6,
        SUM(COALESCE(sp.classes_grade_7, 0)) as classes_grade_7,
        SUM(COALESCE(sp.classes_grade_8, 0)) as classes_grade_8,
        SUM(COALESCE(sp.classes_grade_9, 0)) as classes_grade_9,
        SUM(COALESCE(sp.classes_grade_10, 0)) as classes_grade_10,
        SUM(COALESCE(sp.classes_grade_11, 0)) as classes_grade_11,
        SUM(COALESCE(sp.classes_grade_12, 0)) as classes_grade_12,
        
        SUM(COALESCE(sp.aral_math_g1, 0)) as aral_math_g1,
        SUM(COALESCE(sp.aral_read_g1, 0)) as aral_read_g1,
        SUM(COALESCE(sp.aral_sci_g1, 0)) as aral_sci_g1,
        SUM(COALESCE(sp.aral_math_g2, 0)) as aral_math_g2,
        SUM(COALESCE(sp.aral_read_g2, 0)) as aral_read_g2,
        SUM(COALESCE(sp.aral_sci_g2, 0)) as aral_sci_g2,
        SUM(COALESCE(sp.aral_math_g3, 0)) as aral_math_g3,
        SUM(COALESCE(sp.aral_read_g3, 0)) as aral_read_g3,
        SUM(COALESCE(sp.aral_sci_g3, 0)) as aral_sci_g3,
        SUM(COALESCE(sp.aral_math_g4, 0)) as aral_math_g4,
        SUM(COALESCE(sp.aral_read_g4, 0)) as aral_read_g4,
        SUM(COALESCE(sp.aral_sci_g4, 0)) as aral_sci_g4,
        SUM(COALESCE(sp.aral_math_g5, 0)) as aral_math_g5,
        SUM(COALESCE(sp.aral_read_g5, 0)) as aral_read_g5,
        SUM(COALESCE(sp.aral_sci_g5, 0)) as aral_sci_g5,
        SUM(COALESCE(sp.aral_math_g6, 0)) as aral_math_g6,
        SUM(COALESCE(sp.aral_read_g6, 0)) as aral_read_g6,
        SUM(COALESCE(sp.aral_sci_g6, 0)) as aral_sci_g6,

        SUM(COALESCE(sp.cnt_less_kinder, 0)) as cnt_less_kinder,
        SUM(COALESCE(sp.cnt_within_kinder, 0)) as cnt_within_kinder,
        SUM(COALESCE(sp.cnt_above_kinder, 0)) as cnt_above_kinder,
        
        SUM(COALESCE(sp.cnt_less_g1, 0)) as cnt_less_g1,
        SUM(COALESCE(sp.cnt_within_g1, 0)) as cnt_within_g1,
        SUM(COALESCE(sp.cnt_above_g1, 0)) as cnt_above_g1,
        
        SUM(COALESCE(sp.cnt_less_g2, 0)) as cnt_less_g2,
        SUM(COALESCE(sp.cnt_within_g2, 0)) as cnt_within_g2,
        SUM(COALESCE(sp.cnt_above_g2, 0)) as cnt_above_g2,
        
        SUM(COALESCE(sp.cnt_less_g3, 0)) as cnt_less_g3,
        SUM(COALESCE(sp.cnt_within_g3, 0)) as cnt_within_g3,
        SUM(COALESCE(sp.cnt_above_g3, 0)) as cnt_above_g3,
        
        SUM(COALESCE(sp.cnt_less_g4, 0)) as cnt_less_g4,
        SUM(COALESCE(sp.cnt_within_g4, 0)) as cnt_within_g4,
        SUM(COALESCE(sp.cnt_above_g4, 0)) as cnt_above_g4,
        
        SUM(COALESCE(sp.cnt_less_g5, 0)) as cnt_less_g5,
        SUM(COALESCE(sp.cnt_within_g5, 0)) as cnt_within_g5,
        SUM(COALESCE(sp.cnt_above_g5, 0)) as cnt_above_g5,
        
        SUM(COALESCE(sp.cnt_less_g6, 0)) as cnt_less_g6,
        SUM(COALESCE(sp.cnt_within_g6, 0)) as cnt_within_g6,
        SUM(COALESCE(sp.cnt_above_g6, 0)) as cnt_above_g6,
        
        SUM(COALESCE(sp.cnt_less_g7, 0)) as cnt_less_g7,
        SUM(COALESCE(sp.cnt_within_g7, 0)) as cnt_within_g7,
        SUM(COALESCE(sp.cnt_above_g7, 0)) as cnt_above_g7,
        
        SUM(COALESCE(sp.cnt_less_g8, 0)) as cnt_less_g8,
        SUM(COALESCE(sp.cnt_within_g8, 0)) as cnt_within_g8,
        SUM(COALESCE(sp.cnt_above_g8, 0)) as cnt_above_g8,
        
        SUM(COALESCE(sp.cnt_less_g9, 0)) as cnt_less_g9,
        SUM(COALESCE(sp.cnt_within_g9, 0)) as cnt_within_g9,
        SUM(COALESCE(sp.cnt_above_g9, 0)) as cnt_above_g9,
        
        SUM(COALESCE(sp.cnt_less_g10, 0)) as cnt_less_g10,
        SUM(COALESCE(sp.cnt_within_g10, 0)) as cnt_within_g10,
        SUM(COALESCE(sp.cnt_above_g10, 0)) as cnt_above_g10,
        
        SUM(COALESCE(sp.cnt_less_g11, 0)) as cnt_less_g11,
        SUM(COALESCE(sp.cnt_within_g11, 0)) as cnt_within_g11,
        SUM(COALESCE(sp.cnt_above_g11, 0)) as cnt_above_g11,
        
        SUM(COALESCE(sp.cnt_less_g12, 0)) as cnt_less_g12,
        SUM(COALESCE(sp.cnt_within_g12, 0)) as cnt_within_g12,
        SUM(COALESCE(sp.cnt_above_g12, 0)) as cnt_above_g12,

        -- SNED
        SUM(COALESCE(sp.stat_sned_k, 0)) as stat_sned_k,
        SUM(COALESCE(sp.stat_sned_g1, 0)) as stat_sned_g1,
        SUM(COALESCE(sp.stat_sned_g2, 0)) as stat_sned_g2,
        SUM(COALESCE(sp.stat_sned_g3, 0)) as stat_sned_g3,
        SUM(COALESCE(sp.stat_sned_g4, 0)) as stat_sned_g4,
        SUM(COALESCE(sp.stat_sned_g5, 0)) as stat_sned_g5,
        SUM(COALESCE(sp.stat_sned_g6, 0)) as stat_sned_g6,
        SUM(COALESCE(sp.stat_sned_g7, 0)) as stat_sned_g7,
        SUM(COALESCE(sp.stat_sned_g8, 0)) as stat_sned_g8,
        SUM(COALESCE(sp.stat_sned_g9, 0)) as stat_sned_g9,
        SUM(COALESCE(sp.stat_sned_g10, 0)) as stat_sned_g10,
        SUM(COALESCE(sp.stat_sned_g11, 0)) as stat_sned_g11,
        SUM(COALESCE(sp.stat_sned_g12, 0)) as stat_sned_g12,

        -- DISABILITY
        SUM(COALESCE(sp.stat_disability_k, 0)) as stat_disability_k,
        SUM(COALESCE(sp.stat_disability_g1, 0)) as stat_disability_g1,
        SUM(COALESCE(sp.stat_disability_g2, 0)) as stat_disability_g2,
        SUM(COALESCE(sp.stat_disability_g3, 0)) as stat_disability_g3,
        SUM(COALESCE(sp.stat_disability_g4, 0)) as stat_disability_g4,
        SUM(COALESCE(sp.stat_disability_g5, 0)) as stat_disability_g5,
        SUM(COALESCE(sp.stat_disability_g6, 0)) as stat_disability_g6,
        SUM(COALESCE(sp.stat_disability_g7, 0)) as stat_disability_g7,
        SUM(COALESCE(sp.stat_disability_g8, 0)) as stat_disability_g8,
        SUM(COALESCE(sp.stat_disability_g9, 0)) as stat_disability_g9,
        SUM(COALESCE(sp.stat_disability_g10, 0)) as stat_disability_g10,
        SUM(COALESCE(sp.stat_disability_g11, 0)) as stat_disability_g11,
        SUM(COALESCE(sp.stat_disability_g12, 0)) as stat_disability_g12,

        -- ALS
        SUM(COALESCE(sp.stat_als_k, 0)) as stat_als_k,
        SUM(COALESCE(sp.stat_als_g1, 0)) as stat_als_g1,
        SUM(COALESCE(sp.stat_als_g2, 0)) as stat_als_g2,
        SUM(COALESCE(sp.stat_als_g3, 0)) as stat_als_g3,
        SUM(COALESCE(sp.stat_als_g4, 0)) as stat_als_g4,
        SUM(COALESCE(sp.stat_als_g5, 0)) as stat_als_g5,
        SUM(COALESCE(sp.stat_als_g6, 0)) as stat_als_g6,
        SUM(COALESCE(sp.stat_als_g7, 0)) as stat_als_g7,
        SUM(COALESCE(sp.stat_als_g8, 0)) as stat_als_g8,
        SUM(COALESCE(sp.stat_als_g9, 0)) as stat_als_g9,
        SUM(COALESCE(sp.stat_als_g10, 0)) as stat_als_g10,
        SUM(COALESCE(sp.stat_als_g11, 0)) as stat_als_g11,
        SUM(COALESCE(sp.stat_als_g12, 0)) as stat_als_g12,

        -- MUSLIM
        SUM(COALESCE(sp.stat_muslim_k, 0)) as stat_muslim_k,
        SUM(COALESCE(sp.stat_muslim_g1, 0)) as stat_muslim_g1,
        SUM(COALESCE(sp.stat_muslim_g2, 0)) as stat_muslim_g2,
        SUM(COALESCE(sp.stat_muslim_g3, 0)) as stat_muslim_g3,
        SUM(COALESCE(sp.stat_muslim_g4, 0)) as stat_muslim_g4,
        SUM(COALESCE(sp.stat_muslim_g5, 0)) as stat_muslim_g5,
        SUM(COALESCE(sp.stat_muslim_g6, 0)) as stat_muslim_g6,
        SUM(COALESCE(sp.stat_muslim_g7, 0)) as stat_muslim_g7,
        SUM(COALESCE(sp.stat_muslim_g8, 0)) as stat_muslim_g8,
        SUM(COALESCE(sp.stat_muslim_g9, 0)) as stat_muslim_g9,
        SUM(COALESCE(sp.stat_muslim_g10, 0)) as stat_muslim_g10,
        SUM(COALESCE(sp.stat_muslim_g11, 0)) as stat_muslim_g11,
        SUM(COALESCE(sp.stat_muslim_g12, 0)) as stat_muslim_g12,

        -- IP
        SUM(COALESCE(sp.stat_ip_k, 0)) as stat_ip_k,
        SUM(COALESCE(sp.stat_ip_g1, 0)) as stat_ip_g1,
        SUM(COALESCE(sp.stat_ip_g2, 0)) as stat_ip_g2,
        SUM(COALESCE(sp.stat_ip_g3, 0)) as stat_ip_g3,
        SUM(COALESCE(sp.stat_ip_g4, 0)) as stat_ip_g4,
        SUM(COALESCE(sp.stat_ip_g5, 0)) as stat_ip_g5,
        SUM(COALESCE(sp.stat_ip_g6, 0)) as stat_ip_g6,
        SUM(COALESCE(sp.stat_ip_g7, 0)) as stat_ip_g7,
        SUM(COALESCE(sp.stat_ip_g8, 0)) as stat_ip_g8,
        SUM(COALESCE(sp.stat_ip_g9, 0)) as stat_ip_g9,
        SUM(COALESCE(sp.stat_ip_g10, 0)) as stat_ip_g10,
        SUM(COALESCE(sp.stat_ip_g11, 0)) as stat_ip_g11,
        SUM(COALESCE(sp.stat_ip_g12, 0)) as stat_ip_g12,

        -- DISPLACED
        SUM(COALESCE(sp.stat_displaced_k, 0)) as stat_displaced_k,
        SUM(COALESCE(sp.stat_displaced_g1, 0)) as stat_displaced_g1,
        SUM(COALESCE(sp.stat_displaced_g2, 0)) as stat_displaced_g2,
        SUM(COALESCE(sp.stat_displaced_g3, 0)) as stat_displaced_g3,
        SUM(COALESCE(sp.stat_displaced_g4, 0)) as stat_displaced_g4,
        SUM(COALESCE(sp.stat_displaced_g5, 0)) as stat_displaced_g5,
        SUM(COALESCE(sp.stat_displaced_g6, 0)) as stat_displaced_g6,
        SUM(COALESCE(sp.stat_displaced_g7, 0)) as stat_displaced_g7,
        SUM(COALESCE(sp.stat_displaced_g8, 0)) as stat_displaced_g8,
        SUM(COALESCE(sp.stat_displaced_g9, 0)) as stat_displaced_g9,
        SUM(COALESCE(sp.stat_displaced_g10, 0)) as stat_displaced_g10,
        SUM(COALESCE(sp.stat_displaced_g11, 0)) as stat_displaced_g11,
        SUM(COALESCE(sp.stat_displaced_g12, 0)) as stat_displaced_g12,

        -- REPETITION
        SUM(COALESCE(sp.stat_repetition_k, 0)) as stat_repetition_k,
        SUM(COALESCE(sp.stat_repetition_g1, 0)) as stat_repetition_g1,
        SUM(COALESCE(sp.stat_repetition_g2, 0)) as stat_repetition_g2,
        SUM(COALESCE(sp.stat_repetition_g3, 0)) as stat_repetition_g3,
        SUM(COALESCE(sp.stat_repetition_g4, 0)) as stat_repetition_g4,
        SUM(COALESCE(sp.stat_repetition_g5, 0)) as stat_repetition_g5,
        SUM(COALESCE(sp.stat_repetition_g6, 0)) as stat_repetition_g6,
        SUM(COALESCE(sp.stat_repetition_g7, 0)) as stat_repetition_g7,
        SUM(COALESCE(sp.stat_repetition_g8, 0)) as stat_repetition_g8,
        SUM(COALESCE(sp.stat_repetition_g9, 0)) as stat_repetition_g9,
        SUM(COALESCE(sp.stat_repetition_g10, 0)) as stat_repetition_g10,
        SUM(COALESCE(sp.stat_repetition_g11, 0)) as stat_repetition_g11,
        SUM(COALESCE(sp.stat_repetition_g12, 0)) as stat_repetition_g12,

        -- OVERAGE
        SUM(COALESCE(sp.stat_overage_k, 0)) as stat_overage_k,
        SUM(COALESCE(sp.stat_overage_g1, 0)) as stat_overage_g1,
        SUM(COALESCE(sp.stat_overage_g2, 0)) as stat_overage_g2,
        SUM(COALESCE(sp.stat_overage_g3, 0)) as stat_overage_g3,
        SUM(COALESCE(sp.stat_overage_g4, 0)) as stat_overage_g4,
        SUM(COALESCE(sp.stat_overage_g5, 0)) as stat_overage_g5,
        SUM(COALESCE(sp.stat_overage_g6, 0)) as stat_overage_g6,
        SUM(COALESCE(sp.stat_overage_g7, 0)) as stat_overage_g7,
        SUM(COALESCE(sp.stat_overage_g8, 0)) as stat_overage_g8,
        SUM(COALESCE(sp.stat_overage_g9, 0)) as stat_overage_g9,
        SUM(COALESCE(sp.stat_overage_g10, 0)) as stat_overage_g10,
        SUM(COALESCE(sp.stat_overage_g11, 0)) as stat_overage_g11,
        SUM(COALESCE(sp.stat_overage_g12, 0)) as stat_overage_g12,

        -- DROPOUT
        SUM(COALESCE(sp.stat_dropout_k, 0)) as stat_dropout_k,
        SUM(COALESCE(sp.stat_dropout_g1, 0)) as stat_dropout_g1,
        SUM(COALESCE(sp.stat_dropout_g2, 0)) as stat_dropout_g2,
        SUM(COALESCE(sp.stat_dropout_g3, 0)) as stat_dropout_g3,
        SUM(COALESCE(sp.stat_dropout_g4, 0)) as stat_dropout_g4,
        SUM(COALESCE(sp.stat_dropout_g5, 0)) as stat_dropout_g5,
        SUM(COALESCE(sp.stat_dropout_g6, 0)) as stat_dropout_g6,
        SUM(COALESCE(sp.stat_dropout_g7, 0)) as stat_dropout_g7,
        SUM(COALESCE(sp.stat_dropout_g8, 0)) as stat_dropout_g8,
        SUM(COALESCE(sp.stat_dropout_g9, 0)) as stat_dropout_g9,
        SUM(COALESCE(sp.stat_dropout_g10, 0)) as stat_dropout_g10,
        SUM(COALESCE(sp.stat_dropout_g11, 0)) as stat_dropout_g11,
        SUM(COALESCE(sp.stat_dropout_g12, 0)) as stat_dropout_g12,

        -- SHIFTING METRICS
        SUM(CASE WHEN sp.shift_kinder = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_k,
        SUM(CASE WHEN sp.shift_kinder = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_k,
        SUM(CASE WHEN sp.shift_kinder = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_k,
        SUM(CASE WHEN sp.shift_g1 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g1,
        SUM(CASE WHEN sp.shift_g1 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g1,
        SUM(CASE WHEN sp.shift_g1 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g1,
        SUM(CASE WHEN sp.shift_g2 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g2,
        SUM(CASE WHEN sp.shift_g2 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g2,
        SUM(CASE WHEN sp.shift_g2 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g2,
        SUM(CASE WHEN sp.shift_g3 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g3,
        SUM(CASE WHEN sp.shift_g3 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g3,
        SUM(CASE WHEN sp.shift_g3 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g3,
        SUM(CASE WHEN sp.shift_g4 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g4,
        SUM(CASE WHEN sp.shift_g4 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g4,
        SUM(CASE WHEN sp.shift_g4 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g4,
        SUM(CASE WHEN sp.shift_g5 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g5,
        SUM(CASE WHEN sp.shift_g5 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g5,
        SUM(CASE WHEN sp.shift_g5 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g5,
        SUM(CASE WHEN sp.shift_g6 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g6,
        SUM(CASE WHEN sp.shift_g6 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g6,
        SUM(CASE WHEN sp.shift_g6 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g6,
        SUM(CASE WHEN sp.shift_g7 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g7,
        SUM(CASE WHEN sp.shift_g7 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g7,
        SUM(CASE WHEN sp.shift_g7 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g7,
        SUM(CASE WHEN sp.shift_g8 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g8,
        SUM(CASE WHEN sp.shift_g8 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g8,
        SUM(CASE WHEN sp.shift_g8 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g8,
        SUM(CASE WHEN sp.shift_g9 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g9,
        SUM(CASE WHEN sp.shift_g9 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g9,
        SUM(CASE WHEN sp.shift_g9 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g9,
        SUM(CASE WHEN sp.shift_g10 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g10,
        SUM(CASE WHEN sp.shift_g10 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g10,
        SUM(CASE WHEN sp.shift_g10 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g10,
        SUM(CASE WHEN sp.shift_g11 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g11,
        SUM(CASE WHEN sp.shift_g11 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g11,
        SUM(CASE WHEN sp.shift_g11 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g11,
        SUM(CASE WHEN sp.shift_g12 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g12,
        SUM(CASE WHEN sp.shift_g12 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g12,
        SUM(CASE WHEN sp.shift_g12 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g12,

        -- LEARNING DELIVERY METRICS
        SUM(CASE WHEN sp.mode_kinder = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_k,
        SUM(CASE WHEN sp.mode_kinder LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_k,
        SUM(CASE WHEN sp.mode_kinder = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_k,
        SUM(CASE WHEN sp.mode_g1 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g1,
        SUM(CASE WHEN sp.mode_g1 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g1,
        SUM(CASE WHEN sp.mode_g1 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g1,
        SUM(CASE WHEN sp.mode_g2 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g2,
        SUM(CASE WHEN sp.mode_g2 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g2,
        SUM(CASE WHEN sp.mode_g2 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g2,
        SUM(CASE WHEN sp.mode_g3 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g3,
        SUM(CASE WHEN sp.mode_g3 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g3,
        SUM(CASE WHEN sp.mode_g3 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g3,
        SUM(CASE WHEN sp.mode_g4 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g4,
        SUM(CASE WHEN sp.mode_g4 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g4,
        SUM(CASE WHEN sp.mode_g4 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g4,
        SUM(CASE WHEN sp.mode_g5 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g5,
        SUM(CASE WHEN sp.mode_g5 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g5,
        SUM(CASE WHEN sp.mode_g5 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g5,
        SUM(CASE WHEN sp.mode_g6 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g6,
        SUM(CASE WHEN sp.mode_g6 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g6,
        SUM(CASE WHEN sp.mode_g6 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g6,
        SUM(CASE WHEN sp.mode_g7 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g7,
        SUM(CASE WHEN sp.mode_g7 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g7,
        SUM(CASE WHEN sp.mode_g7 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g7,
        SUM(CASE WHEN sp.mode_g8 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g8,
        SUM(CASE WHEN sp.mode_g8 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g8,
        SUM(CASE WHEN sp.mode_g8 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g8,
        SUM(CASE WHEN sp.mode_g9 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g9,
        SUM(CASE WHEN sp.mode_g9 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g9,
        SUM(CASE WHEN sp.mode_g9 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g9,
        SUM(CASE WHEN sp.mode_g10 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g10,
        SUM(CASE WHEN sp.mode_g10 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g10,
        SUM(CASE WHEN sp.mode_g10 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g10,
        SUM(CASE WHEN sp.mode_g11 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g11,
        SUM(CASE WHEN sp.mode_g11 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g11,
        SUM(CASE WHEN sp.mode_g11 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g11,
        SUM(CASE WHEN sp.mode_g12 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g12,
        SUM(CASE WHEN sp.mode_g12 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g12,
        SUM(CASE WHEN sp.mode_g12 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g12,

        -- EMERGENCY ADM METRICS
        SUM(CASE WHEN sp.adm_mdl IS TRUE THEN 1 ELSE 0 END) as cnt_adm_mdl,
        SUM(CASE WHEN sp.adm_odl IS TRUE THEN 1 ELSE 0 END) as cnt_adm_odl,
        SUM(CASE WHEN sp.adm_tvi IS TRUE THEN 1 ELSE 0 END) as cnt_adm_tvi,
        SUM(CASE WHEN sp.adm_blended IS TRUE THEN 1 ELSE 0 END) as cnt_adm_blended,

        -- TEACHER METRICS (COUNT BY GRADE/LEVEL)
        SUM(COALESCE(sp.teach_kinder, 0)) as cnt_teach_k,
        SUM(COALESCE(sp.teach_g1, 0)) as cnt_teach_g1,
        SUM(COALESCE(sp.teach_g2, 0)) as cnt_teach_g2,
        SUM(COALESCE(sp.teach_g3, 0)) as cnt_teach_g3,
        SUM(COALESCE(sp.teach_g4, 0)) as cnt_teach_g4,
        SUM(COALESCE(sp.teach_g5, 0)) as cnt_teach_g5,
        SUM(COALESCE(sp.teach_g6, 0)) as cnt_teach_g6,
        SUM(COALESCE(sp.teach_g7, 0)) as cnt_teach_g7,
        SUM(COALESCE(sp.teach_g8, 0)) as cnt_teach_g8,
        SUM(COALESCE(sp.teach_g9, 0)) as cnt_teach_g9,
        SUM(COALESCE(sp.teach_g10, 0)) as cnt_teach_g10,
        SUM(COALESCE(sp.teach_g11, 0)) as cnt_teach_g11,
        SUM(COALESCE(sp.teach_g12, 0)) as cnt_teach_g12,

        -- MULTIGRADE TEACHERS
        SUM(COALESCE(sp.teach_multi_1_2, 0)) as cnt_multi_1_2,
        SUM(COALESCE(sp.teach_multi_3_4, 0)) as cnt_multi_3_4,
        SUM(COALESCE(sp.teach_multi_5_6, 0)) as cnt_multi_5_6,

        -- TEACHING EXPERIENCE
        SUM(COALESCE(sp.teach_exp_0_1, 0)) as cnt_exp_0_1,
        SUM(COALESCE(sp.teach_exp_2_5, 0)) as cnt_exp_2_5,
        SUM(COALESCE(sp.teach_exp_6_10, 0)) as cnt_exp_6_10,
        SUM(COALESCE(sp.teach_exp_11_15, 0)) as cnt_exp_11_15,
        SUM(COALESCE(sp.teach_exp_16_20, 0)) as cnt_exp_16_20,
        SUM(COALESCE(sp.teach_exp_21_25, 0)) as cnt_exp_21_25,
        SUM(COALESCE(sp.teach_exp_26_30, 0)) as cnt_exp_26_30,
        SUM(COALESCE(sp.teach_exp_31_35, 0)) as cnt_exp_31_35,
        SUM(COALESCE(sp.teach_exp_36_40, 0)) as cnt_exp_36_40,
        SUM(COALESCE(sp.teach_exp_40_45, 0)) as cnt_exp_40_45,

        -- SPECIALIZATION (MAJORS)
        SUM(COALESCE(sp.spec_math_major, 0)) as cnt_spec_math,
        SUM(COALESCE(sp.spec_science_major, 0)) as cnt_spec_sci,
        SUM(COALESCE(sp.spec_english_major, 0)) as cnt_spec_eng,
        SUM(COALESCE(sp.spec_filipino_major, 0)) as cnt_spec_fil,
        SUM(COALESCE(sp.spec_ap_major, 0)) as cnt_spec_ap,
        SUM(COALESCE(sp.spec_mapeh_major, 0)) as cnt_spec_mapeh,
        SUM(COALESCE(sp.spec_esp_major, 0)) as cnt_spec_esp,
        SUM(COALESCE(sp.spec_tle_major, 0)) as cnt_spec_tle,
        SUM(COALESCE(sp.spec_general_major, 0)) as cnt_spec_gen,
        SUM(COALESCE(sp.spec_ece_major, 0)) as cnt_spec_ece,

        -- CLASSROOMS (Condition)
        SUM(COALESCE(sp.build_classrooms_new, 0)) as cnt_class_new,
        SUM(COALESCE(sp.build_classrooms_good, 0)) as cnt_class_good,
        SUM(COALESCE(sp.build_classrooms_repair, 0)) as cnt_class_repair,
        SUM(COALESCE(sp.build_classrooms_demolition, 0)) as cnt_class_demolish,

        -- EQUIPMENT & INVENTORY
        SUM(COALESCE(sp.res_ecart_func, 0)) as cnt_equip_ecart_func,
        SUM(COALESCE(sp.res_ecart_nonfunc, 0)) as cnt_equip_ecart_non,
        SUM(COALESCE(sp.res_laptop_func, 0)) as cnt_equip_laptop_func,
        SUM(COALESCE(sp.res_laptop_nonfunc, 0)) as cnt_equip_laptop_non,
        SUM(COALESCE(sp.res_printer_func, 0)) as cnt_equip_printer_func,
        SUM(COALESCE(sp.res_printer_nonfunc, 0)) as cnt_equip_printer_non,
        SUM(COALESCE(sp.res_tv_func, 0)) as cnt_equip_tv_func,
        SUM(COALESCE(sp.res_tv_nonfunc, 0)) as cnt_equip_tv_non,

        -- SEATS (By Grade)
        SUM(COALESCE(sp.seats_kinder, 0)) as cnt_seats_k,
        SUM(COALESCE(sp.seats_grade_1, 0)) as cnt_seats_g1,
        SUM(COALESCE(sp.seats_grade_2, 0)) as cnt_seats_g2,
        SUM(COALESCE(sp.seats_grade_3, 0)) as cnt_seats_g3,
        SUM(COALESCE(sp.seats_grade_4, 0)) as cnt_seats_g4,
        SUM(COALESCE(sp.seats_grade_5, 0)) as cnt_seats_g5,
        SUM(COALESCE(sp.seats_grade_6, 0)) as cnt_seats_g6,
        SUM(COALESCE(sp.seats_grade_7, 0)) as cnt_seats_g7,
        SUM(COALESCE(sp.seats_grade_8, 0)) as cnt_seats_g8,
        SUM(COALESCE(sp.seats_grade_9, 0)) as cnt_seats_g9,
        SUM(COALESCE(sp.seats_grade_10, 0)) as cnt_seats_g10,
        SUM(COALESCE(sp.seats_grade_11, 0)) as cnt_seats_g11,
        SUM(COALESCE(sp.seats_grade_12, 0)) as cnt_seats_g12,

        -- TOILETS (Comfort Rooms)
        SUM(COALESCE(sp.res_toilets_male, 0)) as cnt_toilet_male,
        SUM(COALESCE(sp.res_toilets_female, 0)) as cnt_toilet_female,
        SUM(COALESCE(sp.res_toilets_pwd, 0)) as cnt_toilet_pwd,
        SUM(COALESCE(sp.res_toilets_common, 0)) as cnt_toilet_common,

        -- SPECIALIZED ROOMS
        SUM(COALESCE(sp.res_sci_labs, 0)) as cnt_room_sci,
        SUM(COALESCE(sp.res_com_labs, 0)) as cnt_room_com,
        SUM(COALESCE(sp.res_tvl_workshops, 0)) as cnt_room_tvl,

        -- SITE & UTILITIES
        -- Electricity
        SUM(CASE WHEN sp.res_electricity_source = 'GRID SUPPLY' THEN 1 ELSE 0 END) as cnt_site_elec_grid,
        SUM(CASE WHEN sp.res_electricity_source LIKE '%OFF-GRID%' THEN 1 ELSE 0 END) as cnt_site_elec_offgrid,
        SUM(CASE WHEN sp.res_electricity_source = 'NO ELECTRICITY' THEN 1 ELSE 0 END) as cnt_site_elec_none,
        
        -- Water
        SUM(CASE WHEN sp.res_water_source LIKE '%Piped%' THEN 1 ELSE 0 END) as cnt_site_water_piped,
        SUM(CASE WHEN sp.res_water_source = 'Natural Resources' THEN 1 ELSE 0 END) as cnt_site_water_natural,
        SUM(CASE WHEN sp.res_water_source = 'No Water Source' THEN 1 ELSE 0 END) as cnt_site_water_none,

        -- Buildable Space
        SUM(CASE WHEN sp.res_buildable_space = 'Yes' THEN 1 ELSE 0 END) as cnt_site_build_yes,
        SUM(CASE WHEN sp.res_buildable_space = 'No' THEN 1 ELSE 0 END) as cnt_site_build_no,

        -- SHA (Hardship)
        SUM(CASE WHEN sp.sha_category LIKE '%HARDSHIP%' THEN 1 ELSE 0 END) as cnt_site_sha_hardship,
        SUM(CASE WHEN sp.sha_category LIKE '%MULTIGRADE%' THEN 1 ELSE 0 END) as cnt_site_sha_multi,


        -- HIERARCHICAL AGGREGATES
        
        -- SNED (Sum of Levels - Calculated from grades as requested)
        SUM(
            COALESCE(sp.stat_sned_k, 0) + 
            COALESCE(sp.stat_sned_g1, 0) + COALESCE(sp.stat_sned_g2, 0) + COALESCE(sp.stat_sned_g3, 0) + 
            COALESCE(sp.stat_sned_g4, 0) + COALESCE(sp.stat_sned_g5, 0) + COALESCE(sp.stat_sned_g6, 0)
        ) as stat_sned_es,
        
        SUM(
            COALESCE(sp.stat_sned_g7, 0) + COALESCE(sp.stat_sned_g8, 0) + 
            COALESCE(sp.stat_sned_g9, 0) + COALESCE(sp.stat_sned_g10, 0)
        ) as stat_sned_jhs,
        
        SUM(COALESCE(sp.stat_sned_g11, 0) + COALESCE(sp.stat_sned_g12, 0)) as stat_sned_shs,
        
        SUM(
            COALESCE(sp.stat_sned_k, 0) + 
            COALESCE(sp.stat_sned_g1, 0) + COALESCE(sp.stat_sned_g2, 0) + COALESCE(sp.stat_sned_g3, 0) + 
            COALESCE(sp.stat_sned_g4, 0) + COALESCE(sp.stat_sned_g5, 0) + COALESCE(sp.stat_sned_g6, 0) + 
            COALESCE(sp.stat_sned_g7, 0) + COALESCE(sp.stat_sned_g8, 0) + COALESCE(sp.stat_sned_g9, 0) + 
            COALESCE(sp.stat_sned_g10, 0) + COALESCE(sp.stat_sned_g11, 0) + COALESCE(sp.stat_sned_g12, 0)
        ) as stat_sned_total,

        -- DISABILITY (Sum of Levels)
        SUM(COALESCE(sp.stat_disability_es, 0)) as stat_disability_es,
        SUM(COALESCE(sp.stat_disability_jhs, 0)) as stat_disability_jhs,
        SUM(COALESCE(sp.stat_disability_shs, 0)) as stat_disability_shs,
        SUM(COALESCE(sp.stat_disability_es, 0) + COALESCE(sp.stat_disability_jhs, 0) + COALESCE(sp.stat_disability_shs, 0)) as stat_disability_total,

        -- ALS (Sum of Levels)
        SUM(COALESCE(sp.stat_als_es, 0)) as stat_als_es,
        SUM(COALESCE(sp.stat_als_jhs, 0)) as stat_als_jhs,
        SUM(COALESCE(sp.stat_als_shs, 0)) as stat_als_shs,
        SUM(COALESCE(sp.stat_als_es, 0) + COALESCE(sp.stat_als_jhs, 0) + COALESCE(sp.stat_als_shs, 0)) as stat_als_total,

        -- MUSLIM (Sum of Grades, as aggregates missing)
        SUM(
            COALESCE(sp.stat_muslim_k, 0) + COALESCE(sp.stat_muslim_g1, 0) + COALESCE(sp.stat_muslim_g2, 0) + 
            COALESCE(sp.stat_muslim_g3, 0) + COALESCE(sp.stat_muslim_g4, 0) + COALESCE(sp.stat_muslim_g5, 0) + 
            COALESCE(sp.stat_muslim_g6, 0)
        ) as stat_muslim_es,
        SUM(
            COALESCE(sp.stat_muslim_g7, 0) + COALESCE(sp.stat_muslim_g8, 0) + COALESCE(sp.stat_muslim_g9, 0) + 
            COALESCE(sp.stat_muslim_g10, 0)
        ) as stat_muslim_jhs,
        SUM(COALESCE(sp.stat_muslim_g11, 0) + COALESCE(sp.stat_muslim_g12, 0)) as stat_muslim_shs,
        SUM(
            COALESCE(sp.stat_muslim_k, 0) + COALESCE(sp.stat_muslim_g1, 0) + COALESCE(sp.stat_muslim_g2, 0) + 
            COALESCE(sp.stat_muslim_g3, 0) + COALESCE(sp.stat_muslim_g4, 0) + COALESCE(sp.stat_muslim_g5, 0) + 
            COALESCE(sp.stat_muslim_g6, 0) + COALESCE(sp.stat_muslim_g7, 0) + COALESCE(sp.stat_muslim_g8, 0) + 
            COALESCE(sp.stat_muslim_g9, 0) + COALESCE(sp.stat_muslim_g10, 0) + COALESCE(sp.stat_muslim_g11, 0) + 
            COALESCE(sp.stat_muslim_g12, 0)
        ) as stat_muslim_total,

        -- IP (Existing Total)
        SUM(COALESCE(sp.stat_ip_es, 0)) as stat_ip_es,
        SUM(COALESCE(sp.stat_ip_jhs, 0)) as stat_ip_jhs,
        SUM(COALESCE(sp.stat_ip_shs, 0)) as stat_ip_shs,
        SUM(COALESCE(sp.stat_ip, 0)) as stat_ip_total,

        -- DISPLACED (Existing Total)
        SUM(COALESCE(sp.stat_displaced_es, 0)) as stat_displaced_es,
        SUM(COALESCE(sp.stat_displaced_jhs, 0)) as stat_displaced_jhs,
        SUM(COALESCE(sp.stat_displaced_shs, 0)) as stat_displaced_shs,
        SUM(COALESCE(sp.stat_displaced, 0)) as stat_displaced_total,

        -- REPETITION (Existing Total)
        SUM(COALESCE(sp.stat_repetition_es, 0)) as stat_repetition_es,
        SUM(COALESCE(sp.stat_repetition_jhs, 0)) as stat_repetition_jhs,
        SUM(COALESCE(sp.stat_repetition_shs, 0)) as stat_repetition_shs,
        SUM(COALESCE(sp.stat_repetition, 0)) as stat_repetition_total,

        -- OVERAGE (Existing Total)
        SUM(COALESCE(sp.stat_overage_es, 0)) as stat_overage_es,
        SUM(COALESCE(sp.stat_overage_jhs, 0)) as stat_overage_jhs,
        SUM(COALESCE(sp.stat_overage_shs, 0)) as stat_overage_shs,
        SUM(COALESCE(sp.stat_overage, 0)) as stat_overage_total,

        -- DROPOUT (Sum of Levels, missing Total)
        SUM(COALESCE(sp.stat_dropout_es, 0)) as stat_dropout_es,
        SUM(COALESCE(sp.stat_dropout_jhs, 0)) as stat_dropout_jhs,
        SUM(COALESCE(sp.stat_dropout_shs, 0)) as stat_dropout_shs,
        SUM(COALESCE(sp.stat_dropout_es, 0) + COALESCE(sp.stat_dropout_jhs, 0) + COALESCE(sp.stat_dropout_shs, 0)) as stat_dropout_total
      FROM ph_schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      WHERE UPPER(TRIM(s.region)) ~* ('^' || $1 || '($|[^a-zA-Z0-9])')
      GROUP BY UPPER(TRIM(s.division))
      ORDER BY UPPER(TRIM(s.division))
    `;
    console.log("DEBUG: Running Division Stats for Region:", region);

    const result = await pool.query(query, [region]);

    // ADDED: Strip validation stats if role is RO/SDO
    const requestRole = req.query.role;
    if (requestRole === 'Regional Office' || requestRole === 'School Division Office') {
      const sanitized = result.rows.map(r => ({
        ...r,
        validated_schools: 0,
        for_validation_schools: 0
      }));
      return res.json(sanitized);
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Division Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch division stats", details: err.message });
  }
});

// --- 27. GET: District Stats (Within Division) ---
app.get('/api/monitoring/district-stats', async (req, res) => {
  const { region, division, groupBy } = req.query;

  let groupCol = 's.district';
  if (groupBy === 'legislative') groupCol = 's.legislative_district';
  if (groupBy === 'municipality') groupCol = 's.municipality';

  try {
    const query = `
      SELECT 
        UPPER(TRIM(${groupCol})) as district, 
        COUNT(s.school_id) as total_schools, 
        COUNT(CASE WHEN s.iern IS NOT NULL AND s.iern != '' THEN 1 END) as registered_schools,
        COUNT(CASE WHEN s.unit_completion >= 100 THEN 1 END) as completed_schools,
        COUNT(CASE WHEN s.iern IS NOT NULL AND s.iern != '' AND s.unit_completion >= 100 AND (ss.data_health_description = 'Excellent' OR sp.school_head_validation = TRUE) THEN 1 END) as validated_schools,
        COUNT(CASE WHEN s.iern IS NOT NULL AND s.iern != '' AND s.unit_completion >= 100 AND ss.data_health_description IS NOT NULL AND ss.data_health_description != 'Excellent' THEN 1 END) as for_validation_schools,
        ROUND(COALESCE(AVG(CASE WHEN s.iern IS NOT NULL AND s.iern != '' THEN s.unit_completion ELSE NULL END), 0), 1) as avg_completion,

        -- Map modular units to legacy names for frontend bars
        COALESCE(SUM(s.unit1), 0) as profile,
        COALESCE(SUM(s.unit1), 0) as head,
        COALESCE(SUM(s.unit2), 0) as enrollment,
        COALESCE(SUM(s.unit3), 0) as organizedclasses,
        COALESCE(SUM(s.unit4), 0) as learner_stats,
        COALESCE(SUM(s.unit5), 0) as shifting,
        COALESCE(SUM(s.unit6), 0) as personnel,
        COALESCE(SUM(s.unit7), 0) as resources,
        COALESCE(SUM(s.unit8), 0) as facilities,

        SUM(COALESCE(sp.total_enrollment, 0)) as total_enrollment,
        SUM(COALESCE(sp.grade_kinder, 0)) as grade_kinder,
        SUM(COALESCE(sp.grade_1, 0)) as grade_1,
        SUM(COALESCE(sp.grade_2, 0)) as grade_2,
        SUM(COALESCE(sp.grade_3, 0)) as grade_3,
        SUM(COALESCE(sp.grade_4, 0)) as grade_4,
        SUM(COALESCE(sp.grade_5, 0)) as grade_5,
        SUM(COALESCE(sp.grade_6, 0)) as grade_6,
        SUM(COALESCE(sp.grade_7, 0)) as grade_7,
        SUM(COALESCE(sp.grade_8, 0)) as grade_8,
        SUM(COALESCE(sp.grade_9, 0)) as grade_9,
        SUM(COALESCE(sp.grade_10, 0)) as grade_10,
        SUM(COALESCE(sp.grade_11, 0)) as grade_11,
        SUM(COALESCE(sp.grade_12, 0)) as grade_12,

        SUM(COALESCE(sp.classes_kinder, 0)) as classes_kinder,
        SUM(COALESCE(sp.classes_grade_1, 0)) as classes_grade_1,
        SUM(COALESCE(sp.classes_grade_2, 0)) as classes_grade_2,
        SUM(COALESCE(sp.classes_grade_3, 0)) as classes_grade_3,
        SUM(COALESCE(sp.classes_grade_4, 0)) as classes_grade_4,
        SUM(COALESCE(sp.classes_grade_5, 0)) as classes_grade_5,
        SUM(COALESCE(sp.classes_grade_6, 0)) as classes_grade_6,
        SUM(COALESCE(sp.classes_grade_7, 0)) as classes_grade_7,
        SUM(COALESCE(sp.classes_grade_8, 0)) as classes_grade_8,
        SUM(COALESCE(sp.classes_grade_9, 0)) as classes_grade_9,
        SUM(COALESCE(sp.classes_grade_10, 0)) as classes_grade_10,
        SUM(COALESCE(sp.classes_grade_11, 0)) as classes_grade_11,
        SUM(COALESCE(sp.classes_grade_12, 0)) as classes_grade_12,
        
        SUM(COALESCE(sp.aral_math_g1, 0)) as aral_math_g1,
        SUM(COALESCE(sp.aral_read_g1, 0)) as aral_read_g1,
        SUM(COALESCE(sp.aral_sci_g1, 0)) as aral_sci_g1,
        SUM(COALESCE(sp.aral_math_g2, 0)) as aral_math_g2,
        SUM(COALESCE(sp.aral_read_g2, 0)) as aral_read_g2,
        SUM(COALESCE(sp.aral_sci_g2, 0)) as aral_sci_g2,
        SUM(COALESCE(sp.aral_math_g3, 0)) as aral_math_g3,
        SUM(COALESCE(sp.aral_read_g3, 0)) as aral_read_g3,
        SUM(COALESCE(sp.aral_sci_g3, 0)) as aral_sci_g3,
        SUM(COALESCE(sp.aral_math_g4, 0)) as aral_math_g4,
        SUM(COALESCE(sp.aral_read_g4, 0)) as aral_read_g4,
        SUM(COALESCE(sp.aral_sci_g4, 0)) as aral_sci_g4,
        SUM(COALESCE(sp.aral_math_g5, 0)) as aral_math_g5,
        SUM(COALESCE(sp.aral_read_g5, 0)) as aral_read_g5,
        SUM(COALESCE(sp.aral_sci_g5, 0)) as aral_sci_g5,
        SUM(COALESCE(sp.aral_math_g6, 0)) as aral_math_g6,
        SUM(COALESCE(sp.aral_read_g6, 0)) as aral_read_g6,
        SUM(COALESCE(sp.aral_sci_g6, 0)) as aral_sci_g6,

        SUM(COALESCE(sp.cnt_less_kinder, 0)) as cnt_less_kinder,
        SUM(COALESCE(sp.cnt_within_kinder, 0)) as cnt_within_kinder,
        SUM(COALESCE(sp.cnt_above_kinder, 0)) as cnt_above_kinder,
        
        SUM(COALESCE(sp.cnt_less_g1, 0)) as cnt_less_g1,
        SUM(COALESCE(sp.cnt_within_g1, 0)) as cnt_within_g1,
        SUM(COALESCE(sp.cnt_above_g1, 0)) as cnt_above_g1,
        
        SUM(COALESCE(sp.cnt_less_g2, 0)) as cnt_less_g2,
        SUM(COALESCE(sp.cnt_within_g2, 0)) as cnt_within_g2,
        SUM(COALESCE(sp.cnt_above_g2, 0)) as cnt_above_g2,
        
        SUM(COALESCE(sp.cnt_less_g3, 0)) as cnt_less_g3,
        SUM(COALESCE(sp.cnt_within_g3, 0)) as cnt_within_g3,
        SUM(COALESCE(sp.cnt_above_g3, 0)) as cnt_above_g3,
        
        SUM(COALESCE(sp.cnt_less_g4, 0)) as cnt_less_g4,
        SUM(COALESCE(sp.cnt_within_g4, 0)) as cnt_within_g4,
        SUM(COALESCE(sp.cnt_above_g4, 0)) as cnt_above_g4,
        
        SUM(COALESCE(sp.cnt_less_g5, 0)) as cnt_less_g5,
        SUM(COALESCE(sp.cnt_within_g5, 0)) as cnt_within_g5,
        SUM(COALESCE(sp.cnt_above_g5, 0)) as cnt_above_g5,
        
        SUM(COALESCE(sp.cnt_less_g6, 0)) as cnt_less_g6,
        SUM(COALESCE(sp.cnt_within_g6, 0)) as cnt_within_g6,
        SUM(COALESCE(sp.cnt_above_g6, 0)) as cnt_above_g6,
        
        SUM(COALESCE(sp.cnt_less_g7, 0)) as cnt_less_g7,
        SUM(COALESCE(sp.cnt_within_g7, 0)) as cnt_within_g7,
        SUM(COALESCE(sp.cnt_above_g7, 0)) as cnt_above_g7,
        
        SUM(COALESCE(sp.cnt_less_g8, 0)) as cnt_less_g8,
        SUM(COALESCE(sp.cnt_within_g8, 0)) as cnt_within_g8,
        SUM(COALESCE(sp.cnt_above_g8, 0)) as cnt_above_g8,
        
        SUM(COALESCE(sp.cnt_less_g9, 0)) as cnt_less_g9,
        SUM(COALESCE(sp.cnt_within_g9, 0)) as cnt_within_g9,
        SUM(COALESCE(sp.cnt_above_g9, 0)) as cnt_above_g9,
        
        SUM(COALESCE(sp.cnt_less_g10, 0)) as cnt_less_g10,
        SUM(COALESCE(sp.cnt_within_g10, 0)) as cnt_within_g10,
        SUM(COALESCE(sp.cnt_above_g10, 0)) as cnt_above_g10,
        
        SUM(COALESCE(sp.cnt_less_g11, 0)) as cnt_less_g11,
        SUM(COALESCE(sp.cnt_within_g11, 0)) as cnt_within_g11,
        SUM(COALESCE(sp.cnt_above_g11, 0)) as cnt_above_g11,
        
        SUM(COALESCE(sp.cnt_less_g12, 0)) as cnt_less_g12,
        SUM(COALESCE(sp.cnt_within_g12, 0)) as cnt_within_g12,
        SUM(COALESCE(sp.cnt_above_g12, 0)) as cnt_above_g12,

        -- SNED
        SUM(COALESCE(sp.stat_sned_k, 0)) as stat_sned_k,
        SUM(COALESCE(sp.stat_sned_g1, 0)) as stat_sned_g1,
        SUM(COALESCE(sp.stat_sned_g2, 0)) as stat_sned_g2,
        SUM(COALESCE(sp.stat_sned_g3, 0)) as stat_sned_g3,
        SUM(COALESCE(sp.stat_sned_g4, 0)) as stat_sned_g4,
        SUM(COALESCE(sp.stat_sned_g5, 0)) as stat_sned_g5,
        SUM(COALESCE(sp.stat_sned_g6, 0)) as stat_sned_g6,
        SUM(COALESCE(sp.stat_sned_g7, 0)) as stat_sned_g7,
        SUM(COALESCE(sp.stat_sned_g8, 0)) as stat_sned_g8,
        SUM(COALESCE(sp.stat_sned_g9, 0)) as stat_sned_g9,
        SUM(COALESCE(sp.stat_sned_g10, 0)) as stat_sned_g10,
        SUM(COALESCE(sp.stat_sned_g11, 0)) as stat_sned_g11,
        SUM(COALESCE(sp.stat_sned_g12, 0)) as stat_sned_g12,

        -- DISABILITY
        SUM(COALESCE(sp.stat_disability_k, 0)) as stat_disability_k,
        SUM(COALESCE(sp.stat_disability_g1, 0)) as stat_disability_g1,
        SUM(COALESCE(sp.stat_disability_g2, 0)) as stat_disability_g2,
        SUM(COALESCE(sp.stat_disability_g3, 0)) as stat_disability_g3,
        SUM(COALESCE(sp.stat_disability_g4, 0)) as stat_disability_g4,
        SUM(COALESCE(sp.stat_disability_g5, 0)) as stat_disability_g5,
        SUM(COALESCE(sp.stat_disability_g6, 0)) as stat_disability_g6,
        SUM(COALESCE(sp.stat_disability_g7, 0)) as stat_disability_g7,
        SUM(COALESCE(sp.stat_disability_g8, 0)) as stat_disability_g8,
        SUM(COALESCE(sp.stat_disability_g9, 0)) as stat_disability_g9,
        SUM(COALESCE(sp.stat_disability_g10, 0)) as stat_disability_g10,
        SUM(COALESCE(sp.stat_disability_g11, 0)) as stat_disability_g11,
        SUM(COALESCE(sp.stat_disability_g12, 0)) as stat_disability_g12,

        -- ALS
        SUM(COALESCE(sp.stat_als_k, 0)) as stat_als_k,
        SUM(COALESCE(sp.stat_als_g1, 0)) as stat_als_g1,
        SUM(COALESCE(sp.stat_als_g2, 0)) as stat_als_g2,
        SUM(COALESCE(sp.stat_als_g3, 0)) as stat_als_g3,
        SUM(COALESCE(sp.stat_als_g4, 0)) as stat_als_g4,
        SUM(COALESCE(sp.stat_als_g5, 0)) as stat_als_g5,
        SUM(COALESCE(sp.stat_als_g6, 0)) as stat_als_g6,
        SUM(COALESCE(sp.stat_als_g7, 0)) as stat_als_g7,
        SUM(COALESCE(sp.stat_als_g8, 0)) as stat_als_g8,
        SUM(COALESCE(sp.stat_als_g9, 0)) as stat_als_g9,
        SUM(COALESCE(sp.stat_als_g10, 0)) as stat_als_g10,
        SUM(COALESCE(sp.stat_als_g11, 0)) as stat_als_g11,
        SUM(COALESCE(sp.stat_als_g12, 0)) as stat_als_g12,

        -- MUSLIM
        SUM(COALESCE(sp.stat_muslim_k, 0)) as stat_muslim_k,
        SUM(COALESCE(sp.stat_muslim_g1, 0)) as stat_muslim_g1,
        SUM(COALESCE(sp.stat_muslim_g2, 0)) as stat_muslim_g2,
        SUM(COALESCE(sp.stat_muslim_g3, 0)) as stat_muslim_g3,
        SUM(COALESCE(sp.stat_muslim_g4, 0)) as stat_muslim_g4,
        SUM(COALESCE(sp.stat_muslim_g5, 0)) as stat_muslim_g5,
        SUM(COALESCE(sp.stat_muslim_g6, 0)) as stat_muslim_g6,
        SUM(COALESCE(sp.stat_muslim_g7, 0)) as stat_muslim_g7,
        SUM(COALESCE(sp.stat_muslim_g8, 0)) as stat_muslim_g8,
        SUM(COALESCE(sp.stat_muslim_g9, 0)) as stat_muslim_g9,
        SUM(COALESCE(sp.stat_muslim_g10, 0)) as stat_muslim_g10,
        SUM(COALESCE(sp.stat_muslim_g11, 0)) as stat_muslim_g11,
        SUM(COALESCE(sp.stat_muslim_g12, 0)) as stat_muslim_g12,

        -- IP
        SUM(COALESCE(sp.stat_ip_k, 0)) as stat_ip_k,
        SUM(COALESCE(sp.stat_ip_g1, 0)) as stat_ip_g1,
        SUM(COALESCE(sp.stat_ip_g2, 0)) as stat_ip_g2,
        SUM(COALESCE(sp.stat_ip_g3, 0)) as stat_ip_g3,
        SUM(COALESCE(sp.stat_ip_g4, 0)) as stat_ip_g4,
        SUM(COALESCE(sp.stat_ip_g5, 0)) as stat_ip_g5,
        SUM(COALESCE(sp.stat_ip_g6, 0)) as stat_ip_g6,
        SUM(COALESCE(sp.stat_ip_g7, 0)) as stat_ip_g7,
        SUM(COALESCE(sp.stat_ip_g8, 0)) as stat_ip_g8,
        SUM(COALESCE(sp.stat_ip_g9, 0)) as stat_ip_g9,
        SUM(COALESCE(sp.stat_ip_g10, 0)) as stat_ip_g10,
        SUM(COALESCE(sp.stat_ip_g11, 0)) as stat_ip_g11,
        SUM(COALESCE(sp.stat_ip_g12, 0)) as stat_ip_g12,

        -- DISPLACED
        SUM(COALESCE(sp.stat_displaced_k, 0)) as stat_displaced_k,
        SUM(COALESCE(sp.stat_displaced_g1, 0)) as stat_displaced_g1,
        SUM(COALESCE(sp.stat_displaced_g2, 0)) as stat_displaced_g2,
        SUM(COALESCE(sp.stat_displaced_g3, 0)) as stat_displaced_g3,
        SUM(COALESCE(sp.stat_displaced_g4, 0)) as stat_displaced_g4,
        SUM(COALESCE(sp.stat_displaced_g5, 0)) as stat_displaced_g5,
        SUM(COALESCE(sp.stat_displaced_g6, 0)) as stat_displaced_g6,
        SUM(COALESCE(sp.stat_displaced_g7, 0)) as stat_displaced_g7,
        SUM(COALESCE(sp.stat_displaced_g8, 0)) as stat_displaced_g8,
        SUM(COALESCE(sp.stat_displaced_g9, 0)) as stat_displaced_g9,
        SUM(COALESCE(sp.stat_displaced_g10, 0)) as stat_displaced_g10,
        SUM(COALESCE(sp.stat_displaced_g11, 0)) as stat_displaced_g11,
        SUM(COALESCE(sp.stat_displaced_g12, 0)) as stat_displaced_g12,

        -- REPETITION
        SUM(COALESCE(sp.stat_repetition_k, 0)) as stat_repetition_k,
        SUM(COALESCE(sp.stat_repetition_g1, 0)) as stat_repetition_g1,
        SUM(COALESCE(sp.stat_repetition_g2, 0)) as stat_repetition_g2,
        SUM(COALESCE(sp.stat_repetition_g3, 0)) as stat_repetition_g3,
        SUM(COALESCE(sp.stat_repetition_g4, 0)) as stat_repetition_g4,
        SUM(COALESCE(sp.stat_repetition_g5, 0)) as stat_repetition_g5,
        SUM(COALESCE(sp.stat_repetition_g6, 0)) as stat_repetition_g6,
        SUM(COALESCE(sp.stat_repetition_g7, 0)) as stat_repetition_g7,
        SUM(COALESCE(sp.stat_repetition_g8, 0)) as stat_repetition_g8,
        SUM(COALESCE(sp.stat_repetition_g9, 0)) as stat_repetition_g9,
        SUM(COALESCE(sp.stat_repetition_g10, 0)) as stat_repetition_g10,
        SUM(COALESCE(sp.stat_repetition_g11, 0)) as stat_repetition_g11,
        SUM(COALESCE(sp.stat_repetition_g12, 0)) as stat_repetition_g12,

        -- OVERAGE
        SUM(COALESCE(sp.stat_overage_k, 0)) as stat_overage_k,
        SUM(COALESCE(sp.stat_overage_g1, 0)) as stat_overage_g1,
        SUM(COALESCE(sp.stat_overage_g2, 0)) as stat_overage_g2,
        SUM(COALESCE(sp.stat_overage_g3, 0)) as stat_overage_g3,
        SUM(COALESCE(sp.stat_overage_g4, 0)) as stat_overage_g4,
        SUM(COALESCE(sp.stat_overage_g5, 0)) as stat_overage_g5,
        SUM(COALESCE(sp.stat_overage_g6, 0)) as stat_overage_g6,
        SUM(COALESCE(sp.stat_overage_g7, 0)) as stat_overage_g7,
        SUM(COALESCE(sp.stat_overage_g8, 0)) as stat_overage_g8,
        SUM(COALESCE(sp.stat_overage_g9, 0)) as stat_overage_g9,
        SUM(COALESCE(sp.stat_overage_g10, 0)) as stat_overage_g10,
        SUM(COALESCE(sp.stat_overage_g11, 0)) as stat_overage_g11,
        SUM(COALESCE(sp.stat_overage_g12, 0)) as stat_overage_g12,

        -- DROPOUT
        SUM(COALESCE(sp.stat_dropout_k, 0)) as stat_dropout_k,
        SUM(COALESCE(sp.stat_dropout_g1, 0)) as stat_dropout_g1,
        SUM(COALESCE(sp.stat_dropout_g2, 0)) as stat_dropout_g2,
        SUM(COALESCE(sp.stat_dropout_g3, 0)) as stat_dropout_g3,
        SUM(COALESCE(sp.stat_dropout_g4, 0)) as stat_dropout_g4,
        SUM(COALESCE(sp.stat_dropout_g5, 0)) as stat_dropout_g5,
        SUM(COALESCE(sp.stat_dropout_g6, 0)) as stat_dropout_g6,
        SUM(COALESCE(sp.stat_dropout_g7, 0)) as stat_dropout_g7,
        SUM(COALESCE(sp.stat_dropout_g8, 0)) as stat_dropout_g8,
        SUM(COALESCE(sp.stat_dropout_g9, 0)) as stat_dropout_g9,
        SUM(COALESCE(sp.stat_dropout_g10, 0)) as stat_dropout_g10,
        SUM(COALESCE(sp.stat_dropout_g11, 0)) as stat_dropout_g11,
        SUM(COALESCE(sp.stat_dropout_g12, 0)) as stat_dropout_g12,

        -- SHIFTING METRICS
        SUM(CASE WHEN sp.shift_kinder = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_k,
        SUM(CASE WHEN sp.shift_kinder = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_k,
        SUM(CASE WHEN sp.shift_kinder = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_k,
        SUM(CASE WHEN sp.shift_g1 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g1,
        SUM(CASE WHEN sp.shift_g1 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g1,
        SUM(CASE WHEN sp.shift_g1 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g1,
        SUM(CASE WHEN sp.shift_g2 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g2,
        SUM(CASE WHEN sp.shift_g2 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g2,
        SUM(CASE WHEN sp.shift_g2 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g2,
        SUM(CASE WHEN sp.shift_g3 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g3,
        SUM(CASE WHEN sp.shift_g3 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g3,
        SUM(CASE WHEN sp.shift_g3 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g3,
        SUM(CASE WHEN sp.shift_g4 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g4,
        SUM(CASE WHEN sp.shift_g4 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g4,
        SUM(CASE WHEN sp.shift_g4 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g4,
        SUM(CASE WHEN sp.shift_g5 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g5,
        SUM(CASE WHEN sp.shift_g5 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g5,
        SUM(CASE WHEN sp.shift_g5 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g5,
        SUM(CASE WHEN sp.shift_g6 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g6,
        SUM(CASE WHEN sp.shift_g6 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g6,
        SUM(CASE WHEN sp.shift_g6 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g6,
        SUM(CASE WHEN sp.shift_g7 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g7,
        SUM(CASE WHEN sp.shift_g7 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g7,
        SUM(CASE WHEN sp.shift_g7 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g7,
        SUM(CASE WHEN sp.shift_g8 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g8,
        SUM(CASE WHEN sp.shift_g8 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g8,
        SUM(CASE WHEN sp.shift_g8 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g8,
        SUM(CASE WHEN sp.shift_g9 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g9,
        SUM(CASE WHEN sp.shift_g9 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g9,
        SUM(CASE WHEN sp.shift_g9 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g9,
        SUM(CASE WHEN sp.shift_g10 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g10,
        SUM(CASE WHEN sp.shift_g10 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g10,
        SUM(CASE WHEN sp.shift_g10 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g10,
        SUM(CASE WHEN sp.shift_g11 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g11,
        SUM(CASE WHEN sp.shift_g11 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g11,
        SUM(CASE WHEN sp.shift_g11 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g11,
        SUM(CASE WHEN sp.shift_g12 = 'Single Shift' THEN 1 ELSE 0 END) as cnt_shift_single_g12,
        SUM(CASE WHEN sp.shift_g12 = 'Double Shift' THEN 1 ELSE 0 END) as cnt_shift_double_g12,
        SUM(CASE WHEN sp.shift_g12 = 'Triple Shift' THEN 1 ELSE 0 END) as cnt_shift_triple_g12,

        -- LEARNING DELIVERY METRICS
        SUM(CASE WHEN sp.mode_kinder = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_k,
        SUM(CASE WHEN sp.mode_kinder LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_k,
        SUM(CASE WHEN sp.mode_kinder = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_k,
        SUM(CASE WHEN sp.mode_g1 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g1,
        SUM(CASE WHEN sp.mode_g1 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g1,
        SUM(CASE WHEN sp.mode_g1 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g1,
        SUM(CASE WHEN sp.mode_g2 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g2,
        SUM(CASE WHEN sp.mode_g2 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g2,
        SUM(CASE WHEN sp.mode_g2 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g2,
        SUM(CASE WHEN sp.mode_g3 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g3,
        SUM(CASE WHEN sp.mode_g3 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g3,
        SUM(CASE WHEN sp.mode_g3 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g3,
        SUM(CASE WHEN sp.mode_g4 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g4,
        SUM(CASE WHEN sp.mode_g4 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g4,
        SUM(CASE WHEN sp.mode_g4 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g4,
        SUM(CASE WHEN sp.mode_g5 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g5,
        SUM(CASE WHEN sp.mode_g5 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g5,
        SUM(CASE WHEN sp.mode_g5 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g5,
        SUM(CASE WHEN sp.mode_g6 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g6,
        SUM(CASE WHEN sp.mode_g6 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g6,
        SUM(CASE WHEN sp.mode_g6 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g6,
        SUM(CASE WHEN sp.mode_g7 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g7,
        SUM(CASE WHEN sp.mode_g7 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g7,
        SUM(CASE WHEN sp.mode_g7 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g7,
        SUM(CASE WHEN sp.mode_g8 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g8,
        SUM(CASE WHEN sp.mode_g8 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g8,
        SUM(CASE WHEN sp.mode_g8 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g8,
        SUM(CASE WHEN sp.mode_g9 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g9,
        SUM(CASE WHEN sp.mode_g9 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g9,
        SUM(CASE WHEN sp.mode_g9 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g9,
        SUM(CASE WHEN sp.mode_g10 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g10,
        SUM(CASE WHEN sp.mode_g10 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g10,
        SUM(CASE WHEN sp.mode_g10 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g10,
        SUM(CASE WHEN sp.mode_g11 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g11,
        SUM(CASE WHEN sp.mode_g11 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g11,
        SUM(CASE WHEN sp.mode_g11 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g11,
        SUM(CASE WHEN sp.mode_g12 = 'In-Person Classes' THEN 1 ELSE 0 END) as cnt_mode_inperson_g12,
        SUM(CASE WHEN sp.mode_g12 LIKE '%Blended%' THEN 1 ELSE 0 END) as cnt_mode_blended_g12,
        SUM(CASE WHEN sp.mode_g12 = 'Full Distance Learning' THEN 1 ELSE 0 END) as cnt_mode_distance_g12,

        -- EMERGENCY ADM METRICS
        SUM(CASE WHEN sp.adm_mdl IS TRUE THEN 1 ELSE 0 END) as cnt_adm_mdl,
        SUM(CASE WHEN sp.adm_odl IS TRUE THEN 1 ELSE 0 END) as cnt_adm_odl,
        SUM(CASE WHEN sp.adm_tvi IS TRUE THEN 1 ELSE 0 END) as cnt_adm_tvi,
        SUM(CASE WHEN sp.adm_blended IS TRUE THEN 1 ELSE 0 END) as cnt_adm_blended,

        -- TEACHER METRICS (COUNT BY GRADE/LEVEL)
        SUM(COALESCE(sp.teach_kinder, 0)) as cnt_teach_k,
        SUM(COALESCE(sp.teach_g1, 0)) as cnt_teach_g1,
        SUM(COALESCE(sp.teach_g2, 0)) as cnt_teach_g2,
        SUM(COALESCE(sp.teach_g3, 0)) as cnt_teach_g3,
        SUM(COALESCE(sp.teach_g4, 0)) as cnt_teach_g4,
        SUM(COALESCE(sp.teach_g5, 0)) as cnt_teach_g5,
        SUM(COALESCE(sp.teach_g6, 0)) as cnt_teach_g6,
        SUM(COALESCE(sp.teach_g7, 0)) as cnt_teach_g7,
        SUM(COALESCE(sp.teach_g8, 0)) as cnt_teach_g8,
        SUM(COALESCE(sp.teach_g9, 0)) as cnt_teach_g9,
        SUM(COALESCE(sp.teach_g10, 0)) as cnt_teach_g10,
        SUM(COALESCE(sp.teach_g11, 0)) as cnt_teach_g11,
        SUM(COALESCE(sp.teach_g12, 0)) as cnt_teach_g12,

        -- MULTIGRADE TEACHERS
        SUM(COALESCE(sp.teach_multi_1_2, 0)) as cnt_multi_1_2,
        SUM(COALESCE(sp.teach_multi_3_4, 0)) as cnt_multi_3_4,
        SUM(COALESCE(sp.teach_multi_5_6, 0)) as cnt_multi_5_6,

        -- TEACHING EXPERIENCE
        SUM(COALESCE(sp.teach_exp_0_1, 0)) as cnt_exp_0_1,
        SUM(COALESCE(sp.teach_exp_2_5, 0)) as cnt_exp_2_5,
        SUM(COALESCE(sp.teach_exp_6_10, 0)) as cnt_exp_6_10,
        SUM(COALESCE(sp.teach_exp_11_15, 0)) as cnt_exp_11_15,
        SUM(COALESCE(sp.teach_exp_16_20, 0)) as cnt_exp_16_20,
        SUM(COALESCE(sp.teach_exp_21_25, 0)) as cnt_exp_21_25,
        SUM(COALESCE(sp.teach_exp_26_30, 0)) as cnt_exp_26_30,
        SUM(COALESCE(sp.teach_exp_31_35, 0)) as cnt_exp_31_35,
        SUM(COALESCE(sp.teach_exp_36_40, 0)) as cnt_exp_36_40,
        SUM(COALESCE(sp.teach_exp_40_45, 0)) as cnt_exp_40_45,

        -- SPECIALIZATION (MAJORS)
        SUM(COALESCE(sp.spec_math_major, 0)) as cnt_spec_math,
        SUM(COALESCE(sp.spec_science_major, 0)) as cnt_spec_sci,
        SUM(COALESCE(sp.spec_english_major, 0)) as cnt_spec_eng,
        SUM(COALESCE(sp.spec_filipino_major, 0)) as cnt_spec_fil,
        SUM(COALESCE(sp.spec_ap_major, 0)) as cnt_spec_ap,
        SUM(COALESCE(sp.spec_mapeh_major, 0)) as cnt_spec_mapeh,
        SUM(COALESCE(sp.spec_esp_major, 0)) as cnt_spec_esp,
        SUM(COALESCE(sp.spec_tle_major, 0)) as cnt_spec_tle,
        SUM(COALESCE(sp.spec_general_major, 0)) as cnt_spec_gen,
        SUM(COALESCE(sp.spec_ece_major, 0)) as cnt_spec_ece,

        -- CLASSROOMS (Condition)
        SUM(COALESCE(sp.build_classrooms_new, 0)) as cnt_class_new,
        SUM(COALESCE(sp.build_classrooms_good, 0)) as cnt_class_good,
        SUM(COALESCE(sp.build_classrooms_repair, 0)) as cnt_class_repair,
        SUM(COALESCE(sp.build_classrooms_demolition, 0)) as cnt_class_demolish,

        -- EQUIPMENT & INVENTORY
        SUM(COALESCE(sp.res_ecart_func, 0)) as cnt_equip_ecart_func,
        SUM(COALESCE(sp.res_ecart_nonfunc, 0)) as cnt_equip_ecart_non,
        SUM(COALESCE(sp.res_laptop_func, 0)) as cnt_equip_laptop_func,
        SUM(COALESCE(sp.res_laptop_nonfunc, 0)) as cnt_equip_laptop_non,
        SUM(COALESCE(sp.res_printer_func, 0)) as cnt_equip_printer_func,
        SUM(COALESCE(sp.res_printer_nonfunc, 0)) as cnt_equip_printer_non,
        SUM(COALESCE(sp.res_tv_func, 0)) as cnt_equip_tv_func,
        SUM(COALESCE(sp.res_tv_nonfunc, 0)) as cnt_equip_tv_non,

        -- SEATS (By Grade)
        SUM(COALESCE(sp.seats_kinder, 0)) as cnt_seats_k,
        SUM(COALESCE(sp.seats_grade_1, 0)) as cnt_seats_g1,
        SUM(COALESCE(sp.seats_grade_2, 0)) as cnt_seats_g2,
        SUM(COALESCE(sp.seats_grade_3, 0)) as cnt_seats_g3,
        SUM(COALESCE(sp.seats_grade_4, 0)) as cnt_seats_g4,
        SUM(COALESCE(sp.seats_grade_5, 0)) as cnt_seats_g5,
        SUM(COALESCE(sp.seats_grade_6, 0)) as cnt_seats_g6,
        SUM(COALESCE(sp.seats_grade_7, 0)) as cnt_seats_g7,
        SUM(COALESCE(sp.seats_grade_8, 0)) as cnt_seats_g8,
        SUM(COALESCE(sp.seats_grade_9, 0)) as cnt_seats_g9,
        SUM(COALESCE(sp.seats_grade_10, 0)) as cnt_seats_g10,
        SUM(COALESCE(sp.seats_grade_11, 0)) as cnt_seats_g11,
        SUM(COALESCE(sp.seats_grade_12, 0)) as cnt_seats_g12,

        -- TOILETS (Comfort Rooms)
        SUM(COALESCE(sp.res_toilets_male, 0)) as cnt_toilet_male,
        SUM(COALESCE(sp.res_toilets_female, 0)) as cnt_toilet_female,
        SUM(COALESCE(sp.res_toilets_pwd, 0)) as cnt_toilet_pwd,
        SUM(COALESCE(sp.res_toilets_common, 0)) as cnt_toilet_common,

        -- SPECIALIZED ROOMS
        SUM(COALESCE(sp.res_sci_labs, 0)) as cnt_room_sci,
        SUM(COALESCE(sp.res_com_labs, 0)) as cnt_room_com,
        SUM(COALESCE(sp.res_tvl_workshops, 0)) as cnt_room_tvl,

        -- SITE & UTILITIES
        -- Electricity
        SUM(CASE WHEN sp.res_electricity_source = 'GRID SUPPLY' THEN 1 ELSE 0 END) as cnt_site_elec_grid,
        SUM(CASE WHEN sp.res_electricity_source LIKE '%OFF-GRID%' THEN 1 ELSE 0 END) as cnt_site_elec_offgrid,
        SUM(CASE WHEN sp.res_electricity_source = 'NO ELECTRICITY' THEN 1 ELSE 0 END) as cnt_site_elec_none,
        
        -- Water
        SUM(CASE WHEN sp.res_water_source LIKE '%Piped%' THEN 1 ELSE 0 END) as cnt_site_water_piped,
        SUM(CASE WHEN sp.res_water_source = 'Natural Resources' THEN 1 ELSE 0 END) as cnt_site_water_natural,
        SUM(CASE WHEN sp.res_water_source = 'No Water Source' THEN 1 ELSE 0 END) as cnt_site_water_none,

        -- Buildable Space
        SUM(CASE WHEN sp.res_buildable_space = 'Yes' THEN 1 ELSE 0 END) as cnt_site_build_yes,
        SUM(CASE WHEN sp.res_buildable_space = 'No' THEN 1 ELSE 0 END) as cnt_site_build_no,

        -- SHA (Hardship)
        SUM(CASE WHEN sp.sha_category LIKE '%HARDSHIP%' THEN 1 ELSE 0 END) as cnt_site_sha_hardship,
        SUM(CASE WHEN sp.sha_category LIKE '%MULTIGRADE%' THEN 1 ELSE 0 END) as cnt_site_sha_multi,


        -- HIERARCHICAL AGGREGATES
        
        -- SNED (Sum of Levels - Calculated from grades as requested)
        SUM(
            COALESCE(sp.stat_sned_k, 0) + 
            COALESCE(sp.stat_sned_g1, 0) + COALESCE(sp.stat_sned_g2, 0) + COALESCE(sp.stat_sned_g3, 0) + 
            COALESCE(sp.stat_sned_g4, 0) + COALESCE(sp.stat_sned_g5, 0) + COALESCE(sp.stat_sned_g6, 0)
        ) as stat_sned_es,
        
        SUM(
            COALESCE(sp.stat_sned_g7, 0) + COALESCE(sp.stat_sned_g8, 0) + 
            COALESCE(sp.stat_sned_g9, 0) + COALESCE(sp.stat_sned_g10, 0)
        ) as stat_sned_jhs,
        
        SUM(COALESCE(sp.stat_sned_g11, 0) + COALESCE(sp.stat_sned_g12, 0)) as stat_sned_shs,
        
        SUM(
            COALESCE(sp.stat_sned_k, 0) + 
            COALESCE(sp.stat_sned_g1, 0) + COALESCE(sp.stat_sned_g2, 0) + COALESCE(sp.stat_sned_g3, 0) + 
            COALESCE(sp.stat_sned_g4, 0) + COALESCE(sp.stat_sned_g5, 0) + COALESCE(sp.stat_sned_g6, 0) + 
            COALESCE(sp.stat_sned_g7, 0) + COALESCE(sp.stat_sned_g8, 0) + COALESCE(sp.stat_sned_g9, 0) + 
            COALESCE(sp.stat_sned_g10, 0) + COALESCE(sp.stat_sned_g11, 0) + COALESCE(sp.stat_sned_g12, 0)
        ) as stat_sned_total,

        -- DISABILITY (Sum of Levels)
        SUM(COALESCE(sp.stat_disability_es, 0)) as stat_disability_es,
        SUM(COALESCE(sp.stat_disability_jhs, 0)) as stat_disability_jhs,
        SUM(COALESCE(sp.stat_disability_shs, 0)) as stat_disability_shs,
        SUM(COALESCE(sp.stat_disability_es, 0) + COALESCE(sp.stat_disability_jhs, 0) + COALESCE(sp.stat_disability_shs, 0)) as stat_disability_total,

        -- ALS (Sum of Levels)
        SUM(COALESCE(sp.stat_als_es, 0)) as stat_als_es,
        SUM(COALESCE(sp.stat_als_jhs, 0)) as stat_als_jhs,
        SUM(COALESCE(sp.stat_als_shs, 0)) as stat_als_shs,
        SUM(COALESCE(sp.stat_als_es, 0) + COALESCE(sp.stat_als_jhs, 0) + COALESCE(sp.stat_als_shs, 0)) as stat_als_total,

        -- MUSLIM (Sum of Grades, as aggregates missing)
        SUM(
            COALESCE(sp.stat_muslim_k, 0) + COALESCE(sp.stat_muslim_g1, 0) + COALESCE(sp.stat_muslim_g2, 0) + 
            COALESCE(sp.stat_muslim_g3, 0) + COALESCE(sp.stat_muslim_g4, 0) + COALESCE(sp.stat_muslim_g5, 0) + 
            COALESCE(sp.stat_muslim_g6, 0)
        ) as stat_muslim_es,
        SUM(
            COALESCE(sp.stat_muslim_g7, 0) + COALESCE(sp.stat_muslim_g8, 0) + COALESCE(sp.stat_muslim_g9, 0) + 
            COALESCE(sp.stat_muslim_g10, 0)
        ) as stat_muslim_jhs,
        SUM(COALESCE(sp.stat_muslim_g11, 0) + COALESCE(sp.stat_muslim_g12, 0)) as stat_muslim_shs,
        SUM(
            COALESCE(sp.stat_muslim_k, 0) + COALESCE(sp.stat_muslim_g1, 0) + COALESCE(sp.stat_muslim_g2, 0) + 
            COALESCE(sp.stat_muslim_g3, 0) + COALESCE(sp.stat_muslim_g4, 0) + COALESCE(sp.stat_muslim_g5, 0) + 
            COALESCE(sp.stat_muslim_g6, 0) + COALESCE(sp.stat_muslim_g7, 0) + COALESCE(sp.stat_muslim_g8, 0) + 
            COALESCE(sp.stat_muslim_g9, 0) + COALESCE(sp.stat_muslim_g10, 0) + COALESCE(sp.stat_muslim_g11, 0) + 
            COALESCE(sp.stat_muslim_g12, 0)
        ) as stat_muslim_total,

        -- IP (Existing Total)
        SUM(COALESCE(sp.stat_ip_es, 0)) as stat_ip_es,
        SUM(COALESCE(sp.stat_ip_jhs, 0)) as stat_ip_jhs,
        SUM(COALESCE(sp.stat_ip_shs, 0)) as stat_ip_shs,
        SUM(COALESCE(sp.stat_ip, 0)) as stat_ip_total,

        -- DISPLACED (Existing Total)
        SUM(COALESCE(sp.stat_displaced_es, 0)) as stat_displaced_es,
        SUM(COALESCE(sp.stat_displaced_jhs, 0)) as stat_displaced_jhs,
        SUM(COALESCE(sp.stat_displaced_shs, 0)) as stat_displaced_shs,
        SUM(COALESCE(sp.stat_displaced, 0)) as stat_displaced_total,

        -- REPETITION (Existing Total)
        SUM(COALESCE(sp.stat_repetition_es, 0)) as stat_repetition_es,
        SUM(COALESCE(sp.stat_repetition_jhs, 0)) as stat_repetition_jhs,
        SUM(COALESCE(sp.stat_repetition_shs, 0)) as stat_repetition_shs,
        SUM(COALESCE(sp.stat_repetition, 0)) as stat_repetition_total,

        -- OVERAGE (Existing Total)
        SUM(COALESCE(sp.stat_overage_es, 0)) as stat_overage_es,
        SUM(COALESCE(sp.stat_overage_jhs, 0)) as stat_overage_jhs,
        SUM(COALESCE(sp.stat_overage_shs, 0)) as stat_overage_shs,
        SUM(COALESCE(sp.stat_overage, 0)) as stat_overage_total,

        -- DROPOUT (Sum of Levels, missing Total)
        SUM(COALESCE(sp.stat_dropout_es, 0)) as stat_dropout_es,
        SUM(COALESCE(sp.stat_dropout_jhs, 0)) as stat_dropout_jhs,
        SUM(COALESCE(sp.stat_dropout_shs, 0)) as stat_dropout_shs,
        SUM(COALESCE(sp.stat_dropout_es, 0) + COALESCE(sp.stat_dropout_jhs, 0) + COALESCE(sp.stat_dropout_shs, 0)) as stat_dropout_total
      FROM ph_schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      WHERE UPPER(TRIM(s.region)) ~* ('^' || $1 || '($|[^a-zA-Z0-9])') AND
            UPPER(TRIM(s.division)) = UPPER(TRIM($2))
      GROUP BY UPPER(TRIM(${groupCol}))
      ORDER BY UPPER(TRIM(${groupCol})) ASC
    `;

    const result = await pool.query(query, [region, division]);

    // ADDED: Strip validation stats if role is RO/SDO
    const requestRole = req.query.role;
    if (requestRole === 'Regional Office' || requestRole === 'School Division Office') {
      const sanitized = result.rows.map(r => ({
        ...r,
        validated_schools: 0,
        for_validation_schools: 0
      }));
      return res.json(sanitized);
    }

    res.json(result.rows);
  } catch (err) {
    console.error("District Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch district stats" });
  }
});

// --- 26. GET: List Schools in Jurisdiction (Paginated) ---
app.get('/api/monitoring/schools', async (req, res) => {
  const { region, division, page, limit, search, unregistered } = req.query;
  try {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Base WHERE using schools table (source of truth)
    let whereClauses = [];
    let params = [];
    // removed: whereClauses.push(`s.iern IS NOT NULL`);
    if (region) {
      whereClauses.push(`UPPER(TRIM(s.region)) ~* ('^' || $${params.length + 1} || '($|[^a-zA-Z0-9])')`);
      params.push(region);
    }

    if (division) {
      whereClauses.push(`UPPER(TRIM(s.division)) = UPPER(TRIM($${params.length + 1}))`);
      params.push(division);
    }

    if (req.query.district) {
      whereClauses.push(`UPPER(TRIM(s.district)) = UPPER(TRIM($${params.length + 1}))`);
      params.push(req.query.district);
    }

    if (search) {
      whereClauses.push(`(s.school_name ILIKE $${params.length + 1} OR s.school_id ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (unregistered === 'true') {
      whereClauses.push(`sp.school_id IS NULL`);
    }

    // common SELECT fields with SAFE casting
    // We use schools table (s) for identity
    // We use school_profiles (sp) for status_of_construction_phase, handling NULLs with COALESCE
    const selectFields = `
      s.unit_completion as completion_percentage,
      s.school_name,
      s.school_id,
      COALESCE(sp.total_enrollment, 0) as total_enrollment,
      
      (COALESCE(s.unit1, 0) > 0) as profile_status,
      (COALESCE(s.unit1, 0) > 0) as head_status,
      (COALESCE(s.unit2, 0) > 0) as enrollment_status,
      (COALESCE(s.unit3, 0) > 0) as classes_status,
      (COALESCE(s.unit5, 0) > 0) as shifting_status,
      (COALESCE(s.unit6, 0) > 0) as personnel_status,
      (COALESCE(s.unit6, 0) > 0) as specialization_status,
      (COALESCE(s.unit7, 0) > 0) as resources_status,
      (COALESCE(s.unit4, 0) > 0) as learner_stats_status,
      (COALESCE(s.unit8, 0) > 0) as facilities_status,
      
      sp.submitted_by,
      sp.school_head_validation,
      ss.data_health_description,
      ss.data_health_score,
      ss.issues as data_quality_issues
    `;

    // ADDED: Strip validation fields if role is RO/SDO (Optional param for now to avoid breaking existing users)
    const requestRole = req.query.role;
    const isRestricted = requestRole === 'Regional Office' || requestRole === 'School Division Office';

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // COUNT Query (Count from schools table)
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM ph_schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      ${whereSql}
    `;
    console.log("DEBUG: Running Schools List Count for Region:", region, "Division:", division);
    const countRes = await pool.query(countQuery, params);
    const totalItems = parseInt(countRes.rows[0].total);

    // DATA Query
    const dataQuery = `
      SELECT ${selectFields}
      FROM ph_schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      ${whereSql}
      ORDER BY s.unit_completion DESC NULLS LAST, s.school_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // Add pagination params
    const queryParams = [...params, limitNum, offset];

    const result = await pool.query(dataQuery, queryParams);

    // Return structured response
    let finalData = result.rows;
    if (isRestricted) {
      finalData = result.rows.map(r => {
        const { school_head_validation, data_health_description, data_health_score, data_quality_issues, ...rest } = r;
        return rest;
      });
    }

    res.json({
      data: finalData,
      total: totalItems,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalItems / limitNum)
    });
  } catch (err) {
    console.error("Jurisdiction Schools Error:", err);
    res.status(500).json({ error: "Failed to fetch schools", details: err.message });
  }
});

// --- 27. GET: Engineer Project Stats for Jurisdiction ---
app.get('/api/monitoring/engineer-stats', async (req, res) => {
  const { region, division } = req.query;
  if (!region) {
    return res.json({ total_projects: 0, avg_progress: 0, completed_count: 0, ongoing_count: 0, delayed_count: 0, total_allocation: 0, total_contract_amount: 0 });
  }
  try {
    let query = `
      WITH LatestProjects AS (
        SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
          school_id, accomplishment_percentage, status_of_construction_phase AS status, approved_budget_for_contract, contract_amount, region, division
        FROM engineer_form
        ORDER BY COALESCE(ipc, project_id::text), created_at DESC
      )
      SELECT 
        COUNT(*) as total_projects,
        AVG(p.accomplishment_percentage):: NUMERIC(10, 2) as avg_progress,
        COUNT(CASE WHEN p.status = 'Completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN p.status = 'Ongoing' THEN 1 END) as ongoing_count,
        COUNT(CASE WHEN p.status = 'Delayed' THEN 1 END) as delayed_count,
        COALESCE(SUM(p.approved_budget_for_contract), 0) as total_allocation,
        COALESCE(SUM(p.contract_amount), 0) as total_contract_amount
      FROM LatestProjects p
      LEFT JOIN school_profiles sp ON p.school_id = sp.school_id
      WHERE UPPER(TRIM(p.region)) = UPPER(TRIM($1))
    `;
    let params = [region];

    if (division) {
      query += ` AND UPPER(TRIM(p.division)) = UPPER(TRIM($2))`;
      params.push(division);
    }

    if (req.query.district) {
      query += ` AND UPPER(TRIM(sp.district)) = UPPER(TRIM($${params.length + 1}))`;
      params.push(req.query.district);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Engineer Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch engineer stats", details: err.message });
  }
});

// --- 28. GET: All Engineer Projects for Jurisdiction ---
app.get('/api/monitoring/engineer-projects', async (req, res) => {
  const { region, division } = req.query;
  if (!region) {
    return res.json([]);
  }
  try {
    let query = `
      WITH LatestProjects AS (
         SELECT DISTINCT ON (COALESCE(e.ipc, e.project_id::text)) 
            e.project_id, e.project_name, e.school_id, e.school_name, e.accomplishment_percentage, e.status_of_construction_phase AS status, 
            e.approved_budget_for_contract, e.contract_amount, e.validation_status, e.status_as_of, e.region, e.division, e.created_at
         FROM engineer_form e

         ORDER BY COALESCE(e.ipc, e.project_id::text), e.created_at DESC
      )
      SELECT
        p.project_id as id, p.project_name as "projectName", p.school_id as "schoolId", p.school_name as "schoolName",
        p.accomplishment_percentage as "accomplishmentPercentage", p.status as "status", 
        p.approved_budget_for_contract as "projectAllocation",
        p.contract_amount as "contractAmount",
        p.validation_status as "validation_status", p.status_as_of as "statusAsOfDate"
      FROM LatestProjects p
      LEFT JOIN school_profiles sp ON p.school_id = sp.school_id
      WHERE UPPER(TRIM(p.region)) = UPPER(TRIM($1))
    `;
    let params = [region];

    if (division) {
      query += ` AND UPPER(TRIM(p.division)) = UPPER(TRIM($2))`;
      params.push(division);
    }

    if (req.query.district) {
      query += ` AND TRIM(sp.district) = TRIM($${params.length + 1})`;
      params.push(req.query.district);
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Jurisdiction Projects Error:", err);
    res.status(500).json({ error: "Failed to fetch projects", details: err.message });
  }
});

// --- 28. GET: Full School Profile for Monitor (by School ID) ---
app.get('/api/monitoring/school-detail/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE school_id = $1', [schoolId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "School not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch school details" });
  }
});

// --- 29. GET: Engineer Projects for a School (Monitor View) ---
app.get('/api/monitoring/school-projects/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const query = `
SELECT 
  e.project_id, e.project_name, e.school_id, e.school_name, e.status_of_construction_phase, e.accomplishment_percentage,
  e.approved_budget_for_contract, e.contract_amount, e.status_as_of, e.created_at
FROM engineer_form e

WHERE school_id = $1 
ORDER BY created_at DESC
  `;
    const result = await pool.query(query, [schoolId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// --- 30. GET: Leaderboard Data ---
// --- 30. GET: Leaderboard Data ---
app.get('/api/leaderboard', async (req, res) => {
  const { scope, filter } = req.query;

  try {
    // 1. NATIONAL SCOPE: Return list of REGIONS
    if (scope === 'national') {
      const query = `
        SELECT 
          region as name,
          ROUND(AVG(completion_percentage), 0) as avg_completion
        FROM school_profiles
        WHERE region IS NOT NULL
        GROUP BY region
        ORDER BY avg_completion DESC
      `;
      const result = await pool.query(query);
      return res.json({ regions: result.rows });
    }

    // 2. REGIONAL SCOPE or ALL DIVISIONS: Return list of DIVISIONS
    if (scope === 'national_divisions' || (scope === 'region' && filter)) {
      let query = `
        SELECT 
          division as name,
          ROUND(AVG(completion_percentage), 0) as avg_completion
        FROM school_profiles
        WHERE division IS NOT NULL
      `;
      const params = [];

      if (scope === 'region' && filter) {
        query += ` AND TRIM(region) = TRIM($1)`;
        params.push(filter);
      }

      query += ` GROUP BY division ORDER BY avg_completion DESC`;

      const result = await pool.query(query, params);
      return res.json({ divisions: result.rows });
    }

    // 3. DIVISION SCOPE: Return list of SCHOOLS
    if (scope === 'division' && filter) {
      const query = `
        SELECT 
          school_id, school_name, region, division, district,
          completion_percentage as completion_rate, -- ALIAS FOR FRONTEND
          updated_at
        FROM school_profiles
        WHERE TRIM(division) = TRIM($1)
        ORDER BY completion_percentage DESC, updated_at DESC LIMIT 50
      `;
      const result = await pool.query(query, [filter]);
      return res.json({ schools: result.rows });
    }

    // 4. FALLBACK (Top schools overall)
    const query = `
      SELECT 
        school_id, school_name, region, division, district,
        completion_percentage as completion_rate,
        updated_at
      FROM school_profiles
      WHERE completion_percentage > 0
      ORDER BY completion_percentage DESC LIMIT 10
    `;
    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error("Leaderboard Error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// --- 30. GET: Leaderboard Data ---
// --- 30b. GET: Aggregated Regional Stats (For Central Office) ---
app.get('/api/monitoring/regions', async (req, res) => {
  try {
    const query = `
      WITH school_stats AS (
        SELECT 
          s.region,
          COUNT(s.school_id) as total_schools,
          CAST(AVG(COALESCE(ps.unit_completion, 0)) AS DECIMAL(10,1)) as avg_completion,
          SUM(COALESCE(ps.unit1,0) + COALESCE(ps.unit2,0) + COALESCE(ps.unit3,0) + COALESCE(ps.unit4,0) + 
              COALESCE(ps.unit5,0) + COALESCE(ps.unit6,0) + COALESCE(ps.unit7,0) + COALESCE(ps.unit8,0)) as total_forms_completed,
          COUNT(CASE WHEN COALESCE(ps.unit_completion, 0) >= 100 THEN 1 END) as completed_schools
        FROM (
          SELECT 
            COALESCE(p_in.school_id, s_in."SchoolID") as school_id,
            UPPER(TRIM(COALESCE(p_in.region, s_in."Region"))) as region,
            UPPER(TRIM(COALESCE(p_in.division, s_in."Division"))) as division,
            UPPER(TRIM(COALESCE(p_in.district, s_in."District"))) as district,
            COALESCE(p_in.school_name, s_in."School_Name") as school_name
          FROM "schools_IERN" s_in
          FULL OUTER JOIN ph_schools p_in ON s_in."SchoolID" = p_in.school_id
        ) s
        LEFT JOIN ph_schools ps ON s.school_id = ps.school_id
        GROUP BY s.region
      ),
      project_stats AS (
        SELECT 
          region,
          COUNT(*) as total_projects,
          COALESCE(SUM(approved_budget_for_contract), 0) as total_allocation,
          COALESCE(SUM(contract_amount), 0) as total_contract_amount,
          AVG(accomplishment_percentage) as avg_accomplishment,
          COUNT(CASE WHEN TRIM(status_of_construction_phase) ILIKE 'Ongoing' THEN 1 END) as ongoing_projects,
          COUNT(CASE WHEN TRIM(status_of_construction_phase) ILIKE 'Not Yet Started' THEN 1 END) as not_yet_started_projects,
          COUNT(CASE WHEN TRIM(status_of_construction_phase) ILIKE '%Under Procurement%' THEN 1 END) as under_procurement_projects,
          COUNT(CASE WHEN TRIM(status_of_construction_phase) ILIKE 'Completed' THEN 1 END) as completed_projects,
          COUNT(CASE WHEN TRIM(status_of_construction_phase) ILIKE 'Delayed' THEN 1 END) as delayed_projects
        FROM (
          SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
            region, approved_budget_for_contract, contract_amount, accomplishment_percentage, status_of_construction_phase
          FROM engineer_form
          ORDER BY COALESCE(ipc, project_id::text), created_at DESC
        ) LatestProjects
        GROUP BY region
      )
      SELECT 
        s.region,
        s.region as name,
        COALESCE(s.total_schools, 0) as total_schools,
        COALESCE(s.avg_completion, 0) as avg_completion,
        COALESCE(s.total_forms_completed, 0) as total_forms_completed,
        COALESCE(s.completed_schools, 0) as completed_schools,
        
        COALESCE(p.total_projects, 0) as total_projects,
        COALESCE(p.total_allocation, 0) as total_allocation,
        COALESCE(p.total_contract_amount, 0) as total_contract_amount,
        COALESCE(p.avg_accomplishment, 0)::NUMERIC(10,1) as avg_accomplishment,
        COALESCE(p.ongoing_projects, 0) as ongoing_projects,
        COALESCE(p.not_yet_started_projects, 0) as not_yet_started_projects,
        COALESCE(p.under_procurement_projects, 0) as under_procurement_projects,
        COALESCE(p.completed_projects, 0) as completed_projects,
        COALESCE(p.delayed_projects, 0) as delayed_projects
      FROM school_stats s
      FULL OUTER JOIN project_stats p ON s.region = p.region
      WHERE s.region IS NOT NULL OR p.region IS NOT NULL
      ORDER BY s.region ASC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Region Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch region stats" });
  }
});



// ==================================================================
//                    NOTIFICATION ROUTES
// ==================================================================

// --- 31. POST: Send Notification ---
app.post('/api/notifications/send', async (req, res) => {
  const { recipientUid, senderUid, senderName, title, message, type } = req.body;
  try {
    const query = `
            INSERT INTO notifications(recipient_uid, sender_uid, sender_name, title, message, type)
VALUES($1, $2, $3, $4, $5, $6)
RETURNING *;
`;
    const result = await pool.query(query, [recipientUid, senderUid, senderName, title, message, type || 'alert']);

    // --- DUAL WRITE: SEND NOTIFICATION ---
    if (poolNew) {
      poolNew.query(query, [recipientUid, senderUid, senderName, title, message, type || 'alert'])
        .catch(e => console.error("Dual-Write Notification Error:", e.message));
    }

    // Log it
    await logActivity(senderUid, senderName, 'System', 'ALERT', `User: ${recipientUid} `, `Sent alert: ${title} `);

    res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    console.error("Send Notification Error:", err);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// --- 32. GET: Get Notifications for User ---
app.get('/api/notifications/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const query = `
SELECT * FROM notifications 
            WHERE recipient_uid = $1 
            ORDER BY created_at DESC 
            LIMIT 50;
`;
    const result = await pool.query(query, [uid]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Notifications Error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// --- 33. PUT: Mark Notification as Read ---
app.put('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);

    // --- DUAL WRITE: MARK NOTIFICATION READ ---
    if (poolNew) {
      poolNew.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id])
        .catch(e => console.error("Dual-Write Notif Read Error:", e.message));
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Mark Read Error:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});
// --- 24. GET: Fetch Learner Statistics (Enhanced) ---
app.get('/api/learner-statistics/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    // Dynamically build the SELECT list to include all K-12 flat columns
    const categories = ['stat_sned', 'stat_disability', 'stat_als', 'stat_muslim', 'stat_ip', 'stat_displaced', 'stat_repetition', 'stat_overage', 'stat_dropout'];
    const grades = ['k', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];

    let selectFields = [
      'school_id', 'curricular_offering', 'learner_stats_grids',
      'stat_sned_es', 'stat_sned_jhs', 'stat_sned_shs', // legacy/subtotal
      'stat_disability_es', 'stat_disability_jhs', 'stat_disability_shs',
      'stat_als_es', 'stat_als_jhs', 'stat_als_shs',
      // 'stat_muslim' cols are covered by the loop below as they follow standard naming now
      'stat_ip', 'stat_displaced', 'stat_repetition', 'stat_overage', 'stat_dropout_prev_sy', // grand totals
      'stat_ip_es', 'stat_ip_jhs', 'stat_ip_shs',
      'stat_displaced_es', 'stat_displaced_jhs', 'stat_displaced_shs',
      'stat_repetition_es', 'stat_repetition_jhs', 'stat_repetition_shs',
      'stat_overage_es', 'stat_overage_jhs', 'stat_overage_shs',
      'stat_dropout_es', 'stat_dropout_jhs', 'stat_dropout_shs'
    ];

    // Add all K-12 flat columns to fetch list
    categories.forEach(cat => {
      grades.forEach(g => {
        selectFields.push(`${cat}_${g}`);
      });
    });

    const query = `SELECT ${selectFields.join(', ')} FROM school_profiles WHERE submitted_by = $1`;

    const result = await pool.query(query, [uid]);

    if (result.rows.length > 0) {
      res.json({ exists: true, data: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error("Fetch Learner Stats Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// --- 25. POST: Save Learner Statistics (Dynamic) ---
app.post('/api/save-learner-statistics', async (req, res) => {
  const data = req.body;
  try {
    const categories = ['stat_sned', 'stat_disability', 'stat_als', 'stat_muslim', 'stat_ip', 'stat_displaced', 'stat_repetition', 'stat_overage', 'stat_dropout'];
    const grades = ['k', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];

    // Base fields to always update
    const fields = [
      'submitted_at = CURRENT_TIMESTAMP',
      'learner_stats_grids = $' + 2, // Keep JSONB as backup/source if needed

      // Single Totals/Legacy
      'stat_sned_es = $' + 3, 'stat_sned_jhs = $' + 4, 'stat_sned_shs = $' + 5,
      'stat_disability_es = $' + 6, 'stat_disability_jhs = $' + 7, 'stat_disability_shs = $' + 8,
      'stat_als_es = $' + 9, 'stat_als_jhs = $' + 10, 'stat_als_shs = $' + 11,

      'stat_ip = $' + 12, 'stat_displaced = $' + 13, 'stat_repetition = $' + 14,
      'stat_overage = $' + 15, 'stat_dropout_prev_sy = $' + 16,

      // New Subtotals
      'stat_ip_es = $' + 17, 'stat_ip_jhs = $' + 18, 'stat_ip_shs = $' + 19,
      'stat_displaced_es = $' + 20, 'stat_displaced_jhs = $' + 21, 'stat_displaced_shs = $' + 22,
      'stat_repetition_es = $' + 23, 'stat_repetition_jhs = $' + 24, 'stat_repetition_shs = $' + 25,
      'stat_overage_es = $' + 26, 'stat_overage_jhs = $' + 27, 'stat_overage_shs = $' + 28,
      'stat_dropout_es = $' + 29, 'stat_dropout_jhs = $' + 30, 'stat_dropout_shs = $' + 31
    ];

    const values = [
      data.schoolId, // $1 (WHERE clause)
      data.learner_stats_grids || {}, // $2

      parseIntOrNull(data.stat_sned_es), parseIntOrNull(data.stat_sned_jhs), parseIntOrNull(data.stat_sned_shs),
      parseIntOrNull(data.stat_disability_es), parseIntOrNull(data.stat_disability_jhs), parseIntOrNull(data.stat_disability_shs),
      parseIntOrNull(data.stat_als_es), parseIntOrNull(data.stat_als_jhs), parseIntOrNull(data.stat_als_shs),

      parseIntOrNull(data.stat_ip), parseIntOrNull(data.stat_displaced), parseIntOrNull(data.stat_repetition),
      parseIntOrNull(data.stat_overage), parseIntOrNull(data.stat_dropout_prev_sy),

      parseIntOrNull(data.stat_ip_es), parseIntOrNull(data.stat_ip_jhs), parseIntOrNull(data.stat_ip_shs),
      parseIntOrNull(data.stat_displaced_es), parseIntOrNull(data.stat_displaced_jhs), parseIntOrNull(data.stat_displaced_shs),
      parseIntOrNull(data.stat_repetition_es), parseIntOrNull(data.stat_repetition_jhs), parseIntOrNull(data.stat_repetition_shs),
      parseIntOrNull(data.stat_overage_es), parseIntOrNull(data.stat_overage_jhs), parseIntOrNull(data.stat_overage_shs),
      parseIntOrNull(data.stat_dropout_es), parseIntOrNull(data.stat_dropout_jhs), parseIntOrNull(data.stat_dropout_shs)
    ];

    // Dynamically add the ~100 flat K-12 columns to fields and values
    let paramIndex = 32; // Next available index
    categories.forEach(cat => {
      grades.forEach(g => {
        fields.push(`${cat}_${g} = $${paramIndex}`);
        values.push(parseIntOrNull(data[`${cat}_${g}`]));
        paramIndex++;
      });
    });

    const query = `UPDATE school_profiles SET ${fields.join(', ')} WHERE school_id = $1`;

    await pool.query(query, values);

    // --- DUAL WRITE: LEARNER STATISTICS ---
    if (poolNew) {
      try {
        console.log("”„ Dual-Write: Syncing Learner Stats...");
        await poolNew.query(query, values);
        await calculateSchoolProgress(data.schoolId, poolNew);
        console.log("… Dual-Write: Learner Stats Synced!");
      } catch (dwErr) {
        console.error("âŒ Dual-Write Error (Learner Stats):", dwErr.message);
      }
    }

    // Centrally log activity
    await logActivity(
      data.uid,
      data.userName,
      data.role,
      'UPDATE',
      'Learner Statistics',
      `Updated learner statistics for school ${data.schoolId}`
    );

    res.json({ success: true, message: "Learner statistics saved successfully!" });
    // SNAPSHOT UPDATE (Primary)
    await calculateSchoolProgress(data.schoolId, pool);

  } catch (err) {
    console.error("Save Learner Stats Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- GLOBAL ERROR HANDLER ---
// Ensures all errors return JSON, preventing HTML responses for API routes
app.use((err, req, res, next) => {
  console.error("Global API Error:", err);

  // Handle Body Parser JSON Syntax Errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: "Invalid JSON payload sent to server." });
  }

  // Default Error
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
});

// --- TEMPORARY MIGRATION ENDPOINT (FACILITY REPAIRS) ---


// Robust path comparison for Windows
// Robust path comparison for Windows


/* 
   ON WINDOWS:
   Executed: E:\InsightEd-Mobile-PWA\api\index.js
   Current:  e:\InsightEd-Mobile-PWA\api\index.js
   
   Note the case difference (E: vs e:). 
   path.resolve() adjusts slashes but DOES NOT fix drive letter case on all Node versions.
   We will normalize to lowercase for comparison.
*/


// --- 1. GLOBAL ERROR HANDLERS TO PREVENT SILENT CRASHES ---
process.on('uncaughtException', (err) => {
  console.error('âŒ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('âŒ UNHANDLED REJECTION:', reason);
});

// Always start if strictly detected as main, OR if explicitly forced by env (fallback)
// Debugging Startup Logic
console.log('--- Startup Debug Info ---');
console.log('Executed File:', process.argv[1]);
console.log('Current File:', fileURLToPath(import.meta.url));
console.log('Is Main Module?', 'Legacy check');
console.log('Force Start Env?', process.env.START_SERVER);
console.log('--------------------------');


// --- TEMPORARY MIGRATION ENDPOINT (FACILITY REPAIRS) ---
// --- MIGRATE REPAIR DETAILS SCHEMA ---
app.get('/api/migrate-repair-details', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const results = [];

    // 1. Drop old table
    try {
      await client.query('DROP TABLE IF EXISTS facility_repairs');
      results.push("Dropped old facility_repairs table");
    } catch (e) { results.push(`Failed drop: ${e.message}`); }

    // 2. Create new table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS facility_repair_details (
          id SERIAL PRIMARY KEY,
          school_id VARCHAR(50), -- Added explicitly for consistency
          iern VARCHAR(50),
          building_no VARCHAR(100),
          room_no VARCHAR(100),
          item_name VARCHAR(100),
          oms TEXT,
          condition VARCHAR(50),
          damage_ratio INTEGER,
          recommended_action VARCHAR(100),
          demo_justification TEXT,
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Add indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_frd_iern ON facility_repair_details(iern)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_frd_school_id ON facility_repair_details(school_id)');

      results.push("Created facility_repair_details table");
    } catch (e) { results.push(`Failed create: ${e.message}`); }

    res.json({ message: "Repair Details Migration finished", results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

// --- TEMPORARY MIGRATION ENDPOINT (MOVED OUTSIDE FOR ACCESS) ---
app.get('/api/migrate-schema', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const results = [];

    // 1. Add construction_start_date
    try {
      await client.query('ALTER TABLE "engineer_form" ADD COLUMN IF NOT EXISTS construction_start_date TIMESTAMP');
      results.push("Added construction_start_date");
    } catch (e) { results.push(`Failed construction_start_date: ${e.message}`); }

    // 2. Add project_category
    try {
      await client.query('ALTER TABLE "engineer_form" ADD COLUMN IF NOT EXISTS project_category TEXT');
      results.push("Added project_category");
    } catch (e) { results.push(`Failed project_category: ${e.message}`); }

    // 3. Add scope_of_work
    try {
      await client.query('ALTER TABLE "engineer_form" ADD COLUMN IF NOT EXISTS scope_of_work TEXT');
      results.push("Added scope_of_work");
    } catch (e) { results.push(`Failed scope_of_work: ${e.message}`); }

    // 4. Add number_of_classrooms
    try {
      await client.query('ALTER TABLE "engineer_form" ADD COLUMN IF NOT EXISTS number_of_classrooms INTEGER');
      results.push("Added number_of_classrooms");
    } catch (e) { results.push(`Failed number_of_classrooms: ${e.message}`); }

    // 5. Add number_of_sites
    try {
      await client.query('ALTER TABLE "engineer_form" ADD COLUMN IF NOT EXISTS number_of_sites INTEGER');
      results.push("Added number_of_sites");
    } catch (e) { results.push(`Failed number_of_sites: ${e.message}`); }

    // 6. Add number_of_storeys
    try {
      await client.query('ALTER TABLE "engineer_form" ADD COLUMN IF NOT EXISTS number_of_storeys INTEGER');
      results.push("Added number_of_storeys");
    } catch (e) { results.push(`Failed number_of_storeys: ${e.message}`); }

    // 7. Add funds_utilized
    try {
      await client.query('ALTER TABLE "engineer_form" ADD COLUMN IF NOT EXISTS funds_utilized NUMERIC');
      results.push("Added funds_utilized");
    } catch (e) { results.push(`Failed funds_utilized: ${e.message}`); }

    // --- SECONDARY DB MIGRATION ---
    if (poolNew) {
      let clientNew;
      try {
        clientNew = await poolNew.connect();
        const resultsNew = [];
        const cols = [
          'construction_start_date TEXT',
          'project_category TEXT',
          'scope_of_work TEXT',
          'number_of_classrooms INTEGER DEFAULT 0',
          'number_of_sites INTEGER DEFAULT 1',
          'number_of_storeys INTEGER DEFAULT 0',
          'funds_utilized NUMERIC DEFAULT 0',
          'variation_order_pdf TEXT',
          'update_type TEXT'
        ];
        for (const colDef of cols) {
          const colName = colDef.split(' ')[0];
          try {
            await clientNew.query(`ALTER TABLE "engineer_form" ADD COLUMN IF NOT EXISTS ${colDef}`);
            resultsNew.push(`Added ${colName} to ICTS`);
          } catch (e) { resultsNew.push(`Failed ${colName} on ICTS: ${e.message}`); }
        }
        results.push(...resultsNew);
      } catch (err) {
        results.push(`ICTS Connection Failed: ${err.message}`);
      } finally {
        if (clientNew) clientNew.release();
      }
    }

    res.json({ message: "Migration attempt finished", results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});
// --- TEMPORARY MIGRATION ENDPOINT (LGU FIELDS) ---
app.get('/api/migrate-lgu-schema', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const results = [];
    const table = 'lgu_forms';

    const columns = [
      { name: 'source_agency', type: 'TEXT' },
      { name: 'lsb_resolution_no', type: 'TEXT' },
      { name: 'moa_ref_no', type: 'TEXT' },
      { name: 'validity_period', type: 'TEXT' },
      { name: 'contract_duration', type: 'TEXT' },
      { name: 'date_approved_pow', type: 'DATE' },
      { name: 'fund_release_schedule', type: 'TEXT' },
      { name: 'mode_of_procurement', type: 'TEXT' },
      { name: 'philgeps_ref_no', type: 'TEXT' },
      { name: 'pcab_license_no', type: 'TEXT' },
      { name: 'date_contract_signing', type: 'DATE' },
      { name: 'bid_amount', type: 'NUMERIC' },
      { name: 'nature_of_delay', type: 'TEXT' },
      { name: 'date_notice_of_award', type: 'DATE' }
    ];

    for (const col of columns) {
      try {
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        results.push(`Added ${col.name}`);
      } catch (e) {
        results.push(`Failed ${col.name}: ${e.message}`);
      }
    }

    res.json({ message: "LGU Migration attempt finished", results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

// --- TEMPORARY MIGRATION ENDPOINT (LGU IMAGES) ---
app.get('/api/migrate-lgu-image-schema', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const results = [];

    // Add category column to lgu_image
    try {
      await client.query('ALTER TABLE "lgu_image" ADD COLUMN IF NOT EXISTS category TEXT');
      results.push("Added category to lgu_image");
    } catch (e) { results.push(`Failed category: ${e.message}`); }

    res.json({ message: "LGU Image Migration attempt finished", results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

// --- TEMPORARY MIGRATION ENDPOINT (SPECIAL ORDER) ---
app.get('/api/migrate-special-order-schema', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const results = [];

    // 1. Add special_order and legislative_district to pending_schools
    try {
      await client.query('ALTER TABLE "pending_schools" ADD COLUMN IF NOT EXISTS special_order TEXT');
      await client.query('ALTER TABLE "pending_schools" ADD COLUMN IF NOT EXISTS legislative_district VARCHAR(100)');
      results.push("Added special_order and legislative_district to pending_schools");
    } catch (e) { results.push(`Failed pending_schools: ${e.message}`); }

    // 2. Add special_order and legislative_district to schools
    try {
      await client.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS special_order TEXT');
      await client.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS legislative_district VARCHAR(100)');
      results.push("Added special_order and legislative_district to schools");
    } catch (e) { results.push(`Failed schools: ${e.message}`); }

    res.json({ message: "Special Order Migration attempt finished", results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

// --- DEBUG ENDPOINT ---
app.get('/api/debug/health-stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        COALESCE(data_health_description, 'NULL') as status_of_construction_phase, 
        COUNT(*) as count 
      FROM school_profiles 
      WHERE completion_percentage = 100 
      GROUP BY data_health_description
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
//                      USER INFO HELPER
// ==================================================================
app.get('/api/user-info/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query(
      'SELECT role, first_name, last_name, email, region, division, account_category, school_id FROM users WHERE uid = $1',
      [uid]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
//                      LGU FORMS ROUTES
// ==================================================================

// --- LGU 1. POST: Save New Project (LGU) ---
app.post('/api/lgu/save-project', async (req, res) => {
  const data = req.body;

  if (!data.schoolName || !data.projectName || !data.schoolId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  let client;
  let clientNew;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Dual Write Setup
    if (poolNew) {
      try {
        clientNew = await poolNew.connect();
        await clientNew.query('BEGIN');
      } catch (connErr) {
        console.error("⚠️ Dual-Write LGU: Failed to start transaction:", connErr.message);
        clientNew = null;
      }
    }

    // 1. Generate IPC (LGU-YYYY-XXXXX)
    const year = new Date().getFullYear();
    const ipcResult = await client.query(
      "SELECT ipc FROM lgu_forms WHERE ipc LIKE $1 ORDER BY ipc DESC LIMIT 1",
      [`LGU-${year}-%`]
    );

    let nextSeq = 1;
    if (ipcResult.rows.length > 0) {
      const lastIpc = ipcResult.rows[0].ipc;
      const parts = lastIpc.split('-');
      if (parts.length === 3 && !isNaN(parts[2])) {
        nextSeq = parseInt(parts[2]) + 1;
      }
    }
    const newIpc = `LGU-${year}-${String(nextSeq).padStart(5, '0')}`;

    // 2. Prepare Data
    const lguName = await getUserFullName(data.uid);
    const resolvedLguName = lguName || data.submittedBy || 'LGU User';

    const docs = data.documents || [];
    const powDoc = docs.find(d => d.type === 'POW')?.base64 || null;
    const dupaDoc = docs.find(d => d.type === 'DUPA')?.base64 || null;
    const contractDoc = docs.find(d => d.type === 'CONTRACT')?.base64 || null;

    const projectValues = [
      data.projectName, data.schoolName, data.schoolId,
      valueOrNull(data.region), valueOrNull(data.division),
      data.status || '', parseIntOrNull(data.accomplishmentPercentage),
      valueOrNull(data.statusAsOfDate), valueOrNull(data.targetCompletionDate),
      valueOrNull(data.actualCompletionDate), valueOrNull(data.noticeToProceed),
      valueOrNull(data.contractorName), parseNumberOrNull(data.projectAllocation),
      valueOrNull(data.batchOfFunds), valueOrNull(data.otherRemarks),
      data.uid,           // lgu_id
      newIpc,
      resolvedLguName,    // lgu_name
      valueOrNull(data.latitude),
      valueOrNull(data.longitude),
      powDoc,
      dupaDoc,
      contractDoc,
      // --- NEW FIELDS ---
      valueOrNull(data.moa_date), // 24
      parseIntOrNull(data.tranches_count), // 25
      parseNumberOrNull(data.tranche_amount), // 26
      valueOrNull(data.fund_source), // 27
      valueOrNull(data.province), // 28
      valueOrNull(data.city), // 29
      valueOrNull(data.municipality), // 30
      valueOrNull(data.legislative_district), // 31
      valueOrNull(data.scope_of_works), // 32
      parseNumberOrNull(data.contract_amount), // 33
      valueOrNull(data.bid_opening_date), // 34
      valueOrNull(data.resolution_award_date), // 35
      valueOrNull(data.procurement_stage), // 36
      valueOrNull(data.bidding_date), // 37
      valueOrNull(data.awarding_date), // 38
      valueOrNull(data.construction_start_date), // 39
      parseNumberOrNull(data.funds_downloaded), // 40
      parseNumberOrNull(data.funds_utilized), // 41

      // NEW FIELDS
      valueOrNull(data.source_agency), // 42
      valueOrNull(data.lsb_resolution_no), // 43
      valueOrNull(data.moa_ref_no), // 44
      valueOrNull(data.validity_period), // 45
      valueOrNull(data.contract_duration), // 46
      valueOrNull(data.date_approved_pow), // 47
      valueOrNull(data.fund_release_schedule), // 48
      valueOrNull(data.mode_of_procurement), // 49
      valueOrNull(data.philgeps_ref_no), // 50
      valueOrNull(data.pcab_license_no), // 51
      valueOrNull(data.date_contract_signing), // 52
      parseNumberOrNull(data.bid_amount),      // 53
      valueOrNull(data.nature_of_delay),       // 54
      valueOrNull(data.date_notice_of_award),  // 55
      valueOrNull(data.variationOrderPdf),      // 56
      valueOrNull(data.projectCategory),        // 57
      parseIntOrNull(data.numberOfSites),         // 60
      data.is_donated || false                    // 61
    ];

    const projectQuery = `
      INSERT INTO "lgu_forms" (
        project_name, school_name, school_id, region, division,
        status_of_construction_phase, accomplishment_percentage, status_as_of,
        target_completion_date, actual_completion_date, notice_to_proceed,
        contractor_name, project_allocation, batch_of_funds, other_remarks,
        lgu_id, ipc, lgu_name, latitude, longitude,
        pow_pdf, dupa_pdf, contract_pdf,
        -- EXISTING NEW COLUMNS
        moa_date, tranches_count, tranche_amount, fund_source,
        province, city, municipality, legislative_district,
        scope_of_works, contract_amount, bid_opening_date,
        resolution_award_date, procurement_stage, bidding_date,
        awarding_date, construction_start_date, funds_downloaded,
        funds_utilized,
        -- NEWEST COLUMNS
        source_agency, lsb_resolution_no, moa_ref_no, validity_period,
        contract_duration, date_approved_pow, fund_release_schedule,
        mode_of_procurement, philgeps_ref_no, pcab_license_no,
        date_contract_signing, bid_amount, nature_of_delay, date_notice_of_award,
        variation_order_pdf,
        -- PROJECT SPECS (VO COMPAT)
        project_category, number_of_classrooms, number_of_storeys, number_of_sites, is_donated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
        $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56,
        $57, $58, $59, $60, $61
      )
      RETURNING project_id, project_name, ipc;
    `;

    // 3. Insert Project
    const projectResult = await client.query(projectQuery, projectValues);
    const newProject = projectResult.rows[0];
    const newProjectId = newProject.project_id;

    // 4. Insert Images
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const imageQuery = `
        INSERT INTO "lgu_image" (project_id, image_data, uploaded_by)
        VALUES ($1, $2, $3)
      `;
      for (const imgBase64 of data.images) {
        await client.query(imageQuery, [newProjectId, imgBase64, data.uid]);
      }
    }

    await client.query('COMMIT');

    // Dual Write Replay
    if (clientNew) {
      try {
        await clientNew.query(projectQuery, projectValues);
        // We need to fetch the ID from secondary to insert images correctly if sequence differs, 
        // but for now assuming synced or just using payload logic (Wait, project_id is serial, so checking ipc is safer)

        const newProjRes = await clientNew.query("SELECT project_id FROM lgu_forms WHERE ipc = $1", [newIpc]);
        if (newProjRes.rows.length > 0) {
          const secProjId = newProjRes.rows[0].project_id;
          if (data.images && Array.isArray(data.images)) {
            const imageQuery = `INSERT INTO "lgu_image" (project_id, image_data, uploaded_by) VALUES ($1, $2, $3)`;
            for (const imgBase64 of data.images) {
              await clientNew.query(imageQuery, [secProjId, imgBase64, data.uid]);
            }
          }
        }
        await clientNew.query('COMMIT');
        console.log("✅ Dual-Write: LGU Project Synced!");
      } catch (dwErr) {
        console.error("❌ Dual-Write LGU Error:", dwErr.message);
        await clientNew.query('ROLLBACK').catch(() => { });
      }
    }

    // 5. Log Activity
    const logDetails = {
      action: "LGU Project Created",
      ipc: newIpc,
      status: data.status_of_construction_phase,
      timestamp: new Date().toISOString()
    };

    await logActivity(
      data.uid, resolvedLguName, 'LGU', 'CREATE',
      `LGU Project: ${newProject.project_name} (${newIpc})`,
      JSON.stringify(logDetails)
    );

    res.status(200).json({ message: "LGU Project saved!", project: newProject, ipc: newIpc });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (clientNew) await clientNew.query('ROLLBACK').catch(() => { });
    console.error("❌ LGU Save Error:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    if (client) client.release();
    if (clientNew) clientNew.release();
  }
});

// --- FINANCE 1. GET: Fetch All Projects (Latest Version) ---
app.get('/api/finance/projects', async (req, res) => {
  try {
    // DISTINCT ON (root_id) requires ORDER BY root_id, then other fields
    const result = await pool.query(`
        SELECT DISTINCT ON (root_id) * 
        FROM finance_projects 
        WHERE root_id IS NOT NULL
        ORDER BY root_id, created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching finance projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// --- FINANCE 2. POST: Create Project ---
app.post('/api/finance/projects', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      school_id, school_name, project_name, region, division, municipality, district, legislative_district,
      total_funds, fund_released, date_of_release
    } = req.body;

    await client.query('BEGIN');

    // 1. Insert into Finance Table (Initial)
    const insertQuery = `
        INSERT INTO finance_projects (
            school_id, school_name, project_name, region, division, municipality, district, legislative_district,
            total_funds, fund_released, date_of_release
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING finance_id, *;
    `;

    // Clean numbers
    const cleanTotal = total_funds ? parseFloat(total_funds.toString().replace(/,/g, '')) : 0;
    const cleanReleased = fund_released ? parseFloat(fund_released.toString().replace(/,/g, '')) : 0;
    // Clean Date
    let cleanDate = date_of_release;
    if (date_of_release === '' || date_of_release === null) cleanDate = null;

    const result = await client.query(insertQuery, [
      school_id, school_name, project_name, region, division, municipality, district, legislative_district,
      cleanTotal, cleanReleased, cleanDate
    ]);

    let newProject = result.rows[0];
    const newId = newProject.finance_id;
    const rootId = `FIN-${newId}`;

    // 2. Set root_id for this first record
    await client.query('UPDATE finance_projects SET root_id = $1 WHERE finance_id = $2', [rootId, newId]);
    newProject.root_id = rootId;

    // 3. Auto-Create LGU Project (Sync) using the same Root ID
    const lguQuery = `
        INSERT INTO lgu_projects (
            root_project_id, 
            school_id, school_name, project_name, region, division, municipality, district, legislative_district,
            total_funds, fund_released, date_of_release,
            source_agency, project_status_of_construction_phase, accomplishment_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
    `;

    await client.query(lguQuery, [
      rootId,
      school_id, school_name, project_name, region, division, municipality, district, legislative_district,
      cleanTotal, cleanReleased, cleanDate,
      'Central Office', 'Not Started', 0
    ]);

    await client.query('COMMIT');
    res.json({ success: true, project: newProject });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error creating finance project:", err);
    res.status(500).json({ error: "Failed to create project" });
  } finally {
    client.release();
  }
});

// --- FINANCE 3. PUT: Update Project (APPEND ONLY) ---
app.put('/api/finance/project/:id', async (req, res) => {
  const { id } = req.params;
  const {
    project_name, total_funds, fund_released, date_of_release
  } = req.body;

  try {
    // 1. Fetch current project to get root_id & other details (to copy over if needed, or just root_id)
    const currentRes = await pool.query('SELECT * FROM finance_projects WHERE finance_id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const currentProject = currentRes.rows[0];
    const rootId = currentProject.root_id || `FIN-${currentProject.finance_id}`; // Fallback

    // Clean numbers
    const cleanTotal = total_funds ? parseFloat(total_funds.toString().replace(/,/g, '')) : 0;
    const cleanReleased = fund_released ? parseFloat(fund_released.toString().replace(/,/g, '')) : 0;

    // 2. INSERT NEW ROW (Append)
    const query = `
        INSERT INTO finance_projects (
            root_id,
            school_id, school_name, project_name, 
            region, division, municipality, district, legislative_district,
            total_funds, fund_released, date_of_release
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
    `;

    // We copy school/location details from current project as they usually don't change in this edit mode, 
    // or we should accept them from req.body if frontend sends them. 
    // Based on FinanceDashboard, it sends project_name, total_funds, etc. 
    // It implies we should keep the school/location from the original.

    const result = await pool.query(query, [
      rootId,
      currentProject.school_id, currentProject.school_name, project_name || currentProject.project_name,
      currentProject.region, currentProject.division, currentProject.municipality, currentProject.district, currentProject.legislative_district,
      cleanTotal, cleanReleased, date_of_release
    ]);

    res.json({ success: true, project: result.rows[0], message: "Project updated (New Version Created)" });

  } catch (err) {
    console.error("Error updating finance project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// --- LGU 2. POST: Upload Image (LGU) ---
app.post('/api/lgu/upload-image', async (req, res) => {
  const { projectId, imageData, uploadedBy } = req.body;
  if (!projectId || !imageData) return res.status(400).json({ error: "Missing required data" });

  try {
    const query = `INSERT INTO lgu_image (project_id, image_data, uploaded_by) VALUES ($1, $2, $3) RETURNING id;`;
    const result = await pool.query(query, [projectId, imageData, uploadedBy]);

    await logActivity(uploadedBy, 'LGU User', 'LGU', 'UPLOAD', `LGU Project ID: ${projectId}`, `Uploaded image`);

    res.status(201).json({ success: true, imageId: result.rows[0].id });

    // Dual Write
    if (poolNew) {
      try {
        // Need to map project_id if sequences drifted, but simple logic for now:
        // Ideally we pass IPC, but here we only have ID. 
        // Warning: ID mismatch risk.
        // Safe way: SELECT ipc FROM lgu_forms WHERE project_id = $1 -> Then on secondary SELECT project_id FROM lgu_forms WHERE ipc = ...

        const ipcRes = await pool.query("SELECT ipc FROM lgu_forms WHERE project_id = $1", [projectId]);
        if (ipcRes.rows.length > 0) {
          const ipc = ipcRes.rows[0].ipc;
          await poolNew.query(`
                    INSERT INTO lgu_image (project_id, image_data, uploaded_by)
                    VALUES ((SELECT project_id FROM lgu_forms WHERE ipc = $1), $2, $3)
                `, [ipc, imageData, uploadedBy]);
          console.log("✅ Dual-Write: LGU Image Synced!");
        }
      } catch (dwErr) {
        console.error("❌ Dual-Write LGU Image Error:", dwErr.message);
      }
    }

  } catch (err) {
    console.error("❌ LGU Image Upload Error:", err.message);
    res.status(500).json({ error: "Failed to save image" });
  }
});

// --- LGU 2b. POST: Upload Project Document (LGU Sequential) ---
app.post('/api/lgu/upload-project-document', async (req, res) => {
  const { projectId, type, base64, uid } = req.body;

  if (!projectId || !type || !base64) return res.status(400).json({ error: "Missing required data" });

  let column = '';
  if (type === 'POW') column = 'pow_pdf';
  else if (type === 'DUPA') column = 'dupa_pdf';
  else if (type === 'CONTRACT') column = 'contract_pdf';
  else if (type === 'RTA') column = 'rta_pdf';
  else if (type === 'MOA') column = 'moa_pdf';
  else return res.status(400).json({ error: "Invalid document type" });

  try {
    const query = `UPDATE lgu_forms SET ${column} = $1 WHERE project_id = $2`;
    await pool.query(query, [base64, projectId]);

    // --- DUAL WRITE ---
    if (poolNew) {
      try {
        const ipcRes = await pool.query('SELECT ipc FROM lgu_forms WHERE project_id = $1', [projectId]);
        if (ipcRes.rows.length > 0) {
          const ipc = ipcRes.rows[0].ipc;
          await poolNew.query(`UPDATE lgu_forms SET ${column} = $1 WHERE ipc = $2`, [base64, ipc]);
          console.log(`✅ Dual-Write LGU: ${type} Synced via IPC!`);
        }
      } catch (dwErr) {
        console.error("❌ Dual-Write LGU Doc Upload Error:", dwErr.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ LGU Doc Upload Error:", err.message);
    res.status(500).json({ error: "Failed to save document" });
  }
});

// --- LGU 3. GET: Fetch LGU Projects (List) ---
// --- LGU 3. GET: Fetch LGU Projects (LATEST VERSION ONLY) ---
app.get('/api/lgu/projects', async (req, res) => {
  const { uid, municipality } = req.query;
  try {
    // We want the LATEST version for each project.
    // Group by root_project_id and take the one with the latest created_at.
    let query = `
      SELECT DISTINCT ON (root_project_id) 
        lgu_project_id, root_project_id, school_id, school_name, project_name, municipality, project_status, created_at
      FROM lgu_projects
    `;
    const params = [];

    // Filter Logic
    if (uid) {
      const userRes = await pool.query('SELECT role, city FROM users WHERE uid = $1', [uid]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        // If user is LGU, filter by municipality (city)
        if (user.city) {
          query += ` WHERE municipality = $1 `;
          params.push(user.city);
        }
      }
    } else if (municipality) {
      query += ` WHERE municipality = $1 `;
      params.push(municipality);
    }

    // IMPORTANT: DISTINCT ON requires the ORDER BY to start with the distinct column
    query += ` ORDER BY root_project_id, created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching LGU projects:", err);
    res.status(500).json({ error: "Failed to fetch LGU projects" });
  }
});

// --- LGU 4. GET: Fetch Single LGU Project Details ---
app.get('/api/lgu/project/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        *,
        (variation_order_pdf IS NOT NULL) AS "hasVariationOrder",
        variation_order_pdf AS "variationOrderPdf"
      FROM lgu_projects WHERE lgu_project_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching LGU project details:", err);
    res.status(500).json({ error: "Failed to fetch project details" });
  }
});

// --- LGU 5. POST: Update Project (Append-Only History) ---
app.post('/api/lgu/project/update', async (req, res) => {
  try {
    const project = req.body;

    // We create a NEW record in lgu_projects
    // root_project_id MUST be maintained

    const columns = [
      "region", "division", "district", "legislative_district", "school_id", "school_name",
      "project_name", "total_funds", "fund_released", "date_of_release", "liquidated_amount",
      "liquidation_date", "percentage_liquidated", "source_agency", "contractor_name",
      "lsb_resolution_no", "moa_ref_no", "moa_date", "validity_period", "contract_duration",
      "date_approved_pow", "approved_contract_budget", "schedule_of_fund_release",
      "number_of_tranches", "amount_per_tranche", "mode_of_procurement", "philgeps_ref_no",
      "pcab_license_no", "date_contract_signing", "date_notice_of_award", "bid_amount",
      "latitude", "longitude", "pow_pdf", "dupa_pdf", "contract_pdf",
      "project_status", "accomplishment_percentage", "status_as_of_date",
      "amount_utilized", "nature_of_delay", "root_project_id", "municipality", "other_remarks",
      "variation_order_pdf",
      "project_category", "number_of_classrooms", "number_of_storeys", "number_of_sites"
    ];

    const numericCols = [
      "total_funds", "fund_released", "liquidated_amount", "percentage_liquidated",
      "approved_contract_budget", "number_of_tranches", "amount_per_tranche",
      "bid_amount", "accomplishment_percentage", "amount_utilized"
    ];

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = columns.map(col => {
      let val = project[col];
      if (val === '' || val === undefined || val === null) return null;

      if (numericCols.includes(col)) {
        if (typeof val === 'string') {
          return parseFloat(val.replace(/,/g, ''));
        }
      }
      return val;
    });

    const query = `
        INSERT INTO lgu_projects (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING lgu_project_id;
    `;

    const result = await pool.query(query, values);

    res.json({ success: true, new_project_id: result.rows[0].lgu_project_id, message: "Project updated (History Saved)" });

  } catch (err) {
    console.error("Error updating LGU project:", err);
    res.status(500).json({ error: "Update failed", details: err.message });
  }
});



// --- LGU 5. PUT: Update LGU Project ---
app.put('/api/lgu/update-project/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  if (!id) return res.status(400).json({ error: "Project ID required" });

  let client;
  let clientNew;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    if (poolNew) {
      try {
        clientNew = await poolNew.connect();
        await clientNew.query('BEGIN');
      } catch (e) { console.error("Dual-write connect error", e); }
    }

    // 1. Update Main Fields
    const updateQuery = `
            UPDATE lgu_forms SET
                project_name = COALESCE($1, project_name),
                school_name = COALESCE($2, school_name),
                school_id = COALESCE($3, school_id),
                status = COALESCE($4, status),
                accomplishment_percentage = COALESCE($5, accomplishment_percentage),
                status_as_of = COALESCE($6, status_as_of),
                target_completion_date = COALESCE($7, target_completion_date),
                actual_completion_date = COALESCE($8, actual_completion_date),
                notice_to_proceed = COALESCE($9, notice_to_proceed),
                contractor_name = COALESCE($10, contractor_name),
                project_allocation = COALESCE($11, project_allocation),
                batch_of_funds = COALESCE($12, batch_of_funds),
                other_remarks = COALESCE($13, other_remarks),
                latitude = COALESCE($14, latitude),
                longitude = COALESCE($15, longitude),
                
                -- NEW FIELDS
                moa_date = COALESCE($16, moa_date),
                tranches_count = COALESCE($17, tranches_count),
                tranche_amount = COALESCE($18, tranche_amount),
                fund_source = COALESCE($19, fund_source),
                scope_of_works = COALESCE($20, scope_of_works),
                contract_amount = COALESCE($21, contract_amount),
                bid_opening_date = COALESCE($22, bid_opening_date),
                resolution_award_date = COALESCE($23, resolution_award_date),
                procurement_stage = COALESCE($24, procurement_stage),
                bidding_date = COALESCE($25, bidding_date),
                awarding_date = COALESCE($26, awarding_date),
                construction_start_date = COALESCE($27, construction_start_date),
                funds_downloaded = COALESCE($28, funds_downloaded),
                funds_utilized = COALESCE($29, funds_utilized),

                -- NEWEST FIELDS
                source_agency = COALESCE($30, source_agency),
                lsb_resolution_no = COALESCE($31, lsb_resolution_no),
                moa_ref_no = COALESCE($32, moa_ref_no),
                validity_period = COALESCE($33, validity_period),
                contract_duration = COALESCE($34, contract_duration),
                date_approved_pow = COALESCE($35, date_approved_pow),
                fund_release_schedule = COALESCE($36, fund_release_schedule),
                mode_of_procurement = COALESCE($37, mode_of_procurement),
                philgeps_ref_no = COALESCE($38, philgeps_ref_no),
                pcab_license_no = COALESCE($39, pcab_license_no),
                date_contract_signing = COALESCE($40, date_contract_signing),
                bid_amount = COALESCE($41, bid_amount),
                nature_of_delay = COALESCE($42, nature_of_delay),
                date_notice_of_award = COALESCE($43, date_notice_of_award),
                variation_order_pdf = COALESCE($44, variation_order_pdf),

                -- PROJECT SPECS (VO COMPAT)
                project_category = COALESCE($45, project_category),
                number_of_classrooms = COALESCE($46, number_of_classrooms),
                number_of_storeys = COALESCE($47, number_of_storeys),
                number_of_sites = COALESCE($48, number_of_sites),
                is_donated = COALESCE($49, is_donated)

            WHERE project_id = $50
            RETURNING *;
        `;

    const values = [
      data.projectName, data.schoolName, data.schoolId,
      data.status_of_construction_phase || data.statusOfConstructionPhase, parseIntOrNull(data.accomplishmentPercentage),
      valueOrNull(data.statusAsOfDate), valueOrNull(data.targetCompletionDate),
      valueOrNull(data.actualCompletionDate), valueOrNull(data.noticeToProceed),
      valueOrNull(data.contractorName), parseNumberOrNull(data.projectAllocation),
      valueOrNull(data.batchOfFunds), valueOrNull(data.otherRemarks),
      valueOrNull(data.latitude), valueOrNull(data.longitude),
      // New
      valueOrNull(data.moa_date), parseIntOrNull(data.tranches_count), parseNumberOrNull(data.tranche_amount),
      valueOrNull(data.fund_source), valueOrNull(data.scope_of_works), parseNumberOrNull(data.contract_amount),
      valueOrNull(data.bid_opening_date), valueOrNull(data.resolution_award_date), valueOrNull(data.procurement_stage),
      valueOrNull(data.bidding_date), valueOrNull(data.awarding_date), valueOrNull(data.construction_start_date),
      parseNumberOrNull(data.funds_downloaded), parseNumberOrNull(data.funds_utilized),

      // Newest
      valueOrNull(data.source_agency),
      valueOrNull(data.lsb_resolution_no),
      valueOrNull(data.moa_ref_no),
      valueOrNull(data.validity_period),
      valueOrNull(data.contract_duration),
      valueOrNull(data.date_approved_pow),
      valueOrNull(data.fund_release_schedule),
      valueOrNull(data.mode_of_procurement),
      valueOrNull(data.philgeps_ref_no),
      valueOrNull(data.pcab_license_no),
      valueOrNull(data.date_contract_signing),
      parseNumberOrNull(data.bid_amount),
      valueOrNull(data.nature_of_delay),
      valueOrNull(data.date_notice_of_award),
      valueOrNull(data.variationOrderPdf),

      // Project Specs
      valueOrNull(data.projectCategory),
      parseIntOrNull(data.numberOfClassrooms),
      parseIntOrNull(data.numberOfStoreys),
      parseIntOrNull(data.numberOfSites),
      data.is_donated !== undefined ? data.is_donated : (data.isDonated !== undefined ? data.isDonated : null),

      id
    ];

    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Project not found" });
    }

    // 2. Handle New Images (Append)
    if (data.newImages && Array.isArray(data.newImages) && data.newImages.length > 0) {
      const imageQuery = `INSERT INTO lgu_image (project_id, image_data, uploaded_by) VALUES ($1, $2, $3)`;
      for (const img of data.newImages) {
        await client.query(imageQuery, [id, img, data.uid]);
      }
    }

    await client.query('COMMIT');

    // Dual Write
    if (clientNew) {
      try {
        // Determine Secondary ID via IPC (safer) since IDs might drift
        const ipc = result.rows[0].ipc;
        if (ipc) {
          // Update on Secondary by IPC
          // Construct UPDATE by IPC... or just by ID if we trust it?
          // Let's rely on ID for now but catch error
          await clientNew.query(updateQuery, values);

          // Images
          if (data.newImages && Array.isArray(data.newImages)) {
            const secProjRes = await clientNew.query("SELECT project_id FROM lgu_forms WHERE ipc = $1", [ipc]);
            if (secProjRes.rows.length > 0) {
              const secId = secProjRes.rows[0].project_id;
              const imageQuery = `INSERT INTO lgu_image (project_id, image_data, uploaded_by) VALUES ($1, $2, $3)`;
              for (const img of data.newImages) {
                await clientNew.query(imageQuery, [secId, img, data.uid]);
              }
            }
          }
          await clientNew.query('COMMIT');
          console.log("✅ Dual-Write: LGU Update Synced");
        }
      } catch (dwErr) {
        console.error("❌ Dual-Write LGU Update Error", dwErr);
        await clientNew.query('ROLLBACK').catch(() => { });
      }
    }

    res.json({ success: true, project: result.rows[0] });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ LGU Update Project Error:", err.message);
    res.status(500).json({ error: "Failed to update project" });
  } finally {
    if (client) client.release();
    if (clientNew) clientNew.release();
  }
});


// --- POST: Save Facility Repair Assessment (ITEMIZED) ---
app.post('/api/save-facility-repair', async (req, res) => {
  const data = req.body;
  // data should look like: { schoolId, iern, building_no, room_no, items: [ { item_name, oms, condition... } ] }

  if (data.building_no) data.building_no = data.building_no.trim();
  if (data.room_no) data.room_no = data.room_no.trim();

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete existing items for this specific room
      await client.query(`
        DELETE FROM facility_repair_details 
        WHERE school_id = $1 AND building_no = $2 AND room_no = $3
      `, [data.schoolId, data.building_no, data.room_no]);

      // 2. Insert new items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await client.query(`
            INSERT INTO facility_repair_details (
              school_id, iern, building_no, room_no, item_name,
              oms, condition, damage_ratio, recommended_action, demo_justification, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            data.schoolId, data.iern || data.schoolId,
            data.building_no, data.room_no,
            item.item_name,
            item.oms || '',
            item.condition || '',
            item.damage_ratio || 0,
            item.recommended_action || '',
            item.demo_justification || '',
            item.remarks || ''
          ]);
        }
      }

      await client.query('COMMIT');

      // --- DUAL WRITE (Best Effort) ---
      if (poolNew) {
        (async () => {
          const cNew = await poolNew.connect();
          try {
            await cNew.query('BEGIN');
            await cNew.query(`
              DELETE FROM facility_repair_details 
              WHERE school_id = $1 AND building_no = $2 AND room_no = $3
            `, [data.schoolId, data.building_no, data.room_no]);

            if (data.items && Array.isArray(data.items)) {
              for (const item of data.items) {
                await cNew.query(`
                  INSERT INTO facility_repair_details (
                    school_id, iern, building_no, room_no, item_name,
                    oms, condition, damage_ratio, recommended_action, demo_justification, remarks
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                  data.schoolId, data.iern || data.schoolId,
                  data.building_no, data.room_no,
                  item.item_name,
                  item.oms || '',
                  item.condition || '',
                  item.damage_ratio || 0,
                  item.recommended_action || '',
                  item.demo_justification || '',
                  item.remarks || ''
                ]);
              }
            }
            await cNew.query('COMMIT');
          } catch (e) {
            await cNew.query('ROLLBACK');
            console.error("Dual write failed for repair details", e);
          } finally {
            cNew.release();
          }
        })();
      }

      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Save Facility Repair Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET: Facility Repairs by IERN (ITEMIZED) ---
app.get('/api/facility-repairs/:iern', async (req, res) => {
  const { iern } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM facility_repair_details WHERE iern = $1 ORDER BY building_no, room_no, id ASC',
      [iern]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Get Facility Repairs Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// --- GET: Data Health & Compliance Report ---
app.get('/api/reports/data-health', async (req, res) => {
  const { region, division } = req.query;
  try {
    let whereClause = "1=1";
    let phWhereClause = "1=1";
    let params = [];

    if (region) {
      const formattedRegion = region.toLowerCase().includes('region') || ['NCR', 'CAR', 'BARMM'].includes(region)
        ? region
        : `Region ${region}`;
      const shortRegion = formattedRegion.replace(/region\s+/i, '').trim();

      params.push(formattedRegion);
      params.push(shortRegion);

      whereClause += ` AND (s.region = $${params.length - 1} OR s.region = $${params.length})`;
      phWhereClause += ` AND (p.region = $${params.length - 1} OR p.region = $${params.length})`;
    }
    // Strict parsing to ignore strings like "null" and "undefined" commonly sent by frontends
    if (division && division !== 'All Divisions' && division !== 'All' && division !== 'null' && division !== 'undefined') {
      params.push(division);
      whereClause += ` AND s.division = $${params.length}`;
      phWhereClause += ` AND p.division = $${params.length}`;
    }

    // 1. Expected Schools (from ph_schools)
    const expectedQuery = `SELECT COUNT(*) as total FROM ph_schools p WHERE ${phWhereClause}`;
    const expectedRes = await pool.query(expectedQuery, params);
    const expected_schools = parseInt(expectedRes.rows[0].total) || 0;

    // 2. All Schools Status (Registered vs Unregistered)
    const allSchoolsQuery = `
      SELECT 
        p.school_id, 
        p.school_name, 
        p.district,
        CASE WHEN s.school_id IS NOT NULL THEN 'Registered' ELSE 'Unregistered' END as registration_status,
        COALESCE(s.completion_percentage, 0) as completion_rate,
        CASE 
          WHEN s.school_id IS NOT NULL THEN 
            GREATEST(0, (
              100 
              - CASE WHEN s.total_enrollment IS NULL OR s.total_enrollment = 0 THEN 30 ELSE 0 END
              - CASE WHEN s.latitude IS NULL OR s.longitude IS NULL THEN 20 ELSE 0 END
              - CASE WHEN s.updated_at IS NULL OR s.updated_at < NOW() - INTERVAL '90 days' THEN 15 ELSE 0 END
            ))
          ELSE NULL 
        END as data_health_score,
        s.updated_at as last_updated
      FROM ph_schools p
      LEFT JOIN school_profiles s ON p.school_id = s.school_id
      WHERE ${phWhereClause}
      ORDER BY p.school_name ASC
    `;
    const allSchoolsRes = await pool.query(allSchoolsQuery, params);
    const all_schools_status = allSchoolsRes.rows;

    const unregistered_schools = all_schools_status.filter(s => s.registration_status === 'Unregistered');

    // 3. Stale Schools (updated_at is NULL or older than 90 days)
    const staleQuery = `
      SELECT s.school_id, s.school_name, s.updated_at as last_updated
      FROM school_profiles s
      WHERE ${whereClause}
      AND (s.updated_at IS NULL OR s.updated_at < NOW() - INTERVAL '90 days')
    `;
    const staleRes = await pool.query(staleQuery, params);
    const stale_schools = staleRes.rows;

    // 4. Anomalies (Red Flags)
    const anomaliesQuery = `
      SELECT s.school_id, s.school_name, s.total_enrollment, s.latitude, s.longitude
      FROM school_profiles s
      WHERE ${whereClause}
      AND (
        s.total_enrollment IS NULL 
        OR s.total_enrollment = 0 
        OR s.latitude IS NULL 
        OR s.longitude IS NULL
      )
    `;
    const anomaliesRes = await pool.query(anomaliesQuery, params);
    const anomalies = anomaliesRes.rows;

    // Registered Schools Count
    const registeredQuery = `SELECT COUNT(*) as total FROM school_profiles s WHERE ${whereClause}`;
    const registeredRes = await pool.query(registeredQuery, params);
    const registered_schools = parseInt(registeredRes.rows[0].total) || 0;

    // Calculate overall health score simply: 100 - relative deduction %
    let healthScore = 100;
    if (expected_schools > 0) {
      const deduction = ((unregistered_schools.length + stale_schools.length + anomalies.length) / expected_schools) * 100;
      healthScore = Math.max(0, 100 - deduction).toFixed(1);
    } else if (registered_schools > 0) {
      const deduction = ((stale_schools.length + anomalies.length) / registered_schools) * 100;
      healthScore = Math.max(0, 100 - deduction).toFixed(1);
    }

    // 5. Registered Schools Detailed Health Metrics
    const registeredHealthQuery = `
      SELECT 
        s.school_id, 
        s.school_name,
        p.district,
        COALESCE(s.completion_percentage, 0) as completion_rate,
        s.updated_at as last_updated,
        GREATEST(0, (
          100 
          - CASE WHEN s.total_enrollment IS NULL OR s.total_enrollment = 0 THEN 30 ELSE 0 END
          - CASE WHEN s.latitude IS NULL OR s.longitude IS NULL THEN 20 ELSE 0 END
          - CASE WHEN s.updated_at IS NULL OR s.updated_at < NOW() - INTERVAL '90 days' THEN 15 ELSE 0 END
        )) as data_health_score,
        NULLIF(
          CONCAT_WS(', ',
            CASE WHEN s.total_enrollment IS NULL OR s.total_enrollment = 0 THEN 'Missing/Zero Enrollment' ELSE NULL END,
            CASE WHEN s.latitude IS NULL OR s.longitude IS NULL THEN 'Missing GPS' ELSE NULL END,
            CASE WHEN s.updated_at IS NULL OR s.updated_at < NOW() - INTERVAL '90 days' THEN 'Stale Profile (>90 Days)' ELSE NULL END
          ), 
          ''
        ) as issues_detected
      FROM school_profiles s
      LEFT JOIN ph_schools p ON s.school_id = p.school_id
      WHERE ${whereClause}
      ORDER BY data_health_score ASC
    `;
    const registeredHealthRes = await pool.query(registeredHealthQuery, params);
    const registered_health_data = registeredHealthRes.rows;

    res.json({
      success: true,
      jurisdiction: (division && division !== 'null' && division !== 'undefined' && division !== 'All Divisions') ? `SDO ${division}` : (region ? `Region ${region}` : 'National'),
      summary: {
        totalExpected: expected_schools,
        registered: registered_schools,
        unregistered: unregistered_schools.length,
        overallHealthScore: parseFloat(healthScore)
      },
      datasets: {
        all_schools_status: all_schools_status,
        stale: stale_schools,
        anomalies: anomalies,
        registered_health: registered_health_data
      }
    });

  } catch (err) {
    console.error("❌ Data Health Report Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- GET: Master Dataset Export ---
app.get('/api/reports/insights/master', async (req, res) => {
  const { region, division } = req.query;

  try {
    let whereClause = "1=1";
    let params = [];

    if (region && region !== 'null' && region !== 'undefined' && region !== 'All') {
      const formattedRegion = region.toLowerCase().includes('region') || ['NCR', 'CAR', 'BARMM'].includes(region)
        ? region
        : `Region ${region}`;
      const shortRegion = formattedRegion.replace(/region\s+/i, '').trim();

      params.push(formattedRegion);
      params.push(shortRegion);
      whereClause += ` AND (UPPER(TRIM(p.region)) = UPPER(TRIM($${params.length - 1})) OR UPPER(TRIM(p.region)) = UPPER(TRIM($${params.length})))`;
    }
    if (division && division !== 'All Divisions' && division !== 'null' && division !== 'undefined' && division !== 'All') {
      params.push(division);
      whereClause += ` AND UPPER(TRIM(p.division)) = UPPER(TRIM($${params.length}))`;
    }

    // Select all columns from ph_schools and joined columns from school_profiles
    const query = `
      SELECT 
        p.*, 
        s.*,
        p.school_id
      FROM ph_schools p
      LEFT JOIN school_profiles s ON p.school_id = s.school_id
      WHERE ${whereClause}
      ORDER BY p.school_name ASC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      jurisdiction: region ? (division ? `${region} - ${division}` : `Region ${region}`) : 'National',
      data: result.rows
    });
  } catch (err) {
    console.error("❌ Master Dataset Export Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- GET: Insights Summary Stats (Bar Graph Data) ---
app.get('/api/reports/insights', async (req, res) => {
  const { region, division, district, item, grade = 'total', subMetric } = req.query;

  try {
    let whereClauses = ["1=1"];
    let params = [];
    let groupCol = 'p.division';

    if (region && region !== 'null' && region !== 'undefined' && region !== 'All') {
      const formattedRegion = region.toLowerCase().includes('region') || ['NCR', 'CAR', 'BARMM'].includes(region)
        ? region
        : `Region ${region}`;
      const shortRegion = formattedRegion.replace(/region\s+/i, '').trim();

      params.push(formattedRegion);
      params.push(shortRegion);
      whereClauses.push(`(UPPER(TRIM(p.region)) = UPPER(TRIM($${params.length - 1})) OR UPPER(TRIM(p.region)) = UPPER(TRIM($${params.length})))`);
    }

    if (division && division !== 'All Divisions' && division !== 'null' && division !== 'undefined' && division !== 'All') {
      params.push(division);
      whereClauses.push(`UPPER(TRIM(p.division)) = UPPER(TRIM($${params.length}))`);
      groupCol = 'p.district';
    }

    if (district && district !== 'null' && district !== 'undefined' && district !== 'All') {
      params.push(district);
      whereClauses.push(`UPPER(TRIM(p.district)) = UPPER(TRIM($${params.length}))`);
      groupCol = 'p.school_name';
    }

    let metricSelect = '';
    const grades = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];

    if (item === 'enrolment') {
      const col = grade === 'total' ? 'total_enrollment' : `enroll_${grade}`;
      metricSelect = `SUM(COALESCE(p.${col}, 0)) as value`;
    } else if (['muslim', 'ip', 'lwd', 'displaced', 'overage', 'sned', 'dropout', 'repeater'].includes(item)) {
      if (grade === 'total') {
        const sumCols = grades.map(g => `COALESCE(p.${item}_${g}, 0)`).join(' + ');
        metricSelect = `SUM(${sumCols}) as value`;
      } else {
        metricSelect = `SUM(COALESCE(p.${item}_${grade}, 0)) as value`;
      }
    } else if (item.startsWith('aral_')) {
      const subject = item.replace('aral_', '');
      const dbSubject = subject === 'science' ? 'sci' : (subject === 'reading' ? 'read' : 'math');
      if (grade === 'total') {
        const sumCols = grades.map(g => `COALESCE(p.aral_${dbSubject}_${g}, 0)`).join(' + ');
        metricSelect = `SUM(${sumCols}) as value`;
      } else {
        metricSelect = `SUM(COALESCE(p.aral_${dbSubject}_${grade}, 0)) as value`;
      }
    } else if (item === 'class_size') {
      const status = subMetric || 'within'; // less, within, above
      // Map standards: Kinder (25), Elem (35), JHS/SHS (40). Using average 35 as baseline for comparison.
      if (grade === 'total') {
        const conds = grades.map(g => {
          const limit = (g === 'kinder') ? 25 : (['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].includes(g) ? 35 : 40);
          if (status === 'less') return `CASE WHEN CAST(COALESCE(NULLIF(p.grade_${g}_size, ''), '0') AS INTEGER) < ${limit} THEN 1 ELSE 0 END`;
          if (status === 'above') return `CASE WHEN CAST(COALESCE(NULLIF(p.grade_${g}_size, ''), '0') AS INTEGER) > ${limit} THEN 1 ELSE 0 END`;
          return `CASE WHEN CAST(COALESCE(NULLIF(p.grade_${g}_size, ''), '0') AS INTEGER) BETWEEN ${limit - 5} AND ${limit + 5} THEN 1 ELSE 0 END`;
        }).join(' + ');
        metricSelect = `SUM(${conds}) as value`;
      } else {
        const limit = (grade === 'kinder') ? 25 : (['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].includes(grade) ? 35 : 40);
        let cond = '';
        if (status === 'less') cond = `CAST(COALESCE(NULLIF(p.grade_${grade}_size, ''), '0') AS INTEGER) < ${limit}`;
        else if (status === 'above') cond = `CAST(COALESCE(NULLIF(p.grade_${grade}_size, ''), '0') AS INTEGER) > ${limit}`;
        else cond = `CAST(COALESCE(NULLIF(p.grade_${grade}_size, ''), '0') AS INTEGER) BETWEEN ${limit - 5} AND ${limit + 5}`;
        metricSelect = `COUNT(CASE WHEN ${cond} THEN 1 END) as value`;
      }
    } else if (item === 'shifting') {
      const status = subMetric || 'Double';
      if (grade === 'total') {
        const conds = grades.map(g => `CASE WHEN p.shift_${g} ILIKE '%${status}%' THEN 1 ELSE 0 END`).join(' + ');
        metricSelect = `SUM(${conds}) as value`;
      } else {
        metricSelect = `COUNT(CASE WHEN p.shift_${grade} ILIKE '%${status}%' THEN 1 END) as value`;
      }
    } else if (item === 'mode') {
      const status = subMetric || 'Distance';
      if (grade === 'total') {
        const conds = grades.map(g => `CASE WHEN p.mode_${g} ILIKE '%${status}%' THEN 1 ELSE 0 END`).join(' + ');
        metricSelect = `SUM(${conds}) as value`;
      } else {
        metricSelect = `COUNT(CASE WHEN p.mode_${grade} ILIKE '%${status}%' THEN 1 END) as value`;
      }
    } else if (item === 'teachers') {
      const level = subMetric || 'total'; // kinder, elementary, jhs, shs, total
      const col = level === 'total' ? 'total_teachers_registered' : `total_teachers_${level}`;
      metricSelect = `SUM(COALESCE(p.${col}, 0)) as value`;
    } else if (item === 'specialization') {
      const subject = subMetric || 'Science';
      metricSelect = `COUNT(CASE WHEN p.teacher_specialization_mix ILIKE '%${subject}%' THEN 1 END) as value`;
    } else if (item === 'building_condition') {
      const condition = subMetric || 'Good';
      const col = `bldg_count_${condition.toLowerCase().replace(' ', '_')}`;
      metricSelect = `SUM(COALESCE(p.${col}, 0)) as value`;
    } else if (item === 'it_equipment') {
      const type = subMetric || 'laptop'; // laptop, tablet, pc, printer, ecart
      metricSelect = `SUM(COALESCE(p.it_${type}_total, 0)) as value`;
    } else if (item === 'risk_index') {
      metricSelect = `ROUND(AVG(COALESCE(p.hazard_risk_score, 0)), 1) as value`;
    } else {
      metricSelect = `
        COUNT(p.school_id) as total_schools,
        COUNT(CASE WHEN p.iern IS NOT NULL AND p.iern != '' THEN 1 END) as registered_schools,
        COUNT(CASE WHEN p.unit_completion >= 100 THEN 1 END) as completed_schools,
        ROUND(COALESCE(AVG(LEAST(COALESCE(p.unit_completion, 0), 100)), 0), 1) as avg_completion,
        ROUND(COALESCE(AVG(CASE WHEN p.school_id IS NOT NULL THEN 100.0 * (CASE WHEN p.iern IS NOT NULL AND p.iern != '' THEN 1 ELSE 0 END) ELSE 0 END), 0), 1) as value
      `;
    }

    const query = `
      SELECT 
        UPPER(TRIM(${groupCol})) as label,
        ${metricSelect}
      FROM ph_schools p
      LEFT JOIN school_profiles sp ON p.school_id = sp.school_id
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY UPPER(TRIM(${groupCol}))
      ORDER BY label ASC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      jurisdiction: region ? (division ? `${region} - ${division}` : `Region ${region}`) : 'National',
      data: result.rows
    });
  } catch (err) {
    console.error("❌ Insights Report Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Force start for PM2 (since isMainModule is false in PM2 fork mode)

// --- UNIFIED INITIALIZATION & STARTUP ---

// ==================================================================
//               IERN LOOKUP ENDPOINT
// ==================================================================


// GET: Fetch IERN Data by SchoolID
app.get('/api/schools_iern/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // Unified fetch from enriched schools_IERN table (synced from CSV)
    const query = 'SELECT * FROM "schools_IERN" WHERE "SchoolID" = $1';
    const result = await pool.query(query, [schoolId]);

    if (result.rows.length > 0) {
      res.json({ exists: true, data: result.rows[0] });
    } else {
      res.status(404).json({ exists: false, error: 'IERN data not found for this school ID.' });
    }
  } catch (err) {
    console.error("Fetch IERN Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




// ==================================================================
//               MODULAR BETA ENDPOINTS (PH_SCHOOLS)
// ==================================================================

// --- Auto-migrate moved to runAutoMigrations ---

// --- 28. GET: Fetch Quest Progress (Modular Beta) ---
app.get('/api/ph_schools/progress/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // ── 1. Ensure all required columns exist (idempotent) ────────────────────
    const ensureCols = [
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit1_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit2_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit3_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit4_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit5_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit6_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit7_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit8_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit9_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit10_completed BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit1 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit2 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit3 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit4 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit5 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit6 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit7 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit8 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit9 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit10 INTEGER DEFAULT 0`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit1_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit2_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit3_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit4_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit5_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit6_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit7_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit8_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit9_updated_at TIMESTAMP`,
      `ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit10_updated_at TIMESTAMP`,
    ];
    for (const sql of ensureCols) {
      await pool.query(sql).catch(() => { }); // silently skip if already exists
    }

    // ── 2. Fetch Progress ───────────────────────────────────────────────────
    // Attempt to find IERN first
    const sRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
    const iernValue = sRes.rows[0]?.iern;

    const querySelect = `SELECT 
        unit1_completed, unit2_completed, unit3_completed, unit4_completed,
        unit5_completed, unit6_completed, unit7_completed, unit8_completed,
        unit9_completed, unit10_completed, curricular_offering,
        unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8, unit9, unit10,
        unit1_updated_at, unit2_updated_at, unit3_updated_at, unit4_updated_at,
        unit5_updated_at, unit6_updated_at, unit7_updated_at, unit8_updated_at,
        unit9_updated_at, unit10_updated_at,
        school_name, total_enrollment
       FROM ph_schools`;

    let result;
    if (iernValue) {
      result = await pool.query(`${querySelect} WHERE iern = $1 OR school_id = $2`, [iernValue, schoolId]);
    } else {
      result = await pool.query(`${querySelect} WHERE school_id = $1`, [schoolId]);
    }

    let completedUnits = [];
    let incompleteUnits = [];
    let xp = 0;
    const backfillClauses = [];

    let curricular_offering = null;
    const row = result.rows[0] || {};
    if (result.rows.length > 0) {
      curricular_offering = row.curricular_offering;

      // ── Unit 1: School Identity ─────────────────────────────────────────
      let u1 = row.unit1_completed;
      if (u1) { completedUnits.push(1); xp += 150; } else if (row.unit1 === 2) { incompleteUnits.push(1); }

      // ── Unit 2: Enrollment ──────────────────────────────────────────────
      let u2 = row.unit2_completed;
      if (!u2 && row.total_enrollment > 0) { u2 = true; backfillClauses.push(`unit2_completed = TRUE, unit2 = 1`); }
      if (!u2) {
        // secondary: check unit2_simplified_enrollment column (may or may not exist)
        const ck = await pool.query(`SELECT unit2_simplified_enrollment FROM ph_schools WHERE school_id = $1 AND unit2_simplified_enrollment IS NOT NULL LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
        if (ck.rows.length > 0) { u2 = true; backfillClauses.push(`unit2_completed = TRUE, unit2 = 1`); }
      }
      if (u2) { completedUnits.push(2); xp += 200; } else if (row.unit2 === 2) { incompleteUnits.push(2); }

      // ── Unit 3: Organized Classes ───────────────────────────────────────
      let u3 = row.unit3_completed;
      if (!u3) {
        const ck = await pool.query(`SELECT unit3_simplified_counts FROM ph_schools WHERE school_id = $1 AND unit3_simplified_counts IS NOT NULL LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
        if (ck.rows.length > 0) { u3 = true; backfillClauses.push(`unit3_completed = TRUE, unit3 = 1`); }
      }
      if (u3) { completedUnits.push(3); xp += 200; } else if (row.unit3 === 2) { incompleteUnits.push(3); }

      // ── Unit 4: Learner Profile ─────────────────────────────────────────
      let u4 = row.unit4_completed;
      if (!u4) {
        // Unit 4 saves unit4_completed = TRUE via PUT to ph_schools; also check als_g1 as indicator
        const ck = await pool.query(`SELECT als_g1 FROM ph_schools WHERE school_id = $1 AND als_g1 IS NOT NULL AND als_g1 > 0 LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
        if (ck.rows.length > 0) { u4 = true; backfillClauses.push(`unit4_completed = TRUE, unit4 = 1`); }
      }
      if (u4) { completedUnits.push(4); xp += 250; } else if (row.unit4 === 2) { incompleteUnits.push(4); }

      // ── Unit 5: Shifting & Modality ─────────────────────────────────────
      let u5 = row.unit5_completed;
      if (!u5) {
        // Check if shifting_modality column exists and has data
        const ck = await pool.query(`SELECT shifting_modality FROM ph_schools WHERE school_id = $1 AND shifting_modality IS NOT NULL AND shifting_modality != '' LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
        if (ck.rows.length > 0) { u5 = true; backfillClauses.push(`unit5_completed = TRUE, unit5 = 1`); }
      }
      if (u5) { completedUnits.push(5); xp += 300; } else if (row.unit5 === 2) { incompleteUnits.push(5); }



      // ── Unit 6: School Resources (Old Unit 7) ──────────────────────────
      if (row.unit7_completed) { completedUnits.push(6); xp += 400; } else if (row.unit7 === 2) { incompleteUnits.push(6); }

      // ── Unit 7: Physical Facilities (Old Unit 8) ────────────────────────
      if (row.unit8_completed) { completedUnits.push(7); xp += 450; } else if (row.unit8 === 2) { incompleteUnits.push(7); }

      // ── Unit 8: School Terrain (Old Unit 9) ─────────────────────────────
      let u9 = row.unit9_completed;
      if (!u9) {
        const ck = await pool.query(`SELECT COUNT(*) as cnt FROM school_location_profiles WHERE school_id = $1`, [schoolId]).catch(() => ({ rows: [{ cnt: 0 }] }));
        if (parseInt(ck.rows[0]?.cnt) > 0) { u9 = true; backfillClauses.push(`unit9_completed = TRUE, unit9 = 1`); }
      }
      if (u9) { completedUnits.push(8); xp += 500; } else if (row.unit9 === 2) { incompleteUnits.push(8); }

      // ── Unit 9: Verification (Old Unit 10) ──────────────────────────────
      if (row.unit10_completed) { completedUnits.push(9); xp += 500; } else if (row.unit10 === 2) { incompleteUnits.push(9); }

      // ── Retroactive Backfill (fire-and-forget) ──────────────────────────
      if (backfillClauses.length > 0) {
        const unique = [...new Set(backfillClauses.join(', ').split(', '))].join(', ');
        pool.query(`UPDATE ph_schools SET ${unique} WHERE school_id = $1`, [schoolId])
          .catch(e => console.warn(`[Progress Backfill] ${schoolId}:`, e.message));
      }
    }

    res.json({ 
      success: true, 
      progress: { 
        completedUnits, 
        incompleteUnits, 
        xp, 
        curricular_offering,
        school_name: row?.school_name || "Unknown School",
        timestamps: {
          unit1: row?.unit1_updated_at,
          unit2: row?.unit2_updated_at,
          unit3: row?.unit3_updated_at,
          unit4: row?.unit4_updated_at,
          unit5: row?.unit5_updated_at,
          unit6: row?.unit7_updated_at,
          unit7: row?.unit8_updated_at,
          unit8: row?.unit9_updated_at,
          unit9: row?.unit10_updated_at,
        }
      } 
    });
  } catch (err) {
    console.error("Fetch Quest Progress Error:", err);
    // Return empty progress rather than an error so dashboard still renders
    res.json({ success: true, progress: { completedUnits: [], incompleteUnits: [], xp: 0, curricular_offering: null } });
  }
});

// --- 29a. GET: Fetch Saved Ph_Schools Data (for Review Mode pre-fill) ---
app.get('/api/ph_schools/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM ph_schools WHERE school_id = $1', [schoolId]);
    if (result.rows.length > 0) {
      let row = result.rows[0];

      // --- DYNAMIC BASELINE FALLBACK ---
      // If total_teachers_registered is 0, attempt a live count from master list
      if (!row.total_teachers_registered || parseInt(row.total_teachers_registered) === 0) {
        try {
          const teacherCountRes = await pool.query('SELECT COUNT(*) FROM teachers_list WHERE CAST("school.id" AS TEXT) = $1', [schoolId]);
          const liveCount = parseInt(teacherCountRes.rows[0].count) || 0;
          if (liveCount > 0) {
            row.total_teachers_registered = liveCount;
            // Asyncly update the table so it persists
            pool.query('UPDATE ph_schools SET total_teachers_registered = $1 WHERE school_id = $2', [liveCount, schoolId]).catch(() => { });
          }
        } catch (e) {
          console.warn(`[GET /api/ph_schools] Baseline fallback failed for ${schoolId}:`, e.message);
        }
      }
      // --- END FALLBACK ---

      // --- OWNERSHIP DOCUMENT DETAILS ---
      const docRes = await pool.query(
        'SELECT id, file_path FROM school_ownership_docs WHERE iern = $1 ORDER BY created_at DESC LIMIT 1',
        [row.iern || schoolId]
      );
      if (docRes.rows.length > 0) {
        row.ownership_doc_id = docRes.rows[0].id;
        row.local_file_path = docRes.rows[0].file_path;
      }

      console.log(`[GET /api/ph_schools/${schoolId}] RETURNING unit5_completed: `, row.unit5_completed);
      res.json({ exists: true, data: row });
    } else {
      res.json({ exists: false, data: null });
    }
  } catch (err) {
    console.error("Fetch ph_schools Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Auto-migrate moved to runAutoMigrations ---

// --- Google Drive Link Validation Endpoint ---
app.post('/api/validate-google-drive-link', async (req, res) => {
  try {
    const { link } = req.body;

    if (!link || typeof link !== 'string') {
      return res.status(400).json({ error: "Please provide a valid Google Drive link" });
    }

    // Extract file ID from Google Drive link
    let fileId = null;
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,  // /file/d/FILE_ID
      /[?&]id=([a-zA-Z0-9-_]+)/,      // ?id=FILE_ID
      /^([a-zA-Z0-9-_]{20,})$/,       // Just the ID
    ];

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) {
        fileId = match[1];
        break;
      }
    }

    if (!fileId) {
      return res.status(400).json({ error: "Invalid Google Drive link format. Please use a standard Google Drive share link." });
    }

    console.log(`🔍 Validating Google Drive file: ${fileId}`);

    // Parse service account credentials from .env
    let serviceAccount = null;
    try {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
    } catch (e) {
      console.warn("⚠️ Could not parse GOOGLE_SERVICE_ACCOUNT_JSON");
    }

    // Get OAuth token using service account
    let accessToken = null;
    if (serviceAccount && serviceAccount.private_key && serviceAccount.client_email) {
      try {
        const jwtPayload = {
          iss: serviceAccount.client_email,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          aud: 'https://oauth2.googleapis.com/token',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        };

        // Sign JWT with private key
        const crypto = await import('crypto');
        const jwt = require('jsonwebtoken');
        const signedJwt = jwt.sign(jwtPayload, serviceAccount.private_key, { algorithm: 'RS256' });

        // Exchange JWT for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: signedJwt
          })
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          console.log("✅ Got Google Drive API access token");
        }
      } catch (jwtErr) {
        console.warn("⚠️ JWT token generation failed:", jwtErr.message);
      }
    }

    // Get file metadata using Google Drive API
    let fileName = `Document-${fileId.substring(0, 8)}`;
    let isPublic = false;
    let thumbnailUrl = null;

    if (accessToken) {
      try {
        const metadataResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,thumbnailLink,permissions&supportsAllDrives=true`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );

        if (!metadataResponse.ok) {
          console.warn(`⚠️ Drive API returned status ${metadataResponse.status}`);
          if (metadataResponse.status === 404) {
            return res.status(404).json({ error: "File not found or you don't have access to it." });
          }
        } else {
          const metadata = await metadataResponse.json();
          fileName = metadata.name || fileName;

          // Check if file is publicly shared
          if (metadata.permissions) {
            // Look for a permission with role='reader' and type='anyone'
            isPublic = metadata.permissions.some(p =>
              p.type === 'anyone' && (p.role === 'reader' || p.role === 'commenter' || p.role === 'editor')
            );
          }

          // Generate thumbnail URL - works for PDFs and images
          // Using the export=view URL which works better for PDFs
          thumbnailUrl = `https://drive.google.com/uc?id=${fileId}&export=view`;

          console.log(`✅ File metadata retrieved: ${fileName}, Public: ${isPublic}`);
        }
      } catch (apiErr) {
        console.warn("⚠️ Google Drive API call failed:", apiErr.message);
      }
    }

    // If we couldn't use the API, fall back to simple public access check
    if (!accessToken || !isPublic) {
      console.log("⚠️ Falling back to public access URL check...");

      const publicAccessUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      const publicCheckResponse = await fetch(publicAccessUrl, {
        method: 'HEAD',
        redirect: 'follow',
      }).catch(e => {
        console.warn("⚠️ Public access check failed:", e.message);
        return null;
      });

      // If the response is 404 or 403, the file is definitely not public
      if (!publicCheckResponse || publicCheckResponse.status === 403 || publicCheckResponse.status === 404) {
        return res.status(403).json({
          error: "This file is not publicly accessible. Please make sure you've shared it with 'Anyone with the link' setting in Google Drive."
        });
      }

      // A 200 response indicates the file is likely public
      isPublic = publicCheckResponse.status === 200;

      if (!isPublic && publicCheckResponse.status !== 200) {
        return res.status(403).json({
          error: `This file is not publicly accessible (status: ${publicCheckResponse.status}). Please share it with 'Anyone with the link'.`
        });
      }

      // Generate thumbnail if not already set
      if (!thumbnailUrl) {
        thumbnailUrl = `https://drive.google.com/uc?id=${fileId}&export=view`;
      }
    }

    // Final check: If we got here without proving the file is public, reject it
    if (!isPublic && accessToken) {
      return res.status(403).json({
        error: "This file is not publicly shared. Please change the sharing settings to 'Anyone with the link' in Google Drive."
      });
    }

    console.log(`✅ Google Drive file validated: ${fileId}, Public: ${isPublic}`);

    res.json({
      success: true,
      fileId: fileId,
      fileName: fileName,
      thumbnailUrl: thumbnailUrl,
      link: link,
      isPublic: isPublic,
      message: "File verified as publicly accessible"
    });

  } catch (err) {
    console.error("Google Drive validation error:", err);
    res.status(500).json({ error: "Failed to validate Google Drive link. Please try again." });
  }
});

// --- 29. POST: Save Unit 1 School Identity Data (Modular Beta) ---
app.post('/api/ph_schools/unit1', async (req, res) => {
  try {
    const data = req.body;  // Expecting JSON from frontend

    console.log(`📝 Unit 1 POST received for school: ${data.school_id}`);


    const isCompleted = !!(
      data.barangay && 
      data.leg_district && 
      data.school_name &&
      data.region &&
      data.division
    );

    // Save Google Drive document link to ownership_documents table if provided
    let documentId = null;
    if (data.google_drive_file_id && data.google_drive_link) {
      try {
        console.log(`💾 Saving Google Drive document: ${data.google_drive_file_id}`);

        const docQuery = `
          INSERT INTO ownership_documents (school_id, iern, google_drive_file_id, google_drive_link, google_drive_file_name, google_drive_thumbnail_url, ownership_type, ownership_document_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (iern) DO UPDATE SET
            school_id = EXCLUDED.school_id,
            google_drive_file_id = EXCLUDED.google_drive_file_id,
            google_drive_link = EXCLUDED.google_drive_link,
            google_drive_file_name = EXCLUDED.google_drive_file_name,
            google_drive_thumbnail_url = EXCLUDED.google_drive_thumbnail_url,
            ownership_type = EXCLUDED.ownership_type,
            ownership_document_type = EXCLUDED.ownership_document_type,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `;

        const docResult = await pool.query(docQuery, [
          data.school_id,
          data.iern || null,
          data.google_drive_file_id,
          data.google_drive_link,
          data.google_drive_file_name || "Google Drive Document",
          data.google_drive_thumbnail_url || null,
          data.ownership || null,
          data.ownership_document_type || null
        ]);

        documentId = docResult.rows[0].id;
        console.log(`✅ Document saved with ID: ${documentId}`);
      } catch (docErr) {
        console.error(`❌ Failed to save document:`, docErr);
        // Continue with form save even if document save fails
      }
    }



    const query = `
      INSERT INTO ph_schools (
        school_id, iern, school_name, region, province, municipality, barangay,
        division, district, leg_district, curricular_offering, latitude, longitude,
        school_head, contact_number, ownership, ownership_document_path, school_type,
        mother_school_id, extension_mother_school_name, unit1_completed, unit1,
        ownership_document_type, established_month, established_year,
        head_first_name, head_middle_name, head_last_name, head_sex, head_position_title,
        head_date_of_birth, head_date_hired, google_drive_link, google_drive_file_id,
        google_drive_file_name, google_drive_thumbnail_url, unit1_updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, CURRENT_TIMESTAMP)
      ON CONFLICT (iern) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        school_name = EXCLUDED.school_name,
        region = EXCLUDED.region,
        province = EXCLUDED.province,
        municipality = EXCLUDED.municipality,
        barangay = EXCLUDED.barangay,
        division = EXCLUDED.division,
        district = EXCLUDED.district,
        leg_district = EXCLUDED.leg_district,
        curricular_offering = EXCLUDED.curricular_offering,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        school_head = EXCLUDED.school_head,
        contact_number = EXCLUDED.contact_number,
        ownership = EXCLUDED.ownership,
        ownership_document_path = EXCLUDED.ownership_document_path,
        school_type = EXCLUDED.school_type,
        mother_school_id = EXCLUDED.mother_school_id,
        extension_mother_school_name = EXCLUDED.extension_mother_school_name,
        unit1_completed = EXCLUDED.unit1_completed,
        unit1 = EXCLUDED.unit1,
        ownership_document_type = EXCLUDED.ownership_document_type,
        established_month = EXCLUDED.established_month,
        established_year = EXCLUDED.established_year,
        head_first_name = EXCLUDED.head_first_name,
        head_middle_name = EXCLUDED.head_middle_name,
        head_last_name = EXCLUDED.head_last_name,
        head_sex = EXCLUDED.head_sex,
        head_position_title = EXCLUDED.head_position_title,
        head_date_of_birth = EXCLUDED.head_date_of_birth,
        head_date_hired = EXCLUDED.head_date_hired,
        google_drive_link = EXCLUDED.google_drive_link,
        google_drive_file_id = EXCLUDED.google_drive_file_id,
        google_drive_file_name = EXCLUDED.google_drive_file_name,
        google_drive_thumbnail_url = EXCLUDED.google_drive_thumbnail_url,
        unit1_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
    `;

    const values = [
      data.school_id, data.iern || null, data.school_name,
      data.region, data.province, data.municipality, data.barangay,
      data.division, data.district, data.leg_district, data.curricular_offering,
      data.latitude, data.longitude, data.school_head || null,
      data.contact_number || null, data.ownership || null,
      data.google_drive_link || null, // ownership_document_path
      data.school_type || null,
      data.mother_school_id || null, data.extension_mother_school_name || null,
      isCompleted, isCompleted ? 1 : 0,
      data.ownership_document_type || null,
      data.established_month || null, data.established_year || null,
      data.head_first_name || null, data.head_middle_name || null, data.head_last_name || null,
      data.head_sex || null, data.head_position_title || null,
      data.head_date_of_birth || null, data.head_date_hired || null,
      data.google_drive_link || null, data.google_drive_file_id || null,
      data.google_drive_file_name || null, data.google_drive_thumbnail_url || null
    ];

    // 1. Attempt an UPDATE first based on permanent IERN to safely allow school_id changes
    let updatedByIern = false;
    if (data.iern) {
      // PK Conflict Hardening: If we are changing school_id ($1), 
      // check if it's already taken by an un-anchored (skeleton) record.
      try {
        const conflictCheck = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [data.school_id]);
        if (conflictCheck.rows.length > 0) {
          const otherIern = conflictCheck.rows[0].iern;
          // If the other record's IERN is diff or null, it's a conflict
          if (otherIern !== data.iern) {
            if (!otherIern) {
              // Target is a skeleton/un-linked record. Safely remove it to allow takeover.
              console.log(`🧹 Safe-Swap: Removing unlinked skeleton record for ${data.school_id} to allow IERN-anchored takeover.`);
              await pool.query('DELETE FROM ph_schools WHERE school_id = $1 AND iern IS NULL', [data.school_id]);
            } else {
              // Actually both have different IERNs - this is a real collision!
              console.warn(`🛑 IERN Collision: Target school_id ${data.school_id} is already anchored to IERN ${otherIern}. Rejecting update.`);
              return res.status(409).json({ 
                error: `Identity Conflict: School ID ${data.school_id} is already permanently assigned to another identity (${otherIern}). Please contact support.` 
              });
            }
          }
        }
      } catch (checkErr) {
        console.error("Safe-Swap Pre-check Error:", checkErr.message);
      }

      const updateRes = await pool.query(`
        UPDATE ph_schools SET
          school_id = $1, school_name = $3, region = $4, province = $5,
          municipality = $6, barangay = $7, division = $8, district = $9,
          leg_district = $10, curricular_offering = $11, latitude = $12,
          longitude = $13, school_head = $14, contact_number = $15,
          ownership = $16, ownership_document_path = $17, school_type = $18,
          mother_school_id = $19, extension_mother_school_name = $20,
          unit1_completed = $21, unit1 = $22,
          ownership_document_type = $23, established_month = $24, established_year = $25,
          head_first_name = $26, head_middle_name = $27, head_last_name = $28,
          head_sex = $29, head_position_title = $30, head_date_of_birth = $31,
          head_date_hired = $32, google_drive_link = $33, google_drive_file_id = $34,
          google_drive_file_name = $35, google_drive_thumbnail_url = $36,
          unit1_updated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE iern = $2
      `, values);

      if (updateRes.rowCount > 0) {
        updatedByIern = true;
      }
    }

    // Fallback to INSERT ON CONFLICT school_id if no unique IERN record matched
    if (!updatedByIern) {
      await pool.query(query, values);
    }

    // Cascading School ID Sync: If school_id changed, propagate to all child tables via IERN
    if (data.iern) {
      const childTablesToSync = [
        'ph_school_buildable_spaces',
        'school_location_profiles',
        'ownership_documents',
        'ph_buildings_repairs',
        'ph_building_inventory',
        'ph_ecart_batches',
        'users' // Sync auth table too
      ];
      for (const table of childTablesToSync) {
        // For users table, also update last_name (which stores school_id by convention)
        const updateQuery = (table === 'users') 
          ? `UPDATE ${table} SET school_id = $1, last_name = $1 WHERE iern = $2`
          : `UPDATE ${table} SET school_id = $1 WHERE iern = $2`;
          
        await pool.query(updateQuery, [data.school_id, data.iern]).catch(e => {
          console.warn(`⚠️  Cascading Sync failed for ${table}:`, e.message);
        });
      }
    }

    // --- SYNC TO schools_IERN (Mapping Update) ---
    // If a School Head provides both school_id and iern, ensure the mapping exists in schools_IERN
    if (data.school_id && data.iern) {
      try {
        const iernValues = [
          data.school_id, data.iern, data.school_name,
          data.region || null, data.division || null, data.province || null, data.municipality || null, data.district || null
        ];

        const updateIernRes = await pool.query(`
          UPDATE "schools_IERN" 
          SET iern = $2, "School_Name" = $3, "Region" = $4, "Division" = $5, "Province" = $6, "Municipality" = $7, "District" = $8 
          WHERE "SchoolID" = $1
        `, iernValues);

        if (updateIernRes.rowCount === 0) {
          await pool.query(`
            INSERT INTO "schools_IERN" ("SchoolID", "iern", "School_Name", "Region", "Division", "Province", "Municipality", "District")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, iernValues);
        }
      } catch (syncErr) {
        console.error("âš ï¸ schools_IERN Sync Error:", syncErr.message);
      }
    }

    // Auto-update school_summary instantly
    try {
      if (poolNew) await updateSchoolSummary(data.school_id, poolNew);
    } catch (e) { }

    res.json({ success: true, message: "Unit 1 saved successfully!" });
  } catch (err) {
    console.error("Save Unit 1 Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// --- 27. PUT: Save Unit 2 Learner Data (Modular Beta) ---
// --- Auto-migrate moved to runAutoMigrations ---

app.put('/api/ph_schools/unit2/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  const data = req.body;

  try {
    // Auto-migrate multigrade columns if missing (Batch optimized)
    try {
      const alterParts = [];
      const mgCols = ['multigrade_groupings_1', 'multigrade_groupings_2', 'multigrade_groupings_3'];
      for (const col of mgCols) {
        alterParts.push(`ADD COLUMN IF NOT EXISTS ${col} TEXT`);
      }
      const mgEnrCols = ['multigrade_enrollment_1', 'multigrade_enrollment_2', 'multigrade_enrollment_3'];
      for (const col of mgEnrCols) {
        alterParts.push(`ADD COLUMN IF NOT EXISTS ${col} INTEGER DEFAULT 0`);
      }
      await pool.query(`ALTER TABLE ph_schools ${alterParts.join(', ')}`);
    } catch (e) {
      console.warn("DB Migration Warning for Unit 2:", e.message);
    }

    // We expect { unit2_simplified_enrollment: [...] } OR { unit2_simplified_enrollment: { array: [...], questionnaire: {} } }
    const rawData = data.unit2_simplified_enrollment || [];
    const simplifiedData = Array.isArray(rawData) ? rawData : (rawData.array || []);

    // Calculate global sums to populate legacy columns for Dashboards
    let totalM = 0;
    let totalF = 0;
    let enrollmentByGrade = {
      kinder: 0, g1: 0, g2: 0, g3: 0, g4: 0, g5: 0, g6: 0,
      g7: 0, g8: 0, g9: 0, g10: 0, g11: 0, g12: 0
    };

    simplifiedData.forEach(item => {
      const m = parseInt(item.male) || 0;
      const f = parseInt(item.female) || 0;
      const total = parseInt(item.total) || (m + f);

      if (m < 0 || f < 0 || total < 0) {
        throw new Error("Negative numbers are not allowed in enrollment data.");
      }

      totalM += m;
      totalF += f;
      if (enrollmentByGrade[item.grade_level] !== undefined) {
        enrollmentByGrade[item.grade_level] = total;
      }
    });

    // If we are using the new sequential flow, we might have global gender totals instead of per-grade.
    // Let's check the questionnaire object for global totals.
    if (!Array.isArray(rawData) && rawData.questionnaire && rawData.questionnaire.genderTotals) {
      totalM = parseInt(rawData.questionnaire.genderTotals.male) || 0;
      totalF = parseInt(rawData.questionnaire.genderTotals.female) || 0;
    }

    const globalTotal = totalM + totalF;

    // NOTE FOR DATABASE CLEANUP: 
    // The previous 'multigrade_details' JSON column is now deprecated in favor of 
    // fixed-columns to match Unit 3 structure. You can drop it from your database manually using:
    // ALTER TABLE ph_schools DROP COLUMN multigrade_details;

    const fields = [
      'enroll_kinder = $1', 'enroll_g1 = $2', 'enroll_g2 = $3', 'enroll_g3 = $4',
      'enroll_g4 = $5', 'enroll_g5 = $6', 'enroll_g6 = $7', 'enroll_g7 = $8', 'enroll_g8 = $9',
      'enroll_g9 = $10', 'enroll_g10 = $11', 'enroll_g11 = $12', 'enroll_g12 = $13', 'total_enrollment = $14',
      'male_enrollment = $15', 'female_enrollment = $16',
      'sned_self_contained_count = $17',
      'unit2_simplified_enrollment = $18',
      'multigrade_groupings_1 = $20', 'multigrade_groupings_2 = $21', 'multigrade_groupings_3 = $22',
      'multigrade_enrollment_1 = $23', 'multigrade_enrollment_2 = $24', 'multigrade_enrollment_3 = $25',
      'unit2_completed = TRUE', 'unit2_updated_at = CURRENT_TIMESTAMP', 'verified_as_of = CURRENT_TIMESTAMP'
    ];

    const values = [
      enrollmentByGrade.kinder, enrollmentByGrade.g1, enrollmentByGrade.g2, enrollmentByGrade.g3,
      enrollmentByGrade.g4, enrollmentByGrade.g5, enrollmentByGrade.g6, enrollmentByGrade.g7, enrollmentByGrade.g8,
      enrollmentByGrade.g9, enrollmentByGrade.g10, enrollmentByGrade.g11, enrollmentByGrade.g12, globalTotal,
      totalM, totalF,
      parseInt(data.sned_self_contained_count) || 0,
      JSON.stringify(rawData),
      schoolId, // $19
      data.multigrade_groupings_1 || null, // $20
      data.multigrade_groupings_2 || null, // $21
      data.multigrade_groupings_3 || null, // $22
      parseInt(data.multigrade_enrollment_1) || null, // $23
      parseInt(data.multigrade_enrollment_2) || null, // $24
      parseInt(data.multigrade_enrollment_3) || null  // $25
    ];

    const query = `UPDATE ph_schools SET ${fields.join(', ')} WHERE school_id = $19`;

    // Ensure row exists before update
    await pool.query('INSERT INTO ph_schools (iern, school_id) VALUES ($1, $2) ON CONFLICT (iern) DO UPDATE SET school_id = EXCLUDED.school_id', [data.iern, schoolId]);
    await pool.query(query, values);

    // Auto-update school_summary instantly
    try {
      if (poolNew) await updateSchoolSummary(schoolId, poolNew);
    } catch (e) { }

    res.json({ success: true, message: "Unit 2 Learner data saved successfully!" });

  } catch (err) {
    console.error("Save Unit 2 Learner Data Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// --- 30. PUT: Save Unit 3 Organized Classes Data (Modular Beta) ---
app.put('/api/ph_schools/unit3/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  const data = req.body;

  const {
    has_multigrade,
    multigrade_sections_count,
    unit3_simplified_counts,
    grade_kinder_size, grade_1_size, grade_2_size, grade_3_size, grade_4_size,
    grade_5_size, grade_6_size, grade_7_size, grade_8_size, grade_9_size,
    grade_10_size, grade_11_size, grade_12_size,
    multigrade_groupings_1, multigrade_size_1,
    multigrade_groupings_2, multigrade_size_2,
    multigrade_groupings_3, multigrade_size_3
  } = data;

  if (typeof has_multigrade === 'undefined') {
    return res.status(400).json({ error: 'has_multigrade is required' });
  }

  try {
    // Auto-migrate column if missing
    try {
      await pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit3_simplified_counts JSONB');
      await pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS multigrade_sections_count INTEGER DEFAULT 0');

      const fixedCols = [
        'grade_kinder_size', 'grade_1_size', 'grade_2_size', 'grade_3_size', 'grade_4_size',
        'grade_5_size', 'grade_6_size', 'grade_7_size', 'grade_8_size', 'grade_9_size',
        'grade_10_size', 'grade_11_size', 'grade_12_size',
        'multigrade_groupings_1', 'multigrade_size_1',
        'multigrade_groupings_2', 'multigrade_size_2',
        'multigrade_groupings_3', 'multigrade_size_3'
      ];
      for (const col of fixedCols) {
        await pool.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS ${col} TEXT`);
      }
    } catch (e) {
      console.warn("DB Migration Warning for Unit 3:", e.message);
    }

    const sectionsJson = typeof unit3_simplified_counts === 'string' ? unit3_simplified_counts : JSON.stringify(unit3_simplified_counts || []);

    const fields = [
      'has_multigrade = $1',
      'multigrade_sections_count = $2',
      'unit3_simplified_counts = $3::jsonb',
      'unit3_completed = TRUE',
      'unit3_updated_at = CURRENT_TIMESTAMP',
      'updated_at = CURRENT_TIMESTAMP',
      'grade_kinder_size = $4',
      'grade_1_size = $5',
      'grade_2_size = $6',
      'grade_3_size = $7',
      'grade_4_size = $8',
      'grade_5_size = $9',
      'grade_6_size = $10',
      'grade_7_size = $11',
      'grade_8_size = $12',
      'grade_9_size = $13',
      'grade_10_size = $14',
      'grade_11_size = $15',
      'grade_12_size = $16',
      'multigrade_groupings_1 = $17',
      'multigrade_size_1 = $18',
      'multigrade_groupings_2 = $19',
      'multigrade_size_2 = $20',
      'multigrade_groupings_3 = $21',
      'multigrade_size_3 = $22'
    ];

    const query = `
      UPDATE ph_schools
      SET ${fields.join(', ')}
      WHERE school_id = $23
    `;

    const values = [
      has_multigrade,
      multigrade_sections_count || 0,
      sectionsJson,
      grade_kinder_size || null,
      grade_1_size || null,
      grade_2_size || null,
      grade_3_size || null,
      grade_4_size || null,
      grade_5_size || null,
      grade_6_size || null,
      grade_7_size || null,
      grade_8_size || null,
      grade_9_size || null,
      grade_10_size || null,
      grade_11_size || null,
      grade_12_size || null,
      multigrade_groupings_1 || null,
      multigrade_size_1 || null,
      multigrade_groupings_2 || null,
      multigrade_size_2 || null,
      multigrade_groupings_3 || null,
      multigrade_size_3 || null,
      schoolId
    ];

    // Ensure the row exists before updating, in case the user jumped straight to this unit
    await pool.query('INSERT INTO ph_schools (iern, school_id) VALUES ($1, $2) ON CONFLICT (iern) DO UPDATE SET school_id = EXCLUDED.school_id', [data.iern, schoolId]);

    await pool.query(query, values);

    // Auto-update school_summary instantly
    try {
      if (poolNew) await updateSchoolSummary(schoolId, poolNew);
    } catch (e) { }

    res.json({ success: true, message: 'Unit 3 Organized Classes data saved successfully!' });
  } catch (err) {
    console.error('Save Unit 3 Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Auto-migrate Unit 4 columns for G7-G12 and als_total
const unit4MigrateCols = async () => {
  const grades = ['kinder', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
  const cats = ['als', 'muslim', 'ip', 'displaced', 'overage', 'dropout', 'repeater'];

  const alterParts = [];
  for (const cat of cats) {
    for (const g of grades) {
      alterParts.push(`ADD COLUMN IF NOT EXISTS ${cat}_${g} INTEGER DEFAULT 0`);
    }
  }
  alterParts.push(`ADD COLUMN IF NOT EXISTS als_total INTEGER DEFAULT 0`);

  try {
    await pool.query(`ALTER TABLE ph_schools ${alterParts.join(', ')}`);
  } catch (e) { }
};
// --- Auto-migrate moved to runAutoMigrations ---

// --- 31. PUT: Save Unit 4 Learner Profile (Modular Beta) ---
app.put('/api/ph_schools/unit4/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  const data = req.body;
  const { selected_learner_groups = [] } = data;

  const pInt = (v) => (v === '' || v === null || v === undefined || isNaN(parseInt(v))) ? 0 : parseInt(v);

  try {
    // Auto-ensure columns exist before writing (Batch optimized)
    const allGrades = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
    const allCats = ['als', 'muslim', 'ip', 'displaced', 'overage', 'dropout', 'repeater', 'lwd', 'sned'];
    const alterParts = [];
    for (const cat of allCats) {
      for (const g of allGrades) {
        alterParts.push(`ADD COLUMN IF NOT EXISTS ${cat}_${g} INTEGER DEFAULT 0`);
      }
    }
    alterParts.push(`ADD COLUMN IF NOT EXISTS als_total INTEGER DEFAULT 0`);
    try {
      await pool.query(`ALTER TABLE ph_schools ${alterParts.join(', ')}`);
    } catch (e) { }

    const groupsJson = JSON.stringify(selected_learner_groups);
    const setClauses = [];
    const values = [];
    let vCount = 1;

    setClauses.push(`selected_learner_groups = $${vCount++}::jsonb`);
    values.push(groupsJson);

    // Health / BMI
    const bmiCols = ['bmi_severely_wasted', 'bmi_wasted', 'bmi_overweight_obese', 'bmi_normal'];
    for (const b of bmiCols) {
      if (data[b] !== undefined) {
        setClauses.push(`${b} = $${vCount++}`);
        values.push(pInt(data[b]));
      }
    }

    // Dynamic Category x Grade columns (K-12)
    const grades = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
    const categories = ['als', 'muslim', 'ip', 'displaced', 'overage', 'dropout', 'repeater', 'lwd', 'sned'];

    for (const cat of categories) {
      for (const grade of grades) {
        const colName = `${cat}_${grade}`;
        if (data[colName] !== undefined) {
          setClauses.push(`${colName} = $${vCount++}`);
          values.push(pInt(data[colName]));
        }
      }
    }

    // Global ALS total (independent of per-grade)
    if (data.als_total !== undefined) {
      setClauses.push(`als_total = $${vCount++}`);
      values.push(pInt(data.als_total));
    }

    setClauses.push(`unit4_completed = TRUE`);
    setClauses.push(`unit4_updated_at = CURRENT_TIMESTAMP`);
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(schoolId);

    const query = `
      UPDATE ph_schools
      SET ${setClauses.join(', ')}
      WHERE school_id = $${vCount}
    `;

    console.log(`[Unit4 Save] Saving ${setClauses.length} fields for school ${schoolId}`);

    // Ensure the row exists before updating, in case the user jumped straight to this unit
    await pool.query('INSERT INTO ph_schools (iern, school_id) VALUES ($1, $2) ON CONFLICT (iern) DO UPDATE SET school_id = EXCLUDED.school_id', [data.iern, schoolId]);

    await pool.query(query, values);

    // Auto-update school_summary instantly
    try {
      if (poolNew) await updateSchoolSummary(schoolId, poolNew);
    } catch (e) { }

    res.json({ success: true, message: 'Unit 4 Learner Profile data saved successfully!' });
  } catch (err) {
    console.error('Save Unit 4 Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- 27e. PUT: Save Unit 5 Shifting & Modalities (Modular Beta) ---
app.put('/api/ph_schools/unit5/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  const data = req.body;

  try {
    // Audit & Auto-migrate Insights columns
    const insightsCols = [
      'total_teachers_kinder', 'total_teachers_elementary', 'total_teachers_jhs', 'total_teachers_shs',
      'bldg_count_good', 'bldg_count_minor_repair', 'bldg_count_major_repair',
      'it_laptop_total', 'it_tablet_total', 'it_pc_total', 'it_printer_total', 'it_ecart_total'
    ];
    const insightsAlter = insightsCols.map(c => `ADD COLUMN IF NOT EXISTS ${c} INTEGER DEFAULT 0`);
    
    // Auto-migrate multigrade shift/mode columns
    const mgCols = [];
    for (let i = 1; i <= 3; i++) {
      mgCols.push(`ADD COLUMN IF NOT EXISTS shift_mg_${i} TEXT`);
      mgCols.push(`ADD COLUMN IF NOT EXISTS mode_mg_${i} TEXT`);
    }
    
    await pool.query(`ALTER TABLE ph_schools ${[...insightsAlter, ...mgCols].join(', ')}`);
  } catch (e) { }

  try {
    // Base dynamic fields for K-12
    const levels = ["kinder", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10", "g11", "g12", "mg_1", "mg_2", "mg_3"];
    const dynamicFields = [];
    const values = [];
    let paramIdx = 1;

    // Ensure standard check is a boolean
    const parseBool = (val) => val === true || val === 'true';

    dynamicFields.push(`has_standard_shifting = $${paramIdx++}`);
    values.push(parseBool(data.has_standard_shifting));

    // Push ADM Toggles
    dynamicFields.push(`adm_mdl = $${paramIdx++}`);
    values.push(parseBool(data.adm_mdl));

    dynamicFields.push(`adm_odl = $${paramIdx++}`);
    values.push(parseBool(data.adm_odl));

    dynamicFields.push(`adm_tvi = $${paramIdx++}`);
    values.push(parseBool(data.adm_tvi));

    dynamicFields.push(`adm_blended = $${paramIdx++}`);
    values.push(parseBool(data.adm_blended));

    // Build out Shift/Mode mappings dynamically based on existing levels
    for (const lvl of levels) {
      if (data[`shift_${lvl}`] !== undefined) {
        dynamicFields.push(`shift_${lvl} = $${paramIdx++}`);
        values.push(data[`shift_${lvl}`]);
      }
      if (data[`mode_${lvl}`] !== undefined) {
        dynamicFields.push(`mode_${lvl} = $${paramIdx++}`);
        values.push(data[`mode_${lvl}`]);
      }
    }

    dynamicFields.push(`unit5_completed = TRUE`);
    dynamicFields.push(`unit5_updated_at = CURRENT_TIMESTAMP`);
    dynamicFields.push(`verified_as_of = CURRENT_TIMESTAMP`);
    dynamicFields.push(`updated_at = CURRENT_TIMESTAMP`);
    // Ensure the row exists before updating, in case the user jumped straight to this unit
    await pool.query('INSERT INTO ph_schools (iern, school_id) VALUES ($1, $2) ON CONFLICT (iern) DO UPDATE SET school_id = EXCLUDED.school_id', [data.iern, schoolId]);

    // --- START BASELINE CALCULATION ---
    // Calculate teacher headcount from master list (teachers_list)
    let totalRegistered = 0;
    try {
      const teacherCountRes = await pool.query('SELECT COUNT(*) FROM teachers_list WHERE CAST("school.id" AS TEXT) = $1', [schoolId]);
      totalRegistered = parseInt(teacherCountRes.rows[0].count) || 0;

      // Add total_teachers_registered to dynamic update
      dynamicFields.push(`total_teachers_registered = $${paramIdx++}`);
      values.push(totalRegistered);
      console.log(`[Unit 5] Calculated Baseline Teachers for ${schoolId}: ${totalRegistered}`);
    } catch (countErr) {
      console.error("[Unit 5] Failed to calculate teacher baseline:", countErr.message);
    }
    // --- END BASELINE CALCULATION ---

    values.push(schoolId);

    const query = `
        UPDATE ph_schools 
        SET ${dynamicFields.join(', ')} 
        WHERE school_id = $${paramIdx}
        RETURNING school_id, unit5_completed
      `;

    const result = await pool.query(query, values);
    console.log("UNIT 5 UPDATE RESULT:", result.rows);

    // Auto-update school_summary instantly
    try {
      if (poolNew) await updateSchoolSummary(schoolId, poolNew);
    } catch (e) { }

    res.json({ success: true, message: "Unit 5 Shifting & Modality data saved successfully!" });
  } catch (err) {
    console.error("Save Unit 5 Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Generic PUT: Save Arbitrary ph_schools Data (Used by Unit 9 and others) ---
app.put('/api/ph_schools/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  const data = req.body;

  try {
    const keys = Object.keys(data).filter(k => k !== 'iern'); // Don't update iern itself
    if (keys.length === 0 && !data.iern) return res.json({ success: true, message: 'No data provided' });

    // Handle IERN identity anchoring
    let anchorClause = 'school_id = $' + (keys.length + 1);
    let anchorValue = schoolId;

    if (data.iern) {
      // Upsert to ensure mapping exists
      await pool.query(`
        INSERT INTO ph_schools (iern, school_id) 
        VALUES ($1, $2) 
        ON CONFLICT (iern) DO UPDATE SET school_id = EXCLUDED.school_id
      `, [data.iern, schoolId]);
      
      anchorClause = 'iern = $' + (keys.length + 1);
      anchorValue = data.iern;
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(anchorValue);

    const query = `
      UPDATE ph_schools 
      SET ${setClauses.join(', ')}
      WHERE ${anchorClause}
      RETURNING *;
    `;
    const result = await pool.query(query, values);

    // Auto-update school_summary instantly
    try {
      if (poolNew) await updateSchoolSummary(schoolId, poolNew);
    } catch (e) { }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Generic School Update Error:", err);
    res.status(500).json({ status: 'error', error: "Failed to save school resources", details: err.message });
  }
});

// --- Unit 9: Replace eCarts Relational Table Data ---
app.post('/api/ph_schools/unit9/:schoolId/ecarts', async (req, res) => {
  const { schoolId } = req.params;
  const { ecarts } = req.body;

  try {
    // 1. Fetch iern context
    const sRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
    const iern = sRes.rows.length > 0 ? sRes.rows[0].iern : null;

    // 2. Clear old batches (Full Replacement logic)
    if (iern) {
      await pool.query('DELETE FROM ph_ecart_batches WHERE iern = $1', [iern]);
    } else {
      await pool.query('DELETE FROM ph_ecart_batches WHERE school_id = $1', [schoolId]);
    }

    // 3. Insert new batches
    if (ecarts && ecarts.length > 0) {
      for (const item of ecarts) {
        await pool.query(`
          INSERT INTO ph_ecart_batches (
            school_id, iern, batches_name, year_received, sources_fund,
            ecart_laptops, ecart_tablets, ecart_tv, charging_condition, remarks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          schoolId, iern,
          item.batches_name || 'Unnamed Batch',
          parseInt(item.year_received) || null,
          item.sources_fund || null,
          parseInt(item.ecart_laptops) || 0,
          parseInt(item.ecart_tablets) || 0,
          parseInt(item.ecart_tv) || 0,
          item.charging_condition || null,
          item.remarks || null
        ]);
      }
    }

    res.json({ success: true, message: "eCarts synced to relational table successfully." });
  } catch (err) {
    console.error("eCart Relational Sync Error:", err);
    res.status(500).json({ error: "Failed to persist eCart batches." });
  }
});

// --- 27f. [LEGACY] Redundant Physical Facilities Save (Replaced by Generic PUT) ---
/*
app.put('/api/ph_schools/unit6/:schoolId', async (req, res) => {
  // ... (Removed as redundant)
});
*/

// --- 27g-GET: [LEGACY] Old Teaching Personnel Data (Use Unified Roster instead) ---
// Unit 6 legacy teaching personnel endpoint removed.


// --- 27g. [LEGACY] Old Save Teaching Personnel (Use Unified Roster instead) ---
/*
app.put('/api/ph_schools/unit7/:schoolId', async (req, res) => {
  // ... (Removed as redundant)
});
*/

// Unit 6 Unified Teacher Roster & Workload endpoints removed.


/**
 * POST: Add New Teacher to Roster (Initial Blank)
 */


// Unit 6 (Teaching Personnel) teacher registration endpoint removed.


/* 
  DEPRECATED: Old Unit 8 Personnel Routes
  The following endpoints are now legacy and should be migrated to the unified routes above.
*/
// app.get('/api/personnel/:schoolId', ...)
// app.post('/api/personnel', ...)
// app.delete('/api/personnel/:id', ...)
// app.put('/api/personnel/:id', ...)
// app.put('/api/personnel/:id/workload', ...)

// Unit 6 (Teaching Personnel) finalize endpoint removed.


// --- GET: Workload Summary Dashboard (Unit 6) ---
// Unit 6 (Teaching Personnel) workload summary endpoint removed.



// --- POST: Finalize Unit 7 (School Resources) ---
app.post('/api/ph_schools/unit7/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // Check if Unit 7 furniture data exists
    const schoolRes = await pool.query('SELECT unit7_furniture FROM ph_schools WHERE school_id = $1', [schoolId]);
    const furnitureData = schoolRes.rows[0]?.unit7_furniture;

    if (!furnitureData) {
      return res.json({
        success: false,
        message: "Cannot finalize Unit 7: No school resource data has been saved yet."
      });
    }

    await pool.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit7_completed BOOLEAN DEFAULT FALSE;`);
    await pool.query('UPDATE ph_schools SET unit7_completed = TRUE, unit7 = 1, unit7_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE school_id = $1', [schoolId]);
    res.json({ success: true, message: "Unit 7 finalized!" });
  } catch (err) {
    console.error("Finalize Unit 7 Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==================================================================
//               UNIT 10: PHYSICAL FACILITIES (MAP BUILDER)
// ==================================================================

// --- Unit 10 migrations ---
const ensureUnit10Tables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ph_buildings_inventory (
      id SERIAL PRIMARY KEY,
      school_id TEXT,
      iern TEXT,
      building_name TEXT,
      room_name TEXT,
      category TEXT,
      storey INTEGER,
      classroom INTEGER,
      room_length NUMERIC,
      room_width NUMERIC,
      less_than_7x9 INTEGER DEFAULT 0,
      "7x9" INTEGER DEFAULT 0,
      above_7x9 INTEGER DEFAULT 0,
      grade_level TEXT,
      advisory_teacher TEXT,
      year_completed INTEGER,
      remarks TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await checkAndAddColumn('ph_buildings_inventory', 'room_name', 'TEXT', client);
  await checkAndAddColumn('ph_buildings_inventory', 'less_than_7x9', 'INTEGER DEFAULT 0', client);
  await checkAndAddColumn('ph_buildings_inventory', '"7x9"', 'INTEGER DEFAULT 0', client);
  await checkAndAddColumn('ph_buildings_inventory', 'above_7x9', 'INTEGER DEFAULT 0', client);
  await checkAndAddColumn('ph_buildings_inventory', 'grade_level', 'TEXT', client);
  await checkAndAddColumn('ph_buildings_inventory', 'advisory_teacher', 'TEXT', client);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ph_buildings_demolition (
      id SERIAL PRIMARY KEY,
      school_id TEXT,
      iern TEXT,
      building_name TEXT,
      room_name TEXT,
      less_than_7x9 INTEGER DEFAULT 0,
      "7x9" INTEGER DEFAULT 0,
      above_7x9 INTEGER DEFAULT 0,
      age BOOLEAN DEFAULT FALSE,
      safety BOOLEAN DEFAULT FALSE,
      calamity BOOLEAN DEFAULT FALSE,
      upgrade BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await checkAndAddColumn('ph_buildings_demolition', 'room_name', 'TEXT', client);
  await checkAndAddColumn('ph_buildings_demolition', 'less_than_7x9', 'INTEGER DEFAULT 0', client);
  await checkAndAddColumn('ph_buildings_demolition', '"7x9"', 'INTEGER DEFAULT 0', client);
  await checkAndAddColumn('ph_buildings_demolition', 'above_7x9', 'INTEGER DEFAULT 0', client);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ph_buildings_repairs (
      id SERIAL PRIMARY KEY,
      school_id TEXT,
      iern TEXT,
      building_name TEXT,
      room_name TEXT,
      item_name TEXT,
      oms TEXT,
      condition TEXT,
      damage_ratio INTEGER,
      recommended_action TEXT,
      demo_justification TEXT,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await checkAndAddColumn('ph_buildings_repairs', 'room_name', 'TEXT', client);
  await checkAndAddColumn('ph_buildings_repairs', 'oms', 'TEXT', client);
  await checkAndAddColumn('ph_buildings_repairs', 'demo_justification', 'TEXT', client);
};

// Master Submission Handle
app.post('/api/ph_schools/unit10/:schoolId/master', async (req, res) => {
  console.log(`[Unit 10 Master Submit] Initiated for schoolId: ${req.params.schoolId}`);
  const { schoolId } = req.params;
  const { inventory, repairs, demolitions } = req.body;

  console.log(`[Unit 10 Master Submit] Payload received:`);
  console.log(`  - Inventory count: ${inventory ? inventory.length : 0}`);
  console.log(`  - Repairs count: ${repairs ? repairs.length : 0}`);
  console.log(`  - Demolitions count: ${demolitions ? demolitions.length : 0}`);
  // console.log(`  - Full Payload:`, JSON.stringify(req.body, null, 2));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`[Unit 10 Master Submit] Transaction BEGIN`);

    // 0. Ensure tables exist
    // await ensureUnit10Tables(client);
    console.log(`[Unit 10 Master Submit] Step 0: Logic bypass - Manual SQL suggested`);

    // Get IERN
    const sRes = await client.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
    const iern = sRes.rows.length > 0 ? sRes.rows[0].iern : null;
    console.log(`[Unit 10 Master Submit] Fetched IERN: ${iern}`);

    // 1. Clear old records
    if (iern) {
      const resInvDel = await client.query('DELETE FROM ph_buildings_inventory WHERE iern = $1', [iern]);
      const resDemDel = await client.query('DELETE FROM ph_buildings_demolition WHERE iern = $1', [iern]);
      const resRepDel = await client.query('DELETE FROM ph_buildings_repairs WHERE iern = $1', [iern]);
      console.log(`[Unit 10 Master Submit] Step 1: Clear old records (by IERN) - Deleted [Inv: ${resInvDel.rowCount}, Dem: ${resDemDel.rowCount}, Rep: ${resRepDel.rowCount}]`);
    } else {
      const resInvDel = await client.query('DELETE FROM ph_buildings_inventory WHERE school_id = $1', [schoolId]);
      const resDemDel = await client.query('DELETE FROM ph_buildings_demolition WHERE school_id = $1', [schoolId]);
      const resRepDel = await client.query('DELETE FROM ph_buildings_repairs WHERE school_id = $1', [schoolId]);
      console.log(`[Unit 10 Master Submit] Step 1: Clear old records (by school_id fallback) - Deleted [Inv: ${resInvDel.rowCount}, Dem: ${resDemDel.rowCount}, Rep: ${resRepDel.rowCount}]`);
    }

    // 2. Insert Inventory (Newly Built & Good Condition)
    if (inventory && Array.isArray(inventory)) {
      let invCount = 0;
      for (const b of inventory) {
        await client.query(`
          INSERT INTO ph_buildings_inventory (
            school_id, iern, building_name, category, storey, classroom, 
            room_length, room_width, year_completed, remarks, 
            grade_level, advisory_teacher, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          schoolId, iern, b.building_name, b.category, b.storey || 1, b.classroom || 1,
          b.room_length || 0, b.room_width || 0, b.year_completed, b.remarks,
          b.grade_level || '', b.advisory_teacher || '', b.status
        ]);
        invCount++;
      }
      console.log(`[Unit 10 Master Submit] Step 2: Inserted ${invCount} inventory records`);
    }

    // 3. Insert repairs into ph_buildings_repairs
    if (repairs && Array.isArray(repairs)) {
      let repCount = 0;
      for (const r of repairs) {
        if (r.items && Array.isArray(r.items)) {
          for (const itm of r.items) {
            await client.query(`
              INSERT INTO ph_buildings_repairs (
                school_id, iern, building_name, room_name, item_name, oms,
                condition, damage_ratio, recommended_action, demo_justification, remarks
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              schoolId, iern, r.building_name, r.room_name, itm.item, itm.oms,
              itm.condition, itm.damage_ratio || 0, itm.recommend_action, itm.demo_justification, itm.remarks
            ]);
            repCount++;
          }
        }
      }
      console.log(`[Unit 10 Master Submit] Step 3: Inserted ${repCount} repair records (items)`);
    }

    // 4. Insert Demolitions
    if (demolitions && Array.isArray(demolitions)) {
      let demCount = 0;
      for (const d of demolitions) {
        await client.query(`
          INSERT INTO ph_buildings_demolition (
            school_id, iern, building_name, 
            less_than_7x9, "7x9", above_7x9,
            age, safety, calamity, upgrade
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          schoolId, iern, d.building_name,
          d.less_than_7x9 || 0, d["7x9"] || 0, d.above_7x9 || 0,
          !!d.age, !!d.safety, !!d.calamity, !!d.upgrade
        ]);
        demCount++;
      }
      console.log(`[Unit 10 Master Submit] Step 4: Inserted ${demCount} demolition records`);
    }

    // 5. Finalize Completion
    await client.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit10_completed BOOLEAN DEFAULT FALSE;');
    if (iern) {
      await client.query('UPDATE ph_schools SET unit10_completed = TRUE WHERE iern = $1', [iern]);
    } else {
      await client.query('UPDATE ph_schools SET unit10_completed = TRUE WHERE school_id = $1', [schoolId]);
    }
    console.log(`[Unit 10 Master Submit] Step 5: Updated unit10_completed = TRUE`);

    await client.query('COMMIT');
    console.log(`[Unit 10 Master Submit] Transaction COMMIT - Success`);
    res.json({ success: true, message: "Unit 10 Audit finalized successfully." });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
      console.error(`[Unit 10 Master Submit] Transaction ROLLBACK due to error`);
    }
    console.error("❌ Unit 10 Master Submission Error details:", err);
    res.status(500).json({ error: "Failed to finalize Unit 10 Audit.", details: err.message });
  } finally {
    if (client) client.release();
  }
});

// GET Unit 10 Phase 2 Master Data
app.get('/api/ph_schools/unit10/:schoolId/master', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // Attempt to find IERN first
    const sRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
    const iern = sRes.rows[0]?.iern;

    let invRes, repRes, demRes;
    if (iern) {
      invRes = await pool.query('SELECT * FROM ph_buildings_inventory WHERE iern = $1 OR school_id = $2 ORDER BY id ASC', [iern, schoolId]);
      repRes = await pool.query('SELECT * FROM ph_buildings_repairs WHERE iern = $1 OR school_id = $2 ORDER BY id ASC', [iern, schoolId]);
      demRes = await pool.query('SELECT * FROM ph_buildings_demolition WHERE iern = $1 OR school_id = $2 ORDER BY id ASC', [iern, schoolId]);
    } else {
      invRes = await pool.query('SELECT * FROM ph_buildings_inventory WHERE school_id = $1 ORDER BY id ASC', [schoolId]);
      repRes = await pool.query('SELECT * FROM ph_buildings_repairs WHERE school_id = $1 ORDER BY id ASC', [schoolId]);
      demRes = await pool.query('SELECT * FROM ph_buildings_demolition WHERE school_id = $1 ORDER BY id ASC', [schoolId]);
    }

    // Grouping rooms into buildings by building_name for the frontend
    const buildingsMap = {};
    invRes.rows.forEach(row => {
      const bName = row.building_name;
      if (!buildingsMap[bName]) {
        buildingsMap[bName] = {
          ...row,
          rooms: []
        };
      }
      buildingsMap[bName].rooms.push({
        id: row.id,
        room_name: row.room_name,
        grade_level: row.grade_level,
        advisory_teacher: row.advisory_teacher,
        room_length: row.room_length,
        room_width: row.room_width,
        condition: row.status // Mapping 'status' back to condition for UI
      });
    });

    const inventory = Object.values(buildingsMap);

    // Check completion status from ph_schools
    let completed = false;
    try {
      const schRes = await pool.query('SELECT unit8_completed, unit10_completed FROM ph_schools WHERE school_id = $1', [schoolId]);
      if (schRes.rows.length > 0) {
        completed = schRes.rows[0].unit8_completed === true || schRes.rows[0].unit10_completed === true;
      }

      // Auto-mark as completed if records exist but flag is missing
      if (!completed) {
        if (invRes.rows.length > 0 || repRes.rows.length > 0 || demRes.rows.length > 0) {
          completed = true;
          // Best effort: sync flag in background
          pool.query('UPDATE ph_schools SET unit8_completed = TRUE, unit8 = 1, unit8_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE school_id = $1', [schoolId]).catch(e => { });
        }
      }
    } catch (e) {
      console.warn(`Could not check unit8_completed/unit10_completed for ${schoolId}:`, e.message);
    }

    res.json({
      success: true,
      data: {
        inventory: inventory,
        repairs: repRes.rows || [],
        demolitions: demRes.rows || [],
        isCompleted: completed
      }
    });

  } catch (err) {
    console.error(`Error fetching Unit 10 master data for ${schoolId}:`, err);
    res.status(500).json({ error: "Failed to fetch master data" });
  }
});

// GET spaces for a school
app.get('/api/ph_schools/unit10/:schoolId/spaces', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // Attempt to find IERN first for stable lookup
    const sRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
    const iern = sRes.rows[0]?.iern;

    let result;
    if (iern) {
      result = await pool.query('SELECT * FROM ph_school_buildable_spaces WHERE iern = $1 OR school_id = $2 ORDER BY created_at DESC', [iern, schoolId]);
    } else {
      result = await pool.query('SELECT * FROM ph_school_buildable_spaces WHERE school_id = $1 ORDER BY created_at DESC', [schoolId]);
    }
    res.json({ success: true, spaces: result.rows });
  } catch (err) {
    console.error("GET Unit 10 Spaces Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST a new space
app.post('/api/ph_schools/unit10/:schoolId/spaces', async (req, res) => {
  const { schoolId } = req.params;
  const { iern, space_name, center_lat, center_lng, length_m, width_m, total_area_sqm, rotation_deg } = req.body;
  try {
    // Idempotent migration: Add rotation_deg column if it doesn't exist
    await pool.query('ALTER TABLE ph_school_buildable_spaces ADD COLUMN IF NOT EXISTS rotation_deg NUMERIC DEFAULT 0;').catch(() => {});

    const query = `
      INSERT INTO ph_school_buildable_spaces 
      (school_id, iern, space_name, center_lat, center_lng, length_m, width_m, total_area_sqm, rotation_deg) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      ON CONFLICT (iern, space_name) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        center_lat = EXCLUDED.center_lat,
        center_lng = EXCLUDED.center_lng,
        length_m = EXCLUDED.length_m,
        width_m = EXCLUDED.width_m,
        total_area_sqm = EXCLUDED.total_area_sqm,
        rotation_deg = EXCLUDED.rotation_deg
      RETURNING *;
    `;
    const values = [schoolId, iern || null, space_name || 'New Space', center_lat, center_lng, length_m, width_m, total_area_sqm, rotation_deg || 0];
    const result = await pool.query(query, values);

    await pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS unit10_completed BOOLEAN DEFAULT FALSE;');
    // Removed premature UPDATE unit10_completed = TRUE

    res.json({ success: true, space: result.rows[0] });
  } catch (err) {
    console.error("POST Unit 10 Space Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE a space
app.delete('/api/ph_schools/unit10/spaces/:spaceId', async (req, res) => {
  const { spaceId } = req.params;
  try {
    await pool.query('DELETE FROM ph_school_buildable_spaces WHERE id = $1', [spaceId]);
    res.json({ success: true, message: "Space deleted." });
  } catch (err) {
    console.error("DELETE Unit 10 Space Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==================================================================
//               SCHOOL LOCATION MODULE (New Module)
// ==================================================================

const schoolLocationSchema = z.object({
  school_id: z.string(),
  iern: z.string().optional(),
  transportation_modes: z.array(z.string()).optional(),
  road_paved_pct: z.coerce.number().min(0).max(100),
  road_unpaved_pct: z.coerce.number().min(0).max(100),
  road_lighting_pct: z.coerce.number().min(0).max(100).nullable().optional(),
  public_transpo_availability: z.coerce.number().min(1).max(5).nullable().optional(),
  near_cliff_ravine: z.boolean().optional(),
  road_cliff_pct: z.coerce.number().min(0).max(100).nullable().optional(),
  near_water: z.boolean().optional(),
  water_proximity: z.array(z.any()).optional(),
  natural_calamities: z.array(z.any()).optional(),
  hazards_experienced: z.array(z.string()).optional(),
  has_insurgency_threats: z.boolean().optional(),
  insurgency_threats_6mo: z.coerce.number().nullable().optional(),
  road_passable_public_transpo_pct: z.coerce.number().min(0).max(100).nullable().optional(),
  river_crossing_on_foot: z.boolean().optional(),
  river_crossing_count: z.coerce.number().nullable().optional(),
  emergency_response_mins: z.coerce.number().nullable().optional(),
  proximity_hospital_km: z.coerce.number().nullable().optional(),
  proximity_brgy_hall_mins: z.coerce.number().nullable().optional(),
  proximity_brgy_hall_km: z.coerce.number().nullable().optional(),
  proximity_muni_hall_mins: z.coerce.number().nullable().optional(),
  proximity_muni_hall_km: z.coerce.number().nullable().optional(),
  proximity_sdo_mins: z.coerce.number().nullable().optional(),
  proximity_sdo_km: z.coerce.number().nullable().optional(),
  proximity_clinic_mins: z.coerce.number().nullable().optional(),
  proximity_clinic_km: z.coerce.number().nullable().optional(),
  proximity_terminal_mins: z.coerce.number().nullable().optional(),
  proximity_terminal_km: z.coerce.number().nullable().optional(),
  proximity_highway_mins: z.coerce.number().nullable().optional(),
  proximity_highway_km: z.coerce.number().nullable().optional(),
  cellular_coverage: z.string().optional(),
  weather_isolation: z.boolean().optional(),
  anthropogenic_threats: z.array(z.object({
    type: z.string(),
    incidences: z.coerce.number()
  })).optional(),
}).refine(data => ((Number(data.road_paved_pct) || 0) + (Number(data.road_unpaved_pct) || 0)) === 100, {
  message: "Paved and unpaved percentages must sum to 100",
  path: ["road_paved_pct"]
});

// GET /api/school-location/:school_id
app.get('/api/school-location/:school_id', async (req, res) => {
  const { school_id } = req.params;
  try {
    // Attempt to find IERN first
    const sRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [school_id]);
    const iern = sRes.rows[0]?.iern;

    let result;
    if (iern) {
      result = await pool.query('SELECT * FROM school_location_profiles WHERE iern = $1 OR school_id = $2', [iern, school_id]);
    } else {
      result = await pool.query('SELECT * FROM school_location_profiles WHERE school_id = $1', [school_id]);
    }
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error("GET School Location Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/school-location
app.post('/api/school-location', async (req, res) => {
  try {
    const val = schoolLocationSchema.safeParse(req.body);
    if (!val.success) {
      const flattenedErrors = val.error.flatten();
      console.error("❌ Zod Validation Error (Flattened):", JSON.stringify(flattenedErrors, null, 2));
      console.error("❌ Raw Zod Issues:", val.error.issues);
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: val.error.issues,
        flattened: flattenedErrors
      });
    }
    const validatedData = val.data;
    const riskIndex = calculateRiskIndex(validatedData);

    const query = `
      INSERT INTO school_location_profiles (
        school_id, iern, transportation_modes, road_paved_pct, road_unpaved_pct, road_lighting_pct,
        public_transpo_availability, water_proximity, near_cliff_ravine, road_cliff_pct,
        near_water, natural_calamities, hazards_experienced, has_insurgency_threats, 
        insurgency_threats_6mo, road_passable_public_transpo_pct, river_crossing_on_foot, 
        river_crossing_count, emergency_response_mins, proximity_hospital_km,
        proximity_brgy_hall_mins, proximity_brgy_hall_km, proximity_muni_hall_mins,
        proximity_muni_hall_km, proximity_sdo_mins, proximity_sdo_km,
        proximity_clinic_mins, proximity_clinic_km, proximity_terminal_mins,
        proximity_terminal_km, proximity_highway_mins, proximity_highway_km,
        cellular_coverage, weather_isolation, anthropogenic_threats, risk_index, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, CURRENT_TIMESTAMP
      )
      ON CONFLICT (iern) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        transportation_modes = EXCLUDED.transportation_modes,
        road_paved_pct = EXCLUDED.road_paved_pct,
        road_unpaved_pct = EXCLUDED.road_unpaved_pct,
        road_lighting_pct = EXCLUDED.road_lighting_pct,
        public_transpo_availability = EXCLUDED.public_transpo_availability,
        water_proximity = EXCLUDED.water_proximity,
        near_cliff_ravine = EXCLUDED.near_cliff_ravine,
        road_cliff_pct = EXCLUDED.road_cliff_pct,
        near_water = EXCLUDED.near_water,
        natural_calamities = EXCLUDED.natural_calamities,
        hazards_experienced = EXCLUDED.hazards_experienced,
        has_insurgency_threats = EXCLUDED.has_insurgency_threats,
        insurgency_threats_6mo = EXCLUDED.insurgency_threats_6mo,
        road_passable_public_transpo_pct = EXCLUDED.road_passable_public_transpo_pct,
        river_crossing_on_foot = EXCLUDED.river_crossing_on_foot,
        river_crossing_count = EXCLUDED.river_crossing_count,
        emergency_response_mins = EXCLUDED.emergency_response_mins,
        proximity_hospital_km = EXCLUDED.proximity_hospital_km,
        proximity_brgy_hall_mins = EXCLUDED.proximity_brgy_hall_mins,
        proximity_brgy_hall_km = EXCLUDED.proximity_brgy_hall_km,
        proximity_muni_hall_mins = EXCLUDED.proximity_muni_hall_mins,
        proximity_muni_hall_km = EXCLUDED.proximity_muni_hall_km,
        proximity_sdo_mins = EXCLUDED.proximity_sdo_mins,
        proximity_sdo_km = EXCLUDED.proximity_sdo_km,
        proximity_clinic_mins = EXCLUDED.proximity_clinic_mins,
        proximity_clinic_km = EXCLUDED.proximity_clinic_km,
        proximity_terminal_mins = EXCLUDED.proximity_terminal_mins,
        proximity_terminal_km = EXCLUDED.proximity_terminal_km,
        proximity_highway_mins = EXCLUDED.proximity_highway_mins,
        proximity_highway_km = EXCLUDED.proximity_highway_km,
        cellular_coverage = EXCLUDED.cellular_coverage,
        weather_isolation = EXCLUDED.weather_isolation,
        anthropogenic_threats = EXCLUDED.anthropogenic_threats,
        risk_index = EXCLUDED.risk_index,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      validatedData.school_id,
      req.body.iern || null,
      validatedData.transportation_modes,
      validatedData.road_paved_pct,
      validatedData.road_unpaved_pct,
      validatedData.road_lighting_pct,
      validatedData.public_transpo_availability,
      validatedData.water_proximity ? JSON.stringify(validatedData.water_proximity) : null,
      validatedData.near_cliff_ravine,
      validatedData.road_cliff_pct,
      validatedData.near_water,
      validatedData.natural_calamities ? JSON.stringify(validatedData.natural_calamities) : null,
      validatedData.hazards_experienced,
      validatedData.has_insurgency_threats,
      validatedData.insurgency_threats_6mo,
      validatedData.road_passable_public_transpo_pct,
      validatedData.river_crossing_on_foot,
      validatedData.river_crossing_count,
      validatedData.emergency_response_mins,
      validatedData.proximity_hospital_km,
      validatedData.proximity_brgy_hall_mins,
      validatedData.proximity_brgy_hall_km,
      validatedData.proximity_muni_hall_mins,
      validatedData.proximity_muni_hall_km,
      validatedData.proximity_sdo_mins,
      validatedData.proximity_sdo_km,
      validatedData.proximity_clinic_mins,
      validatedData.proximity_clinic_km,
      validatedData.proximity_terminal_mins,
      validatedData.proximity_terminal_km,
      validatedData.proximity_highway_mins,
      validatedData.proximity_highway_km,
      validatedData.cellular_coverage,
      validatedData.weather_isolation,
      JSON.stringify(validatedData.anthropogenic_threats || []),
      riskIndex
    ];

    const result = await pool.query(query, values);

    // --- UPDATE COMPLETION FLAGS ---
    try {
      const schoolId = validatedData.school_id;

      // STRICT VALIDATION: Only mark as completed if at least one proximity/mins value is non-zero
      const proxFields = [
        'road_lighting_pct', 'road_cliff_pct', 'insurgency_threats_6mo',
        'river_crossing_count', 'emergency_response_mins', 'proximity_hospital_km',
        'proximity_brgy_hall_mins', 'proximity_brgy_hall_km', 'proximity_muni_hall_mins',
        'proximity_muni_hall_km', 'proximity_sdo_mins', 'proximity_sdo_km',
        'proximity_clinic_mins', 'proximity_clinic_km', 'proximity_terminal_mins',
        'proximity_terminal_km', 'proximity_highway_mins', 'proximity_highway_km'
      ];

      const sumProx = proxFields.reduce((acc, field) => acc + (parseFloat(validatedData[field]) || 0), 0);
      const isUnit9Completed = sumProx > 0;

      // 1. Ph_Schools (Quest)
      await pool.query('UPDATE ph_schools SET unit9_completed = $2, unit9 = $3 WHERE school_id = $1', [schoolId, isUnit9Completed, isUnit9Completed ? 1 : 0]);

      // 2. School_Profiles (Main Dashboard FLAG)
      await pool.query('UPDATE school_profiles SET f11_location = $2 WHERE school_id = $1', [schoolId, isUnit9Completed]);

      // 3. Recalculate Snapshot (Atomic)
      await calculateSchoolProgress(schoolId, pool);

      console.log(`[Dashboard Integration] Flags and Snapshot updated for school ${schoolId}`);
    } catch (flagErr) {
      console.warn("[Dashboard Integration] Failed to update flags:", flagErr.message);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("Zod Validation Error:", JSON.stringify(err.errors, null, 2));
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    console.error("POST School Location Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==================================================================
//               USER PROGRESS ENDPOINTS (Facade)
// ==================================================================

// GET /api/user/progress — Returns progress for the current user's school
app.get('/api/user/progress', async (req, res) => {
  try {
    // This endpoint is called without a schoolId param, so return a safe default.
    // The real source of truth is GET /api/ph_schools/progress/:schoolId.
    res.json({ success: true, progress: { completed_units: [], xp: 0 } });
  } catch (err) {
    console.error("GET /api/user/progress Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/user/progress — Marks a unit as completed for a school
app.post('/api/user/progress', async (req, res) => {
  const { unitId, schoolId, duration_seconds } = req.body;
  try {
    // If schoolId was provided, update the flag directly
    if (schoolId && unitId) {
      const col = `unit${unitId}_completed`;
      const updateAtCol = `unit${unitId}_updated_at`;
      await pool.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS ${col} BOOLEAN DEFAULT FALSE`);
      await pool.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS ${updateAtCol} TIMESTAMP`);
      await pool.query(`UPDATE ph_schools SET ${col} = TRUE, ${updateAtCol} = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE school_id = $1`, [schoolId]);

      // Also update the new integer-based column (unit1-unit8) for the dashboard
      const unitNum = parseInt(unitId);
      if (unitNum >= 1 && unitNum <= 9) {
        await pool.query(`UPDATE ph_schools SET unit${unitNum} = 1 WHERE school_id = $1`, [schoolId]);
      }

      // Log performance for the gamification metric
      if (duration_seconds !== undefined && duration_seconds !== null) {
        await pool.query(
          `INSERT INTO ph_performance_logs (school_id, unit_id, duration_seconds) VALUES ($1, $2, $3)`,
          [schoolId, parseInt(unitId), parseInt(duration_seconds)]
        );
      }
    }
    // Always return success — the frontend treats 404 as an error that blocks navigation
    res.json({ success: true, message: `Unit ${unitId} marked as completed.` });
  } catch (err) {
    console.error("POST /api/user/progress Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- END OF PATCH UNIT COMPLETION ---

// --- END OF GET ACTIVITY ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

// --- SERVER STARTUP ---
// ==================================================================
//                      LGU FORMS ROUTES
// ==================================================================

// --- LGU 1. POST: Save New Project (LGU) ---
app.post('/api/lgu/save-project', async (req, res) => {
  const data = req.body;

  if (!data.schoolName || !data.projectName || !data.schoolId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  let client;
  let clientNew;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Dual Write Setup
    if (poolNew) {
      try {
        clientNew = await poolNew.connect();
        await clientNew.query('BEGIN');
      } catch (connErr) {
        console.error("⚠️ Dual-Write LGU: Failed to start transaction:", connErr.message);
        clientNew = null;
      }
    }

    // 1. Generate IPC (LGU-YYYY-XXXXX)
    const year = new Date().getFullYear();
    const ipcResult = await client.query(
      "SELECT ipc FROM lgu_projects WHERE ipc LIKE $1 ORDER BY ipc DESC LIMIT 1",
      [`LGU-${year}-%`]
    );

    let nextSeq = 1;
    if (ipcResult.rows.length > 0) {
      const lastIpc = ipcResult.rows[0].ipc;
      const parts = lastIpc.split('-');
      if (parts.length === 3 && !isNaN(parts[2])) {
        nextSeq = parseInt(parts[2]) + 1;
      }
    }
    const newIpc = `LGU-${year}-${String(nextSeq).padStart(5, '0')}`;

    // 2. Prepare Data
    const lguName = await getUserFullName(data.uid);
    const resolvedLguName = lguName || data.submittedBy || 'LGU User';

    const docs = data.documents || [];
    const powDoc = docs.find(d => d.type === 'POW')?.base64 || null;
    const dupaDoc = docs.find(d => d.type === 'DUPA')?.base64 || null;
    const contractDoc = docs.find(d => d.type === 'CONTRACT')?.base64 || null;

    const projectValues = [
      data.projectName, data.schoolName, data.schoolId,
      valueOrNull(data.region), valueOrNull(data.division),
      data.status || '', parseIntOrNull(data.accomplishmentPercentage),
      valueOrNull(data.statusAsOfDate), valueOrNull(data.targetCompletionDate),
      valueOrNull(data.actualCompletionDate), valueOrNull(data.noticeToProceed),
      valueOrNull(data.contractorName), parseNumberOrNull(data.projectAllocation),
      valueOrNull(data.batchOfFunds), valueOrNull(data.otherRemarks),
      data.uid,           // lgu_id
      newIpc,
      resolvedLguName,    // lgu_name
      valueOrNull(data.latitude),
      valueOrNull(data.longitude),
      powDoc,
      dupaDoc,
      contractDoc
    ];

    const projectQuery = `
      INSERT INTO "lgu_projects" (
        project_name, school_name, school_id, region, division,
        project_status, accomplishment_percentage, status_as_of_date,
        target_completion_date, actual_completion_date, notice_to_proceed,
        contractor_name, total_funds, batch_of_funds, nature_of_delay,
        lgu_id, ipc, lgu_name, latitude, longitude,
        pow_pdf, dupa_pdf, contract_pdf
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING lgu_project_id as project_id, project_name, ipc;
    `;

    // 3. Insert Project
    const projectResult = await client.query(projectQuery, projectValues);
    const newProject = projectResult.rows[0];
    const newProjectId = newProject.project_id;

    // 4. Insert Images
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const imageQuery = `
        INSERT INTO "lgu_image" (project_id, image_data, uploaded_by)
        VALUES ($1, $2, $3)
      `;
      for (const imgBase64 of data.images) {
        await client.query(imageQuery, [newProjectId, imgBase64, data.uid]);
      }
    }

    await client.query('COMMIT');

    // Dual Write Replay
    if (clientNew) {
      try {
        await clientNew.query(projectQuery, projectValues);
        const newProjRes = await clientNew.query("SELECT lgu_project_id as project_id FROM lgu_projects WHERE ipc = $1", [newIpc]);
        if (newProjRes.rows.length > 0) {
          const secProjId = newProjRes.rows[0].project_id;
          if (data.images && Array.isArray(data.images)) {
            const imageQuery = `INSERT INTO "lgu_image" (project_id, image_data, uploaded_by) VALUES ($1, $2, $3)`;
            for (const imgBase64 of data.images) {
              await clientNew.query(imageQuery, [secProjId, imgBase64, data.uid]);
            }
          }
        }
        await clientNew.query('COMMIT');
        console.log("✅ Dual-Write: LGU Project Synced!");
      } catch (dwErr) {
        console.error("❌ Dual-Write LGU Error:", dwErr.message);
        await clientNew.query('ROLLBACK').catch(() => { });
      }
    }

    // 5. Log Activity
    const logDetails = {
      action: "LGU Project Created",
      ipc: newIpc,
      status: data.status,
      timestamp: new Date().toISOString()
    };

    await logActivity(
      data.uid, resolvedLguName, 'LGU', 'CREATE',
      `LGU Project: ${newProject.project_name} (${newIpc})`,
      JSON.stringify(logDetails)
    );

    res.status(200).json({ message: "LGU Project saved!", project: newProject, ipc: newIpc });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (clientNew) await clientNew.query('ROLLBACK').catch(() => { });
    console.error("❌ LGU Save Error:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    if (client) client.release();
    if (clientNew) clientNew.release();
  }
});

// --- LGU 2. POST: Upload Image (LGU) ---
app.post('/api/lgu/upload-image', async (req, res) => {
  const { projectId, imageData, uploadedBy } = req.body;
  if (!projectId || !imageData) return res.status(400).json({ error: "Missing required data" });

  try {
    const query = `INSERT INTO lgu_image (project_id, image_data, uploaded_by) VALUES ($1, $2, $3) RETURNING id;`;
    const result = await pool.query(query, [projectId, imageData, uploadedBy]);

    await logActivity(uploadedBy, 'LGU User', 'LGU', 'UPLOAD', `LGU Project ID: ${projectId}`, `Uploaded image`);

    res.status(201).json({ success: true, imageId: result.rows[0].id });

    // Dual Write
    if (poolNew) {
      try {
        const ipcRes = await pool.query("SELECT ipc FROM lgu_projects WHERE lgu_project_id = $1", [projectId]);
        if (ipcRes.rows.length > 0) {
          const ipc = ipcRes.rows[0].ipc;
          await poolNew.query(`
                    INSERT INTO lgu_image (project_id, image_data, uploaded_by)
                    VALUES ((SELECT lgu_project_id FROM lgu_projects WHERE ipc = $1), $2, $3)
                `, [ipc, imageData, uploadedBy]);
          console.log("✅ Dual-Write: LGU Image Synced!");
        }
      } catch (dwErr) {
        console.error("❌ Dual-Write LGU Image Error:", dwErr.message);
      }
    }

  } catch (err) {
    console.error("❌ LGU Image Upload Error:", err.message);
    res.status(500).json({ error: "Failed to save image" });
  }
});

// --- LGU 3. GET: Fetch LGU Projects ---
app.get('/api/lgu/projects', async (req, res) => {
  const { uid } = req.query;
  try {
    let query = 'SELECT * FROM lgu_projects';
    let params = [];
    if (uid) {
      query += ' WHERE lgu_id = $1';
      params.push(uid);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Fetch LGU Projects Error:", err.message);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// --- LGU 4. GET: Fetch LGU Project Details ---
app.get('/api/lgu/project/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const projectRes = await pool.query('SELECT * FROM lgu_projects WHERE lgu_project_id = $1', [id]);
    if (projectRes.rows.length === 0) return res.status(404).json({ error: "Project not found" });

    const imagesRes = await pool.query('SELECT id, image_data, created_at FROM lgu_image WHERE project_id = $1', [id]);

    res.json({
      ...projectRes.rows[0],
      images: imagesRes.rows
    });
  } catch (err) {
    console.error("❌ Fetch LGU Project Details Error:", err.message);
    res.status(500).json({ error: "Failed to fetch project details" });
  }
});

const startServer = async () => {
  try {
    console.log("🚀 Starting database initialization...");
    await runAutoMigrations();
    await initDB();

    const client = await pool.connect();
    try {
      await runMigrations(client, "Primary");
    } finally {
      client.release();
    }

    console.log("✅ Primary DB Init finished. Running secondary modules in parallel...");

    await initFinanceDB();
    console.log("   [Sequential] initFinanceDB completed.");
    
    await initMasterlistDB();
    console.log("   [Sequential] initMasterlistDB completed.");
    const PORT = process.env.PORT || 3000;



    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n================================================`);
      console.log(`🚀 SERVER RUNNING - PID: ${process.pid}`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 Time: ${new Date().toLocaleString()}`);
      console.log(`🔗 APP READY: http://localhost:5173/`);
      console.log(`================================================\n`);
    });

    // Graceful Shutdown Handlers
    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT (Ctrl+C or PM2). Shutting down...');
      server.close(() => {
        console.log('👋 Server closed.');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM. Shutting down...');
      server.close(() => {
        console.log('👋 Server closed.');
        process.exit(0);
      });
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};



// --- NOTIFICATIONS API ---
app.get('/api/notifications/:uid', authMiddleware, async (req, res) => {
  const { uid } = req.params;
  if (req.user.uid !== uid && req.user.role !== 'Super User') {
    return res.status(403).json({ error: "Unauthorized access to notifications" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [uid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Notifications Error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [id, req.user.uid]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark Read Error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

app.get('/api/admin/feedback', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Super User' && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const result = await pool.query("SELECT * FROM app_feedback ORDER BY timestamp DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Feedback Error:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

app.get('/api/admin/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Super User' && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const result = await pool.query(`
            SELECT 
                uid, 
                first_name as "firstName", 
                last_name as "lastName", 
                email as "email", 
                role, 
                school_id, 
                account_category 
            FROM users 
            ORDER BY created_at DESC
        `);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Users Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ==================================================================
//               ESF7 IMPLEMENTATION & MONITORING
// ==================================================================

// POST /api/esf7/extract-preview (Backend extraction to bypass CORS)
app.post('/api/esf7/extract-preview', async (req, res) => {
  const { driveLink } = req.body;
  if (!driveLink) return res.status(400).json({ error: "Missing driveLink" });

  try {
    // 1. Extract File ID
    let fileId = '';
    if (driveLink.includes('/d/')) {
        fileId = driveLink.split('/d/')[1].split('/')[0];
    } else if (driveLink.includes('id=')) {
        fileId = driveLink.split('id=')[1].split('&')[0];
    }
    if (!fileId) throw new Error("Could not extract File ID from link.");

    // 2. Authenticate with Google Drive API
    let credentialsObj;
    try {
        credentialsObj = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
        throw new Error("Server configuration error: GOOGLE_SERVICE_ACCOUNT_JSON in .env is invalid or missing.");
    }
    
    // We try to authenticate impersonating support.stride@deped.gov.ph (requires Domain-Wide Delegation)
    let auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: credentialsObj.client_email,
            private_key: credentialsObj.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        clientOptions: {
            subject: 'support.stride@deped.gov.ph'
        }
    });

    const drive = google.drive({ version: 'v3', auth });
    
    let arrayBuffer;
    try {
        // Download the file contents
        const response = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });
        arrayBuffer = response.data;
    } catch (apiError) {
        console.error("Google API Error:", apiError.message);
        if (apiError.message.includes("unauthorized_client")) {
            // Domain-wide delegation is not configured. Fallback to service account directly.
            auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: credentialsObj.client_email,
                    private_key: credentialsObj.private_key,
                },
                scopes: ['https://www.googleapis.com/auth/drive.readonly']
            });
            const driveFallback = google.drive({ version: 'v3', auth });
            try {
                const fbResponse = await driveFallback.files.get({
                    fileId: fileId,
                    alt: 'media'
                }, { responseType: 'arraybuffer' });
                arrayBuffer = fbResponse.data;
            } catch (fbError) {
                console.error("Fallback Google API Error:", fbError.message);
                throw new Error("Cannot access the file. Ensure you shared it specifically with support.stride@deped.gov.ph as a Viewer.");
            }
        } else if (apiError.message.includes("File not found")) {
             throw new Error("The file could not be found or access was denied. Ensure it is shared correctly.");
        } else {
             throw new Error("Google Drive refused the download. Ensure you shared it with the correct extraction email as a Viewer.");
        }
    }

    const data = new Uint8Array(arrayBuffer);

    // 3. Parse with SheetJS
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = 'DB_USER';
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
        throw new Error("Missing 'DB_USER' sheet in the workbook. Please ensure the file follows the ESF7 standard.");
    }

    // 4. Convert to JSON (Full sheet)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (jsonData.length < 1) throw new Error("The 'DB_USER' sheet is completely empty.");

    // Find where the actual data starts (looking for common headers like 'ID' or 'School')
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(jsonData.length, 25); i++) {
        const row = jsonData[i];
        if (row && row.some(cell => {
          const val = String(cell).toLowerCase();
          return val.includes('school') || val.includes('id') || val.includes('first');
        })) {
          headerRowIdx = i;
          break;
        }
    }

    const headers = jsonData[headerRowIdx];
    // Capture ALL rows starting from the detected header row
    const rows = jsonData.slice(headerRowIdx + 1).filter(row => row.some(cell => String(cell).trim() !== ""));

    const records = rows.map(row => {
        const record = {};
        const headerCounts = {};
        headers.forEach((h, i) => {
            if (h) {
                const headerRaw = String(h).trim();
                const headerLower = headerRaw.toLowerCase();
                
                // Skip QA-QE columns as requested
                if (['qa', 'qb', 'qc', 'qd', 'qe'].includes(headerLower)) return;
                
                // Handle duplicate headers by appending a suffix (matches DB: first is name, second is name_2, third is name_3...)
                let key = headerRaw;
                if (headerCounts[headerRaw]) {
                    headerCounts[headerRaw]++;
                    key = `${headerRaw}_${headerCounts[headerRaw]}`;
                } else {
                    headerCounts[headerRaw] = 1;
                }
                
                record[key] = row[i];
            }
        });
        return record;
    });

    res.json({
        success: true,
        data: {
            records,
            headers,
            totalRows: records.length,
            sample: rows.slice(0, 5)
        }
    });

  } catch (err) {
    console.error("Backend Extraction Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/esf7/stage
app.post('/api/esf7/stage', async (req, res) => {
  const { school_id, records } = req.body;
  if (!school_id || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: "Missing school_id or records array" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Clear existing records for this school to prevent duplicates (Draft, Pending, or Verified)
    await client.query('DELETE FROM ESF7_Database WHERE school_id = $1', [school_id]);

    // 1. Fetch valid columns once
    const columnRes = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'esf7_database'
    `);
    const validColumns = new Set(columnRes.rows.map(r => r.column_name.toLowerCase()));

    // 2. Prepare bulk insert
    // We need to identify all unique sanitized keys across the entire set to build the column list
    const allSanitizedKeys = new Set();
    const mappedRecords = records.map(record => {
        const sanitized = {};
        const counts = {};
        Object.keys(record).forEach(k => {
            let name = k.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            if (/^\d/.test(name)) name = 'col_' + name;
            if (!name) name = 'col';
            let finalKey = counts[name] ? `${name}_${++counts[name]}` : (counts[name] = 1, name);
            if (validColumns.has(finalKey)) {
                sanitized[finalKey] = record[k];
                allSanitizedKeys.add(finalKey);
            }
        });
        return sanitized;
    });

    const columnList = Array.from(allSanitizedKeys);
    if (columnList.length === 0) throw new Error("No valid columns found in the records matching the database schema.");

    // 3. Build the Multi-row INSERT
    const fullColumns = ['school_id', 'status', 'updated_at', ...columnList.map(k => `"${k}"`)];
    const valuePlaceholders = [];
    const flatValues = [];
    let pIdx = 1;

    // PostgreSQL parameter limit is ~65535. For 400 columns, we can do ~150 rows per batch.
    // Given ESF7 size, we'll process in one or two batches if needed.
    for (const row of mappedRecords) {
        const rowPlaceholders = [
          `$${pIdx++}`, // school_id
          `$${pIdx++}`, // status
          `$${pIdx++}`, // updated_at
          ...columnList.map(() => `$${pIdx++}`) // Dynamic columns
        ];
        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        
        flatValues.push(school_id, 'PENDING_SDO', new Date());
        columnList.forEach(col => flatValues.push(row[col] || null));
    }

    const sql = `INSERT INTO ESF7_Database (${fullColumns.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
    await client.query(sql, flatValues);

    await client.query('COMMIT');
    res.json({ success: true, message: `Successfully staged ${records.length} records in bulk.` });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("ESF7 Bulk Staging Error:", err.message);
    res.status(500).json({ error: err.message || "Bulk staging failed." });
  } finally {
    if (client) client.release();
  }
});

// GET /api/esf7/pending
app.get('/api/esf7/pending', async (req, res) => {
  const { region, division } = req.query;
  try {
    let query = `
      SELECT e.school_id, s.school_name, e.status, MAX(e.updated_at) as updated_at 
      FROM ESF7_Database e
      JOIN ph_schools s ON e.school_id = s.school_id
      WHERE (e.status = 'DRAFT' OR e.status = 'PENDING_SDO' OR e.status = 'REJECTED')
    `;
    const params = [];
    if (region && region !== 'All') {
      params.push(region);
      query += ` AND s.region = $${params.length}`;
    }
    if (division && division !== 'All Divisions') {
      params.push(division);
      query += ` AND s.division = $${params.length}`;
    }
    query += ` GROUP BY e.school_id, e.status ORDER BY updated_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Fetch Pending ESF7 Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/esf7/status/:school_id
app.get('/api/esf7/status/:school_id', async (req, res) => {
  const { school_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT status FROM ESF7_Database WHERE school_id = $1 LIMIT 1',
      [school_id]
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, status: 'NOT_STARTED' });
    }
    res.json({ success: true, status: result.rows[0].status });
  } catch (err) {
    console.error("Fetch ESF7 Status Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/esf7/records/:school_id
app.get('/api/esf7/records/:school_id', async (req, res) => {
  const { school_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM ESF7_Database WHERE school_id = $1',
      [school_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Fetch ESF7 Records Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/esf7/stats
app.get('/api/esf7/stats', async (req, res) => {
  const { region, division, district } = req.query;
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (region && region !== 'All') {
      params.push(region);
      whereClause += ` AND s.region = $${params.length}`;
    }
    if (division && division !== 'All Divisions') {
      params.push(division);
      whereClause += ` AND s.division = $${params.length}`;
    }
    if (district && district !== 'All') {
      params.push(district);
      whereClause += ` AND s.district = $${params.length}`;
    }

    const query = `
      SELECT 
        COUNT(DISTINCT s.school_id)::int as total_registered,
        COUNT(DISTINCT CASE WHEN e.status = 'PENDING_SDO' THEN s.school_id END)::int as pending_sdo,
        COUNT(DISTINCT CASE WHEN e.status = 'VERIFIED' THEN s.school_id END)::int as verified,
        COUNT(DISTINCT CASE WHEN e.status = 'REJECTED' THEN s.school_id END)::int as rejected,
        COUNT(DISTINCT s.school_id) - COUNT(DISTINCT e.school_id)::int as missing_esf7
      FROM ph_schools s
      LEFT JOIN ESF7_Database e ON s.school_id = e.school_id
      ${whereClause}
    `;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Fetch ESF7 Stats Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/esf7/all-schools
app.get('/api/esf7/all-schools', async (req, res) => {
  const { region, division } = req.query;
  try {
    let query = `
      SELECT 
        s.school_id, 
        s.school_name, 
        COALESCE(e.status, 'NOT_STARTED') as status, 
        COALESCE(MAX(e.updated_at), s.updated_at) as updated_at
      FROM ph_schools s
      LEFT JOIN ESF7_Database e ON s.school_id = e.school_id
      WHERE 1=1
    `;
    const params = [];
    if (region && region !== 'All') {
      params.push(region);
      query += ` AND s.region = $${params.length}`;
    }
    if (division && division !== 'All Divisions') {
      params.push(division);
      query += ` AND s.division = $${params.length}`;
    }

    query += ` GROUP BY s.school_id, s.school_name, e.status ORDER BY s.school_name ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Fetch All Schools ESF7 Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/esf7/return
app.post('/api/esf7/return', async (req, res) => {
  const { school_id } = req.body;
  try {
    // Attempt to find IERN first
    const sRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [school_id]);
    const iern = sRes.rows[0]?.iern;

    if (iern) {
      await pool.query("UPDATE ESF7_Database SET status = 'REJECTED' WHERE iern = $1 OR school_id = $2", [iern, school_id]);
      await pool.query("UPDATE school_profiles SET f7_resources = 0, updated_at = CURRENT_TIMESTAMP WHERE iern = $1 OR school_id = $2", [iern, school_id]);
    } else {
      await pool.query("UPDATE ESF7_Database SET status = 'REJECTED' WHERE school_id = $1", [school_id]);
      await pool.query("UPDATE school_profiles SET f7_resources = 0, updated_at = CURRENT_TIMESTAMP WHERE school_id = $1", [school_id]);
    }

    res.json({ success: true, message: "ESF7 submission returned for correction." });
  } catch (err) {
    console.error("Return ESF7 Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/esf7/approve
app.post('/api/esf7/approve', async (req, res) => {
  const { school_id } = req.body;
  try {
    // Attempt to find IERN first
    const sRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [school_id]);
    const iern = sRes.rows[0]?.iern;

    if (iern) {
      await pool.query("UPDATE ESF7_Database SET status = 'VERIFIED' WHERE iern = $1 OR school_id = $2", [iern, school_id]);
      await pool.query("UPDATE school_profiles SET f7_resources = 1, updated_at = CURRENT_TIMESTAMP WHERE iern = $1 OR school_id = $2", [iern, school_id]);
    } else {
      await pool.query("UPDATE ESF7_Database SET status = 'VERIFIED' WHERE school_id = $1", [school_id]);
      await pool.query("UPDATE school_profiles SET f7_resources = 1, updated_at = CURRENT_TIMESTAMP WHERE school_id = $1", [school_id]);
    }

    res.json({ success: true, message: "ESF7 submission verified and committed." });
  } catch (err) {
    console.error("Approve ESF7 Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// --- FINAL GLOBAL ERROR HANDLER ---
// Ensures all errors (including Multer limit errors) return JSON in production
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err.message || err);
  
  if (res.headersSent) return next(err);

  // Handle specific Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size too large. Limit is 50MB.' });
    }
    return res.status(400).json({ error: `Upload Error: ${err.message}` });
  }

  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    status: 'error'
  });
});

// --- GLOBAL CRASH HANDLERS ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception thrown:', err);
});

// Start the server if this file is run directly
const executedFile = process.argv[1] || '';
const currentFile = fileURLToPath(import.meta.url);
const isMain = path.resolve(executedFile).toLowerCase() === path.resolve(currentFile).toLowerCase();

if (isMain || process.env.FORCE_START === 'true' || process.env.START_SERVER === 'true') {
  // Keep-alive handle to prevent premature exit
  setInterval(() => {}, 60000); // 1 minute
  startServer();
}

export default app;
