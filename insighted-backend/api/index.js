import dotenv from 'dotenv';
import express from 'express';
console.log("📌 >>> RUNNING: [INSIGHTED-BACKEND]/api/index.js <<< 📌");

import pg from 'pg';
import cors from 'cors';
// import cron from 'node-cron'; // REMOVED for Vercel
import admin from 'firebase-admin'; // --- FIREBASE ADMIN ---

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import busboy from 'busboy';
import multer from 'multer';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);
import { createRequire } from "module"; // Added for JSON import
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. THIS MUST BE FIRST
require('dotenv').config();

// 2. Now you can check the variable
console.log("DEBUG: DATABASE_URL is:", process.env.DATABASE_URL ? "FOUND" : "NOT FOUND");

// 3. Then start your server/database logic

// Destructure Pool from pg
const { Pool } = pg;

// --- STATE ---
let isDbConnected = false;

const app = express();



// --- MIDDLEWARE ---
app.use(cors({
  origin: [
    'http://localhost:5173',           // Vite Local Default
    'http://localhost:5174',           // Vite Local Alternate
    'https://insight-ed-mobile-pwa.vercel.app', // Your Vercel Frontend
    'https://insight-ed-frontend.vercel.app',
    'https://stride.deped.gov.ph',
    'http://stride.deped.gov.ph'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// --- MULTER: Project Document Uploads ---
const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads/') });

// --- DATABASE CONNECTION ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- VERCEL CRON ENDPOINT (MOVED TO TOP) ---
// Support both /api/cron... (Local) and /cron... (Vercel)
app.get(['/api/cron/check-deadline', '/cron/check-deadline'], async (req, res) => {
  // 1. Security Check
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('⏰ Running Deadline Reminder (Vercel Cron)...');
  try {
    const settingRes = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'enrolment_deadline'");
    if (settingRes.rows.length === 0 || !settingRes.rows[0].setting_value) {
      return res.json({ message: 'No deadline set.' });
    }
    const deadlineVal = settingRes.rows[0].setting_value;
    const deadlineDate = new Date(deadlineVal);
    const now = new Date();
    const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    console.log(`📅 Deadline: ${deadlineVal}, Days Left: ${diffDays}`);

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
              : `Submission is due in ${diffDays} day${diffDays > 1 ? 's' : ''}! Please finalize your forms.`
          },
          tokens: tokens
        };

        try {
          const response = await admin.messaging().sendEachForMulticast(message);
          console.log(`🚀 Notification Response: ${response.successCount} sent, ${response.failureCount} failed.`);
          if (response.failureCount > 0) {
            console.log("Failed details:", JSON.stringify(response.responses));
          }
          return res.json({ success: true, sent: response.successCount, failed: response.failureCount });
        } catch (sendErr) {
          console.error("Firebase Send Error:", sendErr);
          throw sendErr;
        }
      } else {
        console.log("ℹ️ No tokens found in DB.");
        return res.json({ message: 'No device tokens found.' });
      }
    } else {
      console.log(`ℹ️ Skipping: ${diffDays} days remaining (Not within 0-3 range).`);
      return res.json({ message: `Not within reminder window (0-3 days). Days: ${diffDays}` });
    }
  } catch (error) {
    console.error('❌ Cron Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// --- POST: Save Device Token ---
app.post('/api/save-token', async (req, res) => {
  const { uid, token } = req.body;
  if (!uid || !token) return res.status(400).json({ error: "Missing uid or token" });

  try {
    await pool.query(`
            INSERT INTO user_device_tokens (uid, fcm_token, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (uid)
            DO UPDATE SET fcm_token = $2, updated_at = CURRENT_TIMESTAMP
        `, [uid, token]);
    res.json({ success: true });
  } catch (err) {
    console.error("Save Token Error:", err);
    res.status(500).json({ error: "Failed to save token" });
  }
});

// --- FIREBASE ADMIN INIT ---
if (!admin.apps.length) {
  try {
    let credential;
    // 1. Try Environment Variable (Vercel Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
      console.log("✅ Firebase Admin Initialized from ENV");
    }
    // 2. Try Local File (Local Dev)
    else {
      try {
        const serviceAccount = require("./service-account.json");
        credential = admin.credential.cert(serviceAccount);
        console.log("✅ Firebase Admin Initialized from Local File");
      } catch (fileErr) {
        console.warn("⚠️ No local service-account.json found.");
      }
    }

    if (credential) {
      admin.initializeApp({ credential });
    } else {
      console.warn("⚠️ Firebase Admin NOT initialized (Missing Credentials)");
    }
  } catch (e) {
    console.warn("⚠️ Firebase Admin Init Failed:", e.message);
  }
}

// Initialize OTP Table
const initOtpTable = async () => {
  if (!isDbConnected) {
    console.log("⚠️ Skipping OTP Table Init (Offline Mode)");
    return;
  }

  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS verification_codes (
                email VARCHAR(255) PRIMARY KEY,
                code VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '10 minutes')
            );
        `);
    console.log("✅ OTP Table Initialized");
  } catch (err) {
    console.error("❌ Failed to init OTP table:", err);
  }
};

// --- DATABASE CONNECTION ---
// Auto-connect and initialize
(async () => {
  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log('✅ Connected to Neon Database successfully!');
    await initOtpTable();

    try {
      // --- INIT NOTIFICATIONS TABLE ---
      try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                recipient_uid TEXT NOT NULL,
                sender_uid TEXT,
                sender_name TEXT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'alert',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Notifications Table Initialized');
      } catch (tableErr) {
        console.error('❌ Failed to init notifications table:', tableErr.message);
      }

      // --- MIGRATION: ADD EMAIL TO SCHOOL_PROFILES ---
      try {
        await client.query(`
            ALTER TABLE school_profiles 
            ADD COLUMN IF NOT EXISTS email TEXT;
        `);
        console.log('✅ Checked/Added email column to school_profiles');
      } catch (migErr) {
        console.error('❌ Failed to migrate school_profiles:', migErr.message);
      }

      // --- MIGRATION: USER DEVICE TOKENS ---
      try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_device_tokens (
                uid TEXT PRIMARY KEY,
                fcm_token TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Checked/Created user_device_tokens table');
      } catch (tokenErr) {
        console.error('❌ Failed to init user_device_tokens:', tokenErr.message);
      }

    } catch (err) {

      // --- MIGRATION: ADD CURRICULAR OFFERING ---
      try {
        await client.query(`
            ALTER TABLE school_profiles 
            ADD COLUMN IF NOT EXISTS curricular_offering TEXT;
        `);
        console.log('✅ Checked/Added curricular_offering column to school_profiles');
      } catch (migErr) {
        console.error('❌ Failed to migrate curricular_offering:', migErr.message);
      }

      // --- MIGRATION: SCHOOL COMPLETION TABLE ---
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ph_school_completion (
            iern VARCHAR(255) PRIMARY KEY,
            school_id VARCHAR(255),
            unit1_completion BOOLEAN DEFAULT false,
            unit2_completion BOOLEAN DEFAULT false,
            unit3_completion BOOLEAN DEFAULT false,
            unit4_completion BOOLEAN DEFAULT false,
            unit5_completion BOOLEAN DEFAULT false,
            unit6_completion BOOLEAN DEFAULT false,
            unit7_completion BOOLEAN DEFAULT false,
            unit8_completion BOOLEAN DEFAULT false,
            total_completion NUMERIC(5,2) DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        // Migration to add school_id if missing
        await client.query(`ALTER TABLE ph_school_completion ADD COLUMN IF NOT EXISTS school_id VARCHAR(255)`);
        console.log('✅ Checked/Created ph_school_completion table with school_id');
      } catch (migErr) {
        console.error('❌ Failed to init completion table:', migErr.message);
      }

      // --- MIGRATION: EXTEND USERS TABLE (For Engineer/Generic Sync) ---
      try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                uid TEXT PRIMARY KEY,
                email TEXT,
                role TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                first_name TEXT,
                last_name TEXT,
                region TEXT,
                division TEXT,
                province TEXT,
                city TEXT,
                barangay TEXT,
                office TEXT,
                position TEXT,
                disabled BOOLEAN DEFAULT FALSE
            );
        `);
        // If table exists, ensure columns exist
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS first_name TEXT,
            ADD COLUMN IF NOT EXISTS last_name TEXT,
            ADD COLUMN IF NOT EXISTS region TEXT,
            ADD COLUMN IF NOT EXISTS division TEXT,
            ADD COLUMN IF NOT EXISTS province TEXT,
            ADD COLUMN IF NOT EXISTS city TEXT,
            ADD COLUMN IF NOT EXISTS barangay TEXT,
            ADD COLUMN IF NOT EXISTS office TEXT,
            ADD COLUMN IF NOT EXISTS position TEXT,
            ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ Checked/Extended users table schema');
      } catch (migErr) {
        console.error('❌ Failed to migrate users table:', migErr.message);
      }
      // --- MIGRATION: ADD SCHOOL RESOURCES COLUMNS ---
      try {
        await client.query(`
        ALTER TABLE school_profiles 
        ADD COLUMN IF NOT EXISTS res_toilets_common INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sha_category TEXT,
        ADD COLUMN IF NOT EXISTS res_faucets INTEGER DEFAULT 0;
      `);
        console.log('✅ Checked/Added new School Resources columns');
      } catch (migErr) {
        console.error('❌ Failed to migrate resources columns:', migErr.message);
      }

      // --- MIGRATION: COMPREHENSIVE FIX FOR MISSING COLUMNS ---
      try {
        await client.query(`
        ALTER TABLE school_profiles 
        -- Site & Utils
        ADD COLUMN IF NOT EXISTS res_ownership_type TEXT,
        ADD COLUMN IF NOT EXISTS res_electricity_source TEXT,
        ADD COLUMN IF NOT EXISTS res_buildable_space TEXT,
        ADD COLUMN IF NOT EXISTS res_water_source TEXT,
        ADD COLUMN IF NOT EXISTS res_internet_type TEXT,
        
        -- Toilets & Labs
        ADD COLUMN IF NOT EXISTS res_toilets_pwd INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_sci_labs INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_com_labs INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_tvl_workshops INTEGER DEFAULT 0,

        -- Seats Analysis
        ADD COLUMN IF NOT EXISTS seats_kinder INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_3 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_4 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_6 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_7 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_8 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_9 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_10 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS seats_grade_12 INTEGER DEFAULT 0,

        -- Organized Classes (Counters)
        ADD COLUMN IF NOT EXISTS classes_kinder INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_3 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_4 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_6 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_7 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_8 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_9 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_10 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS classes_grade_12 INTEGER DEFAULT 0,

        -- Class Size Analysis
        ADD COLUMN IF NOT EXISTS cnt_less_g1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g3 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g3 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g3 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g4 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g4 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g4 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g6 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g6 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g6 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g7 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g7 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g7 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g8 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g8 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g8 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g9 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g9 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g9 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g10 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g10 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g10 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_less_g12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_within_g12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cnt_above_g12 INTEGER DEFAULT 0,

        -- Equipment Inventory
        ADD COLUMN IF NOT EXISTS res_ecart_func INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_ecart_nonfunc INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_laptop_func INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_laptop_nonfunc INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_tv_func INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_tv_nonfunc INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_printer_func INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_printer_nonfunc INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_desk_func INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_desk_nonfunc INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_armchair_func INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_armchair_nonfunc INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_toilet_func INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_toilet_nonfunc INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_handwash_func INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS res_handwash_nonfunc INTEGER DEFAULT 0;
      `);
        console.log('✅ Checked/Added ALL missing School Resources & Class Analysis columns');
      } catch (migErr) {
        console.error('❌ Failed to migrate extra columns:', migErr.message);
      }

      // --- MIGRATION: TEACHER SPECIALIZATION COLUMNS ---
      try {
        await client.query(`
        ALTER TABLE school_profiles 
        ADD COLUMN IF NOT EXISTS spec_english_major INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_english_teaching INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_filipino_major INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_filipino_teaching INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_math_major INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_math_teaching INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_science_major INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_science_teaching INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_ap_major INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_ap_teaching INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_mapeh_major INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_mapeh_teaching INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_esp_major INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_esp_teaching INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_tle_major INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_tle_teaching INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_guidance INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_librarian INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_ict_coord INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS spec_drrm_coord INTEGER DEFAULT 0;
      `);
        console.log('✅ Checked/Added Teacher Specialization columns');
      } catch (migErr) {
        console.error('❌ Failed to migrate specialization columns:', migErr.message);
      }

      // --- MIGRATION: ADD IPC COLUMN TO ENGINEER FORM ---
      try {
        // First ensure the table exists (it should, but safety first)
        await client.query(`
            CREATE TABLE IF NOT EXISTS engineer_form (
                project_id SERIAL PRIMARY KEY,
                school_name TEXT,
                project_name TEXT,
                school_id TEXT,
                region TEXT,
                division TEXT,
                status_of_construction_phase TEXT,
                accomplishment_percentage INTEGER,
                status_as_of TIMESTAMP,
                target_completion_date TIMESTAMP,
                actual_completion_date TIMESTAMP,
                notice_to_proceed TIMESTAMP,
                contractor_name TEXT,
                approved_budget_for_contract NUMERIC,
                batch_of_funds TEXT,
                other_remarks TEXT,
                engineer_id TEXT,
                validation_status TEXT,
                validation_remarks TEXT,
                validated_by TEXT
            );
        `);

        await client.query(`
            ALTER TABLE engineer_form 
            ADD COLUMN IF NOT EXISTS ipc TEXT UNIQUE,
            ADD COLUMN IF NOT EXISTS procurement_status TEXT;
        `);
        console.log('✅ Checked/Added IPC column to engineer_form');
      } catch (migErr) {
        console.error('❌ Failed to migrate IPC column:', migErr.message);
      }

      // --- MIGRATION: ENGINEER DOCUMENTS TABLE ---
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS engineer_documents (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES engineer_form(project_id),
            ipc TEXT,
            pow_pdf TEXT,
            pow_filename TEXT,
            dupa_pdf TEXT,
            dupa_filename TEXT,
            contract_pdf TEXT,
            contract_filename TEXT,
            moa_pdf TEXT,
            rta_pdf TEXT,
            uploader_id TEXT
          );
        `);
        await checkAndAddColumn('engineer_documents', 'pow_filename', 'TEXT');
        await checkAndAddColumn('engineer_documents', 'dupa_filename', 'TEXT');
        await checkAndAddColumn('engineer_documents', 'contract_filename', 'TEXT');
        // Add unique constraint required for UPSERT (ON CONFLICT project_id)
        await client.query(`
          ALTER TABLE engineer_documents
          ADD CONSTRAINT IF NOT EXISTS unique_eng_docs_project_id UNIQUE (project_id);
        `).catch(() => {}); // Ignore if already exists
        console.log('✅ Checked/Created engineer_documents table');
      } catch (migErr) {
        console.error('❌ Failed to create engineer_documents table:', migErr.message);
      }

      // --- MIGRATION: ARAL & TEACHING EXPERIENCE COLUMNS ---
      try {
        await client.query(`
        ALTER TABLE school_profiles 
        -- ARAL (Grades 1-6)
        ADD COLUMN IF NOT EXISTS aral_math_g1 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_read_g1 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_sci_g1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS aral_math_g2 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_read_g2 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_sci_g2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS aral_math_g3 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_read_g3 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_sci_g3 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS aral_math_g4 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_read_g4 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_sci_g4 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS aral_math_g5 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_read_g5 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_sci_g5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS aral_math_g6 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_read_g6 INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS aral_sci_g6 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS aral_total INTEGER DEFAULT 0,

        -- Teaching Experience
        ADD COLUMN IF NOT EXISTS teach_exp_0_1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_2_5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_6_10 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_11_15 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_16_20 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_21_25 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_26_30 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_31_35 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_36_40 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS teach_exp_40_45 INTEGER DEFAULT 0;
      `);
        console.log('✅ Checked/Added ARAL and Teaching Experience columns');
      } catch (migErr) {
        console.error('❌ Failed to migrate ARAL/Exp columns:', migErr.message);
      }

      // --- MIGRATION: COMPREHENSIVE ALIGNMENT FOR ENGINEER FORM SNAPSHOTS ---
      try {
        await client.query(`
          ALTER TABLE engineer_form
          -- 1. Identity & Location
          ADD COLUMN IF NOT EXISTS engineer_name TEXT,
          ADD COLUMN IF NOT EXISTS province TEXT,
          ADD COLUMN IF NOT EXISTS city TEXT,
          ADD COLUMN IF NOT EXISTS municipality TEXT,
          
          -- 2. Project Classification
          ADD COLUMN IF NOT EXISTS project_category TEXT,
          ADD COLUMN IF NOT EXISTS funding_year TEXT,
          ADD COLUMN IF NOT EXISTS scope_of_work TEXT,
          ADD COLUMN IF NOT EXISTS number_of_classrooms INTEGER,
          ADD COLUMN IF NOT EXISTS number_of_storeys INTEGER,
          ADD COLUMN IF NOT EXISTS number_of_sites INTEGER,
          ADD COLUMN IF NOT EXISTS funds_utilized NUMERIC(20, 2),
          ADD COLUMN IF NOT EXISTS construction_start_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS latitude TEXT,
          ADD COLUMN IF NOT EXISTS longitude TEXT,
          ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(20, 2),
          ADD COLUMN IF NOT EXISTS update_type TEXT,

          -- 3. Document Status Flags
          ADD COLUMN IF NOT EXISTS has_pow BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS has_dupa BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS has_contract BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS has_moa BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS has_rta BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS has_variation_order BOOLEAN DEFAULT FALSE,

          -- 4. Realignment & Savings
          ADD COLUMN IF NOT EXISTS is_realigned BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS savings NUMERIC(20, 2),
          ADD COLUMN IF NOT EXISTS is_donated BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS program_type TEXT,
          ADD COLUMN IF NOT EXISTS funding_year_justification TEXT,

          -- 5. Legal & External Refs
          ADD COLUMN IF NOT EXISTS sangguniang_resolution_id TEXT,
          ADD COLUMN IF NOT EXISTS mother_moa_id TEXT,
          ADD COLUMN IF NOT EXISTS supplamental_moa_id TEXT;
        `);
        await checkAndAddColumn('engineer_form', 'triangulated_percentage', 'NUMERIC DEFAULT 0');
        await checkAndAddColumn('engineer_form', 'pow_filename', 'TEXT');
        await checkAndAddColumn('engineer_form', 'dupa_filename', 'TEXT');
        await checkAndAddColumn('engineer_form', 'contract_filename', 'TEXT');
        console.log('✅ Checked/Added ALL missing columns to engineer_form for snapshots');

        // 2. Drop UNIQUE constraint on IPC (if it exists) to allow multiple rows per project
        await client.query(`
          ALTER TABLE engineer_form 
          DROP CONSTRAINT IF EXISTS engineer_form_ipc_key; 
        `);
        console.log('✅ Dropped UNIQUE constraint on IPC (if existed)');

      } catch (migErr) {
        console.error('❌ Failed to migrate history schema:', migErr.message);
      }


      // --- MIGRATION: DETAILED ENROLLMENT COLUMNS ---
      try {
        await client.query(`
        ALTER TABLE school_profiles 
        -- Elementary
        ADD COLUMN IF NOT EXISTS grade_kinder INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_1 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_2 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_3 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_4 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_5 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_6 INTEGER DEFAULT 0,

        -- JHS
        ADD COLUMN IF NOT EXISTS grade_7 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_8 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_9 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_10 INTEGER DEFAULT 0,

        -- SHS Grade 11
        ADD COLUMN IF NOT EXISTS abm_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS stem_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS humss_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS gas_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tvl_ict_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tvl_he_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tvl_ia_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tvl_afa_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS arts_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sports_11 INTEGER DEFAULT 0,

        -- SHS Grade 12
        ADD COLUMN IF NOT EXISTS abm_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS stem_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS humss_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS gas_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tvl_ict_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tvl_he_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tvl_ia_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tvl_afa_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS arts_12 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sports_12 INTEGER DEFAULT 0,

        -- Totals
        ADD COLUMN IF NOT EXISTS es_enrollment INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS jhs_enrollment INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS shs_enrollment INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_enrollment INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_11 INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grade_12 INTEGER DEFAULT 0;
      `);
        console.log('✅ Checked/Added Detailed Enrollment columns');
      } catch (migErr) {
        console.error('❌ Failed to migrate enrollment columns:', migErr.message);
      }

      // --- MIGRATION: ENSURE BUILDABLE SPACE IS TEXT ---
      try {
        await client.query(`
        ALTER TABLE school_profiles 
        ALTER COLUMN res_buildable_space TYPE TEXT;
      `);
        console.log('✅ Ensured res_buildable_space is TEXT');
      } catch (migErr) {
        console.log('ℹ️  res_buildable_space type check skipped/validated');
      }

      // --- MIGRATION: SYSTEM SETTINGS TABLE ---
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS system_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT
          );
        `);
        console.log('✅ Checked/Created system_settings table');
      } catch (tableErr) {
        console.error('❌ Failed to init system_settings table:', tableErr.message);
      }

      // --- MIGRATION: CLEAN ENGINEER FORM AND CREATE VO/REALIGNMENT TABLES ---
      try {
        await client.query(`
          ALTER TABLE engineer_form
          DROP COLUMN IF EXISTS variation_order_pdf,
          DROP COLUMN IF EXISTS vo_number,
          DROP COLUMN IF EXISTS vo_requested_date,
          DROP COLUMN IF EXISTS vo_requested_by,
          DROP COLUMN IF EXISTS variation_order_amount,
          DROP COLUMN IF EXISTS variation_order_remarks,
          DROP COLUMN IF EXISTS variation_order_no,
          DROP COLUMN IF EXISTS variation_order_date;
        `);
        console.log('✅ Cleaned engineer_form (Dropped VO & Funds Utilized legacy columns)');

        await client.query(`
          CREATE TABLE IF NOT EXISTS variation_orders (
              id SERIAL PRIMARY KEY,
              project_id INTEGER NOT NULL,
              ipc TEXT,
              variation_name TEXT,
              variation_type TEXT, -- Change Order, Extra Work Order, Combined
              original_amount NUMERIC(20, 2),
              additive NUMERIC(20, 2),
              deductive NUMERIC(20, 2),
              reused_amount NUMERIC(20, 2),
              modified_amount NUMERIC(20, 2),
              status TEXT DEFAULT 'Approved',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_by TEXT
          );
        `);

        // Migration: Add/Fix columns
        await client.query(`
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variation_orders' AND column_name='variation_name') THEN
              ALTER TABLE variation_orders ADD COLUMN variation_name TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variation_orders' AND column_name='variation_type') THEN
              ALTER TABLE variation_orders ADD COLUMN variation_type TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variation_orders' AND column_name='original_amount') THEN
              ALTER TABLE variation_orders ADD COLUMN original_amount NUMERIC(20, 2);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variation_orders' AND column_name='reused_amount') THEN
              ALTER TABLE variation_orders ADD COLUMN reused_amount NUMERIC(20, 2);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variation_orders' AND column_name='additive') THEN
              ALTER TABLE variation_orders ADD COLUMN additive NUMERIC(20, 2) DEFAULT 0;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variation_orders' AND column_name='deductive') THEN
              ALTER TABLE variation_orders ADD COLUMN deductive NUMERIC(20, 2) DEFAULT 0;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variation_orders' AND column_name='modified_amount') THEN
              ALTER TABLE variation_orders ADD COLUMN modified_amount NUMERIC(20, 2);
            END IF;
          END $$;
        `);
        console.log('✅ Checked/Created variation_orders table');

        await client.query(`
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
        `);
        console.log('✅ Checked/Created realignments table');
        // Migration: Clean up 'Not Yet Started' defaults to NULL to allow placeholder
        await client.query(`
          UPDATE engineer_form 
          SET status = NULL 
          WHERE status = 'Not Yet Started' 
          AND (accomplishment_percentage = 0 OR accomplishment_percentage IS NULL);
        `);
        console.log('✅ Cleaned up Not Yet Started defaults to NULL');
      } catch (migErr) {
        console.error('❌ Failed to migrate VO and Realignment tables:', migErr.message);
      }

      // --- MIGRATION: UNIT 1 PERSISTENCE COLUMNS ---
      try {
        await client.query(`
          ALTER TABLE ph_schools 
          ADD COLUMN IF NOT EXISTS local_file_path TEXT,
          ADD COLUMN IF NOT EXISTS local_file_name TEXT,
          ADD COLUMN IF NOT EXISTS local_file_size BIGINT,
          ADD COLUMN IF NOT EXISTS head_position_title TEXT,
          ADD COLUMN IF NOT EXISTS head_sex TEXT,
          ADD COLUMN IF NOT EXISTS head_date_hired TIMESTAMP;
        `);
        console.log('✅ Checked/Added Unit 1 Persistence columns to ph_schools');
      } catch (migErr) {
        console.error('❌ Failed to migrate Unit 1 columns:', migErr.message);
      }

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ FATAL: Could not connect to Neon DB:', err.message);
    console.warn('⚠️  RUNNING IN OFFLINE MOCK MODE. Database features will be simulated.');
    isDbConnected = false;
  }
})();

// ==================================================================
//                        HELPER FUNCTIONS
// ==================================================================

const valueOrNull = (value) => (value === '' || value === undefined ? null : value);

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

/** Get User Full Name Helper */
const getUserFullName = async (uid) => {
  console.log("🔍 getUserFullName called with API uid:", uid);
  try {
    const res = await pool.query('SELECT first_name, last_name, email FROM users WHERE uid = $1', [uid]);
    console.log("🔍 DB Result for user lookup:", res.rows);

    if (res.rows.length > 0) {
      const { first_name, last_name } = res.rows[0];
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();
      console.log("✅ Resolved Full Name:", fullName);
      return fullName || null;
    } else {
      console.warn("⚠️ No user found in DB for UID:", uid);
    }
  } catch (err) {
    console.warn("⚠️ Error fetching user name:", err.message);
  }
  return null;
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
  const { userUid, userName, role, actionType, targetEntity, details } = req.body;
  try {
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
    console.error("Get Setting Error:", err);
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
      await logActivity(userUid, 'Admin', 'Admin', 'UPDATE SETTING', key, `Updated ${key} to ${value}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Save Setting Error:", err);
    res.status(500).json({ error: "Failed to save setting" });
  }
});

// --- 1d. ADMIN USER MANAGEMENT ---

// GET All Users
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT uid, email, role, first_name, last_name, region, division, created_at, disabled 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Get Users Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST Toggle User Status (Enable/Disable)
app.post('/api/admin/users/:uid/status', async (req, res) => {
  const { uid } = req.params;
  const { disabled } = req.body;

  if (typeof disabled !== 'boolean') {
    return res.status(400).json({ error: "Disabled status must be a boolean" });
  }

  try {
    // 1. Update Firebase Auth
    await admin.auth().updateUser(uid, { disabled });

    // 2. Update DB
    await pool.query('UPDATE users SET disabled = $1 WHERE uid = $2', [disabled, uid]);

    // 3. Log
    // (Assuming userUid comes from auth middleware/header, implemented loosely here for simplicity, 
    // ideally should extract requester from token)
    // For now, we'll log as 'System/Admin' if not provided
    console.log(`✅ User ${uid} status updated to: ${disabled ? 'Disabled' : 'Active'}`);

    res.json({ success: true });
  } catch (err) {
    console.error("Update User Status Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE User
app.delete('/api/admin/users/:uid', async (req, res) => {
  const { uid } = req.params;

  try {
    // 1. Delete from Firebase Auth
    await admin.auth().deleteUser(uid);

    // 2. Delete from DB (Users table)
    // Note: Dependent records (logs, etc.) might need handling depending on FK constraints.
    // Assuming simple deletion for now.
    await pool.query('DELETE FROM users WHERE uid = $1', [uid]);

    console.log(`✅ User ${uid} deleted permanently.`);
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


// --- POST: Send OTP (Real Email via Nodemailer) ---
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  // Generate 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // --- MOCK MODE HANDLING ---
  if (!isDbConnected) {
    console.log(`⚠️  [OFFLINE] Mock OTP for ${email}: ${otp}`);
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

    console.log(`💾 OTP saved to DB for ${email}`);

    // 2. SEND EMAIL
    // Dynamic import to avoid crash if not installed yet
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'cleamoniquesacriz@gmail.com',
        pass: process.env.EMAIL_PASS || 'bdfd nzoa ybby cjqc'
      }
    });

    const mailOptions = {
      from: '"InsightEd System" <cleamoniquesacriz@gmail.com>',
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
    console.log(`✅ Email sent to ${email}`);
    res.json({ success: true, message: "Verification code sent to your email!" });

  } catch (error) {
    console.error("❌ OTP Error:", error);

    // Fallback to console for dev if email fails
    console.log(`⚠️ FALLBACK: OTP for ${email} is ${otp}`);

    // 4. FALLBACK: Return success so the user can verify via terminal code
    // (Even if email failed, we generated a valid OTP and logged it)
    console.log("⚠️ Returning SUCCESS despite email error (Fallback Mode)");

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
      console.log(`⚠️  [OFFLINE] Verifying Mock OTP: ${code} for ${email} -> SUCCESS`);
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
      await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);
      return res.json({ success: true, message: "Email Verified!" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid or Expired Code." });
    }
  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({ success: false, message: "Server Verification Error" });
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

// --- 3b. GET: Fetch All Schools (For Admin Dashboard) ---
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
        (CASE WHEN sp.res_water_source IS NOT NULL OR sp.res_toilets_male IS NOT NULL THEN true ELSE false END) as resources_status,
        (CASE WHEN sp.stat_ip IS NOT NULL OR sp.stat_displaced IS NOT NULL THEN true ELSE false END) as learner_stats_status,
        (CASE WHEN sp.build_classrooms_total IS NOT NULL THEN true ELSE false END) as facilities_status
      FROM school_profiles sp
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

    res.json({ score, checklist, totalModules: checklist.length, completedCount });
  } catch (err) {
    console.error("Fetch Health Score Error:", err);
    res.status(500).json({ error: "Failed to calculate health score" });
  }
});

// --- 3c. POST: Check if School is Already Registered ---
app.post('/api/check-existing-school', async (req, res) => {
  const { schoolId } = req.body;
  try {
    const result = await pool.query("SELECT school_id FROM school_profiles WHERE school_id = $1", [schoolId]);
    if (result.rows.length > 0) {
      return res.json({ exists: true, message: "This school is already registered." });
    }
    return res.json({ exists: false });
  } catch (error) {
    console.error("Check Existing Error:", error);
    return res.status(500).json({ error: "Database error checking school." });
  }
});

// --- 3d. POST: Register School Head (Finalize Registration) ---
// --- 3d. POST: Register School (One-Shot with Geofencing verification) ---
// api/index.js

// --- 3d. POST: Register School (One-Shot with Geofencing verification) ---
app.post('/api/register-school', async (req, res) => {
  const { uid, email, schoolData } = req.body;

  if (!uid || !schoolData || !schoolData.school_id) {
    return res.status(400).json({ error: "Missing required registration data." });
  }

  // DEBUG LOG
  console.log("✅ REGISTRATION DATA:", {
    uid,
    school: schoolData.school_name
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
      await client.query(
        "INSERT INTO users (uid, email, role, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (uid) DO NOTHING",
        [uid, email, 'School Head']
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
      schoolData.leg_district || schoolData.legislative,
      schoolData.barangay,
      schoolData.mother_school_id || 'NA',
      schoolData.latitude,
      schoolData.longitude,
      uid,
      newIern,
      email,
      schoolData.curricular_offering
    ];

    await client.query(insertQuery, values);

    // 5. INITIALIZE COMPLETION TRACKING (Unit 1 Complete on Reg)
    await client.query(`
        INSERT INTO ph_school_completion (iern, school_id, unit1_completion, total_completion)
        VALUES ($1, $2, true, 12.5)
        ON CONFLICT (iern) DO UPDATE SET unit1_completion = true, school_id = EXCLUDED.school_id, updated_at = CURRENT_TIMESTAMP
    `, [newIern, schoolData.school_id]);

    // 6. SYNC TO PH_SCHOOLS
    await client.query(`
        INSERT INTO ph_schools (school_id, iern, school_name, region, division, district, curricular_offering)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (school_id) DO UPDATE SET iern = EXCLUDED.iern, updated_at = CURRENT_TIMESTAMP
    `, [schoolData.school_id, newIern, schoolData.school_name, schoolData.region, schoolData.division, schoolData.district, schoolData.curricular_offering]);

    await client.query('COMMIT');

    console.log(`[SUCCESS] Registered School: ${schoolData.school_name} (${newIern})`);
    res.json({ success: true, iern: newIern, message: "School Registered Successfully" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Register School Error:", err);
    res.status(500).json({ error: "Registration failed: " + err.message });
  } finally {
    client.release();
  }
});

// --- 3e. POST: Register Generic User (Engineer, RO, SDO) ---
app.post('/api/register-user', async (req, res) => {
  const { uid, email, role, firstName, lastName, region, division, province, city, barangay, office, position } = req.body;

  if (!uid || !email || !role) {
    return res.status(400).json({ error: "Missing required fields (uid, email, role)" });
  }

  try {
    const query = `
            INSERT INTO users (
                uid, email, role, created_at,
                first_name, last_name,
                region, division, province, city, barangay,
                office, position
            ) VALUES (
                $1, $2, $3, CURRENT_TIMESTAMP,
                $4, $5, $6, $7, $8, $9, $10, $11, $12
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
                position = EXCLUDED.position;
        `;

    const values = [
      uid, email, role,
      valueOrNull(firstName), valueOrNull(lastName),
      valueOrNull(region), valueOrNull(division),
      valueOrNull(province), valueOrNull(city), valueOrNull(barangay),
      valueOrNull(office), valueOrNull(position)
    ];

    await pool.query(query, values);
    console.log(`✅ [NEON] Synced generic user: ${email} (${role})`);

    // Log Activity
    await logActivity(uid, `${firstName} ${lastName}`, role, 'REGISTER', 'User Profile', `Registered as ${role}`);

    res.json({ success: true, message: "User synced to NeonSQL" });
  } catch (err) {
    console.error("❌ Register User Error:", err);
    res.status(500).json({ error: "Failed to sync user to NeonSQL" });
  }
});

// ==================================================================
//                  SCHOOL HEAD FORMS ROUTES
// ==================================================================

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
        legDistrict: 'leg_district',
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
      data.curricularOffering, // $14
      JSON.stringify(newLogEntry), // $15
      finalIern // $16
    ];

    await client.query(query, values);
    await client.query('COMMIT');

    // --- CENTRALIZED AUDIT LOGGING ---
    // Log to activity_logs table for Admin Dashboard visibility
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

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Save Error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    client.release();
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
        head_sex = $8,
        head_region = $9,
        head_division = $10,
        updated_at = CURRENT_TIMESTAMP,
        history_logs = history_logs || $11::jsonb
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
      data.sex || null,
      data.region || null,
      data.division || null,
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
  } catch (err) {
    console.error("Save Head Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 6. GET: Get School Head Info ---
app.get('/api/school-head/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const query = `
      SELECT 
        head_last_name as last_name, 
        head_first_name as first_name, 
        head_middle_name as middle_name, 
        head_item_number as item_number, 
        head_position_title as position_title, 
        head_date_hired as date_hired,
        head_sex as sex, 
        head_region as region, 
        head_division as division,
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





// --- 5. POST: Save Enrolment ---
// --- 7. POST: Save Enrolment ---
app.post('/api/save-enrolment', async (req, res) => {
  const data = req.body;
  console.log('📥 RECEIVED ENROLMENT DATA:', JSON.stringify(data, null, 2));
  const newLogEntry = { timestamp: new Date().toISOString(), user: data.submittedBy, action: 'Enrolment Update', offering: data.curricularOffering };

  try {
    const query = ` UPDATE school_profiles SET curricular_offering = $2, es_enrollment = $3, jhs_enrollment = $4, shs_enrollment = $5, total_enrollment = $6, grade_kinder = $7, grade_1 = $8, grade_2 = $9, grade_3 = $10, grade_4 = $11, grade_5 = $12, grade_6 = $13, grade_7 = $14, grade_8 = $15, grade_9 = $16, grade_10 = $17, grade_11 = $18, grade_12 = $19, abm_11=$20, abm_12=$21, stem_11=$22, stem_12=$23, humss_11=$24, humss_12=$25, gas_11=$26, gas_12=$27, tvl_ict_11=$28, tvl_ict_12=$29, tvl_he_11=$30, tvl_he_12=$31, tvl_ia_11=$32, tvl_ia_12=$33, tvl_afa_11=$34, tvl_afa_12=$35, arts_11=$36, arts_12=$37, sports_11=$38, sports_12=$39,

    -- ARAL Fields
    aral_math_g1=$41, aral_read_g1=$42, aral_sci_g1=$43,
    aral_math_g2=$44, aral_read_g2=$45, aral_sci_g2=$46,
    aral_math_g3=$47, aral_read_g3=$48, aral_sci_g3=$49,
    aral_math_g4=$50, aral_read_g4=$51, aral_sci_g4=$52,
    aral_math_g5=$53, aral_read_g5=$54, aral_sci_g5=$55,
    aral_math_g6=$56, aral_read_g6=$57, aral_sci_g6=$58,
    aral_total=$59,
    submitted_at = CURRENT_TIMESTAMP,
    history_logs = history_logs || $40::jsonb
  WHERE school_id = $1;
`;
    const values = [
      data.schoolId, data.curricularOffering,
      data.esTotal, data.jhsTotal, data.shsTotal, data.grandTotal,

      // Elementary (Corrected to use snake_case)
      data.grade_kinder, data.grade_1, data.grade_2, data.grade_3,
      data.grade_4, data.grade_5, data.grade_6,

      // JHS (Corrected)
      data.grade_7, data.grade_8, data.grade_9, data.grade_10,

      // SHS (Corrected)
      data.grade_11, data.grade_12,
      data.abm_11, data.abm_12, data.stem_11, data.stem_12,
      data.humss_11, data.humss_12, data.gas_11, data.gas_12,
      data.tvl_ict_11, data.tvl_ict_12, data.tvl_he_11, data.tvl_he_12,
      data.tvl_ia_11, data.tvl_ia_12, data.tvl_afa_11, data.tvl_afa_12,
      data.arts_11, data.arts_12, data.sports_11, data.sports_12,

      JSON.stringify(newLogEntry),
      // ARAL Values
      data.aral_math_g1 || 0, data.aral_read_g1 || 0, data.aral_sci_g1 || 0,
      data.aral_math_g2 || 0, data.aral_read_g2 || 0, data.aral_sci_g2 || 0,
      data.aral_math_g3 || 0, data.aral_read_g3 || 0, data.aral_sci_g3 || 0,
      data.aral_math_g4 || 0, data.aral_read_g4 || 0, data.aral_sci_g4 || 0,
      data.aral_math_g5 || 0, data.aral_read_g5 || 0, data.aral_sci_g5 || 0,
      data.aral_math_g6 || 0, data.aral_read_g6 || 0, data.aral_sci_g6 || 0,
      data.aral_total || 0
    ];
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "School Profile not found." });
    }
    await logActivity(
      data.submittedBy,
      'School Head',
      'School Head',
      'UPDATE',
      `Enrolment Data: ${data.schoolId}`,
      `Updated enrolment (Total: ${data.grandTotal})`
    );
    res.status(200).json({ message: "Enrolment updated successfully!" });
  } catch (err) { console.error("Enrolment Save Error:", err); res.status(500).json({ message: "Database error", error: err.message }); }
});

// --- 6. GET: Fetch Enrolment ---
app.get('/api/enrolment/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE submitted_by = $1', [uid]);
    if (result.rows.length > 0) {
      res.json({ exists: true, data: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error("Fetch Enrolment Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ==================================================================
//                    ENGINEER FORMS ROUTES
// ==================================================================

// --- 7. POST: Save Enrolment (Fixed with snake_case and null safety) ---
app.post('/api/save-enrolment', async (req, res) => {
  const data = req.body;
  console.log('📥 RECEIVED ENROLMENT DATA:', JSON.stringify(data, null, 2));

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
      data.aral_total || 0
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      console.error("❌ School Profile not found for ID:", data.schoolId);
      return res.status(404).json({ message: "School Profile not found." });
    }

    // DEBUG: Immediate Verification
    const verify = await pool.query("SELECT grade_kinder, es_enrollment FROM school_profiles WHERE school_id = $1", [data.schoolId]);
    if (verify.rows.length > 0) {
      console.log("✅ DB VERIFY: grade_kinder =", verify.rows[0].grade_kinder);
    }

    await logActivity(
      data.submittedBy, 'School Head', 'School Head', 'UPDATE',
      `Enrolment Data: ${data.schoolId}`,
      `Updated enrolment (Total: ${data.grandTotal})`
    );

    console.log("✅ Enrolment updated successfully!");
    res.status(200).json({ message: "Enrolment updated successfully!" });

  } catch (err) {
    console.error("❌ Enrolment Save Error:", err);
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

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "School Profile not found." });
    }

    await logActivity(
      uid, 'School Head', 'School Head', 'UPDATE',
      `Curricular Offering: ${schoolId}`,
      `Set curricular offering to ${offering}`
    );

    res.json({ success: true, message: "Curricular offering updated." });

  } catch (err) {
    console.error("❌ Update Offering Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * 🖼️ processAndSaveImage
 * Helper to save a base64 image (or buffer) to disk and return the path.
 */
async function processAndSaveImage(imageData, project_id, ipc, uploadedBy) {
  if (!imageData) return null;
  
  const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  let buffer;
  let extension = 'jpg'; // Default

  if (imageData.startsWith('data:image/')) {
    const matches = imageData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageData.split(',')[1], 'base64');
    }
  } else if (imageData.length > 500) { // Likely raw base64
    buffer = Buffer.from(imageData, 'base64');
  } else if (imageData.startsWith('/uploads/')) {
    return imageData; // Already a path
  } else {
    return imageData; // Unknown format, return as is
  }

  const fileName = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);
  
  const relativePath = `/uploads/${fileName}`;
  
  // Persistence logic (if requested by the caller)
  if (project_id) {
    const query = `
      INSERT INTO "engineer_image" (project_id, image_data, uploaded_by, ipc) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id;
    `;
    await pool.query(query, [project_id, relativePath, uploadedBy, ipc || null]);
  }

  return relativePath;
}

app.post('/api/create-project', async (req, res) => {
  const data = req.body;

  if (!data.schoolName || !data.projectName || !data.schoolId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN'); // Start Transaction

    // 1. Generate IPC (INF-YYYY-XXXXX)
    const year = new Date().getFullYear();
    const ipcResult = await client.query(
      "SELECT ipc FROM engineer_form WHERE ipc LIKE $1 ORDER BY ipc DESC LIMIT 1",
      [`INF-${year}-%`]
    );

    let nextSeq = 1;
    if (ipcResult.rows.length > 0) {
      const lastIpc = ipcResult.rows[0].ipc;
      const parts = lastIpc.split('-');
      if (parts.length === 3 && !isNaN(parts[2])) {
        nextSeq = parseInt(parts[2]) + 1;
      }
    }
    const newIpc = `INF-${year}-${String(nextSeq).padStart(5, '0')}`;

    // 2. Prepare Project Data
    const engineerName = await getUserFullName(data.uid);
    const resolvedEngineerName = engineerName || data.modifiedBy || 'Engineer';

    // Normalize Statuses
    let constructionStatus = data.status;
    if (constructionStatus) {
      const l = constructionStatus.toLowerCase();
      if (l === 'ongoing') constructionStatus = 'Ongoing';
      else if (l === 'suspended') constructionStatus = 'Suspended';
      else if (l === 'terminated') constructionStatus = 'Terminated';
      else if (l === 'for final inspection') constructionStatus = 'For Final Inspection';
      else if (l === 'completed') constructionStatus = 'Completed';
      else if (l === 'not yet started') constructionStatus = 'Not Yet Started';
    }

    let procStatus = data.procurement_status || data.statusDesignPhase;
    if (procStatus) {
      const l = procStatus.toLowerCase();
      if (l === 'not yet procured') procStatus = 'Not yet procured';
      else if (l === 'under procurement') procStatus = 'Under procurement';
      else if (l === 'completed') procStatus = 'Completed';
    }

    const projectValues = [
      data.projectName, data.schoolName, data.schoolId,
      valueOrNull(data.region), valueOrNull(data.division),
      constructionStatus || null, parseIntOrNull(data.accomplishmentPercentage),
      valueOrNull(data.statusAsOfDate), valueOrNull(data.targetCompletionDate),
      valueOrNull(data.actualCompletionDate), valueOrNull(data.noticeToProceed),
      valueOrNull(data.contractorName), parseNumberOrNull(data.projectAllocation),
      valueOrNull(data.batchOfFunds), valueOrNull(data.otherRemarks),
      data.uid,
      newIpc, // $17
      resolvedEngineerName, // $18
      valueOrNull(data.province), valueOrNull(data.city), valueOrNull(data.municipality), // $19, $20, $21
      valueOrNull(data.projectCategory), valueOrNull(data.fundingYear), // $22, $23
      valueOrNull(data.scopeOfWork), parseIntOrNull(data.numberOfClassrooms), // $24, $25
      parseIntOrNull(data.numberOfStoreys), parseIntOrNull(data.numberOfSites), // $26, $27
      parseNumberOrNull(data.fundsUtilized), valueOrNull(data.constructionStartDate), // $28, $29
      valueOrNull(data.latitude), valueOrNull(data.longitude), // $30, $31
      valueOrNull(procStatus) // $32
    ];

    const projectQuery = `
      INSERT INTO "engineer_form" (
        project_name, school_name, school_id, region, division,
        status_of_construction_phase, accomplishment_percentage, status_as_of,
        target_completion_date, actual_completion_date, notice_to_proceed,
        contractor_name, approved_budget_for_contract, batch_of_funds, other_remarks,
        engineer_id, ipc, engineer_name,
        province, city, municipality,
        project_category, funding_year,
        scope_of_work, number_of_classrooms,
        number_of_storeys, number_of_sites,
        funds_utilized, construction_start_date,
        latitude, longitude, procurement_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
      RETURNING project_id, project_name, ipc;
    `;

    // 3. Insert Project
    const projectResult = await client.query(projectQuery, projectValues);
    const newProject = projectResult.rows[0];
    const newProjectId = newProject.project_id;

    // 4. Insert Images via processAndSaveImage
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      for (const imgData of data.images) {
        await processAndSaveImage(imgData, newProjectId, newIpc, data.uid);
      }
    }

    await client.query('COMMIT');

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

    console.log("📝 Attempting to log CREATE activity for:", newIpc);

    try {
      await logActivity(
        data.uid,
        finalUserName,
        'Engineer',
        'CREATE',
        `Project: ${newProject.project_name} (${newIpc})`,
        JSON.stringify(logDetails)
      );
      console.log("✅ Activity logged successfully for:", newIpc);
    } catch (logErr) {
      console.error("⚠️ Activity Log Error (Non-blocking):", logErr.message);
      console.error("⚠️ Log Payload:", { uid: data.uid, user: finalUserName, ipc: newIpc });
    }

    res.status(200).json({ message: "Project and images saved!", project: newProject, ipc: newIpc });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ SQL ERROR:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    if (client) client.release();
  }
});
// --- 9. PUT: Update Project ---
// --- 9. PUT: Update Project (With History Logging) ---
app.put('/api/update-project/:id', upload.fields([
  { name: 'pow_pdf', maxCount: 1 },
  { name: 'dupa_pdf', maxCount: 1 },
  { name: 'contract_pdf', maxCount: 1 }
]), async (req, res) => {
  console.log("🔥 HIT (SECONDARY): PUT /api/update-project/" + req.params.id);

  const { id } = req.params;
  const data = req.body;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Fetch Existing Data for Comparison
    const oldRes = await client.query('SELECT * FROM "engineer_form" WHERE project_id = $1', [id]);
    if (oldRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Project not found" });
    }
    const oldData = oldRes.rows[0];
    console.log("DEBUG: project_id from URL:", id);
    console.log("DEBUG: oldData keys:", Object.keys(oldData));
    console.log("DEBUG: oldData sample (project_name):", oldData.project_name);

    // Fetch existing documents for carry-over
    const oldDocsRes = await client.query('SELECT * FROM engineer_documents WHERE project_id = $1', [id]);
    const d = oldDocsRes.rows[0];

    // Carry over document data (from request body or existing record)
    let pow_pdf = data.pow_pdf || (d ? d.pow_pdf : null);
    let dupa_pdf = data.dupa_pdf || (d ? d.dupa_pdf : null);
    let contract_pdf = data.contract_pdf || (d ? d.contract_pdf : null);
    const moa_pdf = data.moa_pdf || (d ? d.moa_pdf : null);
    const rta_pdf = data.rta_pdf || (d ? d.rta_pdf : null);

    let pow_filename = data.pow_filename || (d ? d.pow_filename : null);
    let dupa_filename = data.dupa_filename || (d ? d.dupa_filename : null);
    let contract_filename = data.contract_filename || (d ? d.contract_filename : null);

    // Handle uploaded PDF files (multipart/form-data)
    if (req.files) {
      if (req.files['pow_pdf']) {
        const buffer = fs.readFileSync(req.files['pow_pdf'][0].path);
        pow_pdf = await compressDocument(buffer, 'POW');
        pow_filename = req.files['pow_pdf'][0].originalname;
      }
      if (req.files['dupa_pdf']) {
        const buffer = fs.readFileSync(req.files['dupa_pdf'][0].path);
        dupa_pdf = await compressDocument(buffer, 'DUPA');
        dupa_filename = req.files['dupa_pdf'][0].originalname;
      }
      if (req.files['contract_pdf']) {
        const buffer = fs.readFileSync(req.files['contract_pdf'][0].path);
        contract_pdf = await compressDocument(buffer, 'CONTRACT');
        contract_filename = req.files['contract_pdf'][0].originalname;
      }
    }

    // 2. Prepare Data for New Row (Append History)
    // Fetch user name to ensure it's up-to-date
    let finalUserName = await getUserFullName(data.uid);
    if (!finalUserName) finalUserName = data.modifiedBy || 'Engineer (Unknown)';

    // Merge new data with old data (Snapshot concept)
    let newStatus = oldData.status_of_construction_phase;
    if ('status' in data) {
      // Allow clearing status by sending null or empty string
      newStatus = (data.status === '' || data.status === null) ? null : data.status;
    }

    let newProcurementStatus = data.procurement_status ?? data.statusDesignPhase ?? oldData.procurement_status;
    
    // Normalize casing for specific procurement statuses to match frontend options
    if (newProcurementStatus) {
      const lowerProc = newProcurementStatus.toLowerCase();
      if (lowerProc === 'not yet procured') newProcurementStatus = 'Not yet procured';
      else if (lowerProc === 'under procurement') newProcurementStatus = 'Under procurement';
      else if (lowerProc === 'completed') newProcurementStatus = 'Completed';
    }

    // Normalize casing for Construction Status
    if (newStatus) {
      const lowerStat = newStatus.toLowerCase();
      if (lowerStat === 'ongoing') newStatus = 'Ongoing';
      else if (lowerStat === 'suspended') newStatus = 'Suspended';
      else if (lowerStat === 'terminated') newStatus = 'Terminated';
      else if (lowerStat === 'for final inspection') newStatus = 'For Final Inspection';
      else if (lowerStat === 'completed') newStatus = 'Completed';
      else if (lowerStat === 'not yet started') newStatus = 'Not Yet Started';
    }
    const newAccomplishment = parseIntOrNull(data.accomplishmentPercentage) !== null ? parseIntOrNull(data.accomplishmentPercentage) : oldData.accomplishment_percentage;
    const newStatusAsOf = valueOrNull(data.statusAsOf) || valueOrNull(data.statusAsOfDate) || new Date().toISOString();
    const newRemarks = valueOrNull(data.otherRemarks) || oldData.other_remarks;
    const newActualDate = valueOrNull(data.actualCompletionDate) || oldData.actual_completion_date;
    const newBatch = valueOrNull(data.batchOfFunds) || oldData.batch_of_funds;
    const newAllocation = parseNumberOrNull(data.projectAllocation) || oldData.approved_budget_for_contract;
    const newContractAmount = parseNumberOrNull(data.contractAmount) || oldData.contract_amount;
    const newCategory = valueOrNull(data.projectCategory) || oldData.project_category;
    const newYear = valueOrNull(data.fundingYear) || oldData.funding_year;
    const newScope = valueOrNull(data.scopeOfWork) || oldData.scope_of_work;
    const newClassrooms = parseIntOrNull(data.numberOfClassrooms) || oldData.number_of_classrooms;
    const newStoreys = parseIntOrNull(data.numberOfStoreys) || oldData.number_of_storeys;
    const newSites = parseIntOrNull(data.numberOfSites) || oldData.number_of_sites;
    const newFundsUtilized = parseNumberOrNull(data.fundsUtilized) || oldData.funds_utilized;
    const newConstStart = valueOrNull(data.constructionStartDate) || oldData.construction_start_date;
    const newLat = valueOrNull(data.latitude) || oldData.latitude;
    const newLong = valueOrNull(data.longitude) || oldData.longitude;
    const newUpdateType = valueOrNull(data.update_type) || oldData.update_type;

    const insertValues = [
      oldData.project_name, oldData.school_name, oldData.school_id, oldData.region, oldData.division,
      newStatus, newAccomplishment, newStatusAsOf,
      oldData.target_completion_date, newActualDate, oldData.notice_to_proceed,
      oldData.contractor_name, newAllocation, newBatch, newRemarks,
      oldData.engineer_id, oldData.ipc, finalUserName, newProcurementStatus,
      oldData.province, oldData.city, oldData.municipality,
      newCategory, newYear, newScope, newClassrooms, newStoreys, newSites,
      newFundsUtilized, newConstStart, newLat, newLong, newContractAmount, newUpdateType,
      oldData.has_pow, oldData.has_dupa, oldData.has_contract, oldData.has_moa, oldData.has_rta,
      oldData.has_variation_order,
      oldData.is_realigned, oldData.savings, oldData.is_donated, oldData.program_type, oldData.funding_year_justification,
      oldData.sangguniang_resolution_id, oldData.mother_moa_id, oldData.supplamental_moa_id,
      pow_filename, dupa_filename, contract_filename
    ];

    const insertQuery = `
      INSERT INTO "engineer_form" (
        project_name, school_name, school_id, region, division,
        status_of_construction_phase, accomplishment_percentage, status_as_of,
        target_completion_date, actual_completion_date, notice_to_proceed,
        contractor_name, approved_budget_for_contract, batch_of_funds, other_remarks,
        engineer_id, ipc, engineer_name, procurement_status,
        province, city, municipality,
        project_category, funding_year, scope_of_work, number_of_classrooms,
        number_of_storeys, number_of_sites, funds_utilized, construction_start_date,
        latitude, longitude, contract_amount, update_type,
        has_pow, has_dupa, has_contract, has_moa, has_rta,
        has_variation_order,
        is_realigned, savings, is_donated, program_type, funding_year_justification,
        sangguniang_resolution_id, mother_moa_id, supplamental_moa_id,
        pow_filename, dupa_filename, contract_filename
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51)
      RETURNING *;
    `;

    const result = await client.query(insertQuery, insertValues);
    const newData = result.rows[0];

    // Insert document carry-over into engineer_documents for the new snapshot
    await client.query(`
      INSERT INTO engineer_documents (project_id, ipc, pow_pdf, pow_filename, dupa_pdf, dupa_filename, contract_pdf, contract_filename, moa_pdf, rta_pdf, uploader_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      newData.project_id, newData.ipc,
      pow_pdf, pow_filename, dupa_pdf, dupa_filename, contract_pdf, contract_filename, moa_pdf, rta_pdf,
      (data.pow_pdf || data.dupa_pdf || data.contract_pdf) ? data.uid : (d ? d.uploader_id : null)
    ]);

    await client.query('COMMIT');

    // 3. Track Changes (History)
    const changes = [];
    const oldStatusVal = oldData.status_of_construction_phase || null;
    const newStatusVal = newData.status_of_construction_phase || null;
    
    if (oldStatusVal !== newStatusVal) {
      changes.push(`Status: '${oldStatusVal || 'Unset'}' -> '${newStatusVal || 'Unset'}'`);
    }
    
    if (oldData.procurement_status !== newData.procurement_status) {
      changes.push(`Procurement Status: '${oldData.procurement_status || 'N/A'}' -> '${newData.procurement_status}'`);
    }
    
    const oldAccomplishment = oldData.accomplishment_percentage || 0;
    const newAccomplishmentVal = newData.accomplishment_percentage || 0;
    if (oldAccomplishment !== newAccomplishmentVal) {
      changes.push(`Accomplishment: ${oldAccomplishment}% -> ${newAccomplishmentVal}%`);
    }
    if (oldData.other_remarks !== newData.other_remarks) changes.push(`Remarks updated`);

    // Create a detailed log object
    const historyLog = {
      action: "Project Update",
      ipc: newData.ipc,
      changes: changes, // List of human-readable changes
      snapshot: { // Save key metrics
        status: newData.status_of_construction_phase,
        accomplishment: newData.accomplishment_percentage,
        date: new Date().toISOString()
      }
    };

    // 4. Log Activity — build a descriptive action_type based on what changed
    let actionLabel = 'Project Updated';
    if (oldData.procurement_status !== newData.procurement_status) {
      actionLabel = `Procurement → ${newData.procurement_status}`;
    } else if (oldStatusVal !== newStatusVal) {
      actionLabel = `Status → ${newStatusVal || 'Unset'}`;
    } else if (oldAccomplishment !== newAccomplishmentVal) {
      actionLabel = `Progress → ${newAccomplishmentVal}%`;
    } else if (oldData.other_remarks !== newData.other_remarks) {
      actionLabel = 'Remarks Updated';
    }

    await logActivity(
      data.uid,
      finalUserName,
      'Engineer',
      actionLabel,
      `Project: ${newData.project_name} (${newData.ipc || 'No IPC'})`,
      JSON.stringify(historyLog) // Storing structured history
    );

    res.json({ message: "Update successful", project: { ...newData, statusAsOf: newData.status_as_of } });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ Update Project Error:", err.message);
    if (err.detail) console.error("❌ DB Detail:", err.detail);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message, 
      detail: err.detail || "No additional detail" 
    });
  } finally {
    if (client) client.release();
  }
});

// --- 9b. POST: Upload a project document (POW / DUPA / CONTRACT / RTA / MOA) ---
const VALID_DOC_TYPES = ['POW', 'DUPA', 'CONTRACT', 'RTA', 'MOA'];
const DOC_COLUMN_MAP = { POW: 'pow_pdf', DUPA: 'dupa_pdf', CONTRACT: 'contract_pdf', RTA: 'rta_pdf', MOA: 'moa_pdf' };

/**
 * 🗜️ compressDocument
 * Core logic to compress a PDF buffer using the python script.
 * Returns either a relative path (success) or a base64 data URI (failure).
 */
async function compressDocument(fileBuffer, type) {
  const typeUpper = type?.toUpperCase();
  const docsDir = path.resolve(__dirname, '..', '..', 'uploads', 'project_docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const outputFilename = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`;
  const outputPath = path.join(docsDir, outputFilename);
  const tempInput = path.join(docsDir, `tmp_doc_${Date.now()}.pdf`);
  let filePath = null;

  try {
    fs.writeFileSync(tempInput, fileBuffer);
    const scriptPath = path.resolve(__dirname, '..', '..', 'compress_pdf.py');
    const cmd = (py) => `"${py}" "${scriptPath}" "${tempInput}" "${outputPath}"`;
    
    let compressionSuccess = false;
    for (const py of ['python', 'py', 'python3']) {
      try {
        await execAsync(cmd(py));
        compressionSuccess = true;
        break;
      } catch (err) { /* Next alias */ }
    }

    if (compressionSuccess && fs.existsSync(outputPath)) {
      filePath = `/uploads/project_docs/${outputFilename}`;
    } else {
      throw new Error("All compression methods failed.");
    }
  } catch (err) {
    console.warn(`⚠️ [COMPRESSION] Failed for ${typeUpper}:`, err.message);
    filePath = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  } finally {
    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
  }
  return filePath;
}

/**
 * 📦 processAndCompressDocument
 * Wrapper that compresses and then UPSERTS into engineer_documents.
 */
async function processAndCompressDocument(fileBuffer, type, project_id, ipc, uid) {
  const filePath = await compressDocument(fileBuffer, type);
  const column = DOC_COLUMN_MAP[type?.toUpperCase()];
  
  if (column) {
    await pool.query(`
      INSERT INTO engineer_documents (project_id, ipc, ${column}, uploader_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id) DO UPDATE SET
        ${column} = EXCLUDED.${column},
        uploader_id = EXCLUDED.uploader_id
    `, [parseInt(project_id), ipc || null, filePath, uid || null]);
    
    console.log(`✅ [DOC] ${type} saved/updated for Project ${project_id}`);
  }
  return filePath;
}

app.post('/api/upload-project-document', (req, res) => {
  const bb = busboy({ headers: req.headers });
  const fields = {};
  let fileBuffer = null;

  bb.on('field', (name, val) => { fields[name] = val; });

  bb.on('file', (name, file) => {
    const chunks = [];
    file.on('data', chunk => chunks.push(chunk));
    file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
  });

  bb.on('close', async () => {
    const { project_id, type, uid, ipc } = fields;
    const typeUpper = type?.toUpperCase();

    if (!project_id || !VALID_DOC_TYPES.includes(typeUpper)) {
      return res.status(400).json({ error: 'project_id and a valid type (POW, DUPA, CONTRACT, RTA, MOA) are required.' });
    }
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'No PDF file provided.' });
    }

    const column = DOC_COLUMN_MAP[typeUpper];

    try {
      const check = await pool.query('SELECT ipc FROM engineer_form WHERE project_id = $1', [parseInt(project_id)]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
      const projectIpc = check.rows[0].ipc || ipc || null;

      // Respond immediately — compression runs in background
      res.json({ success: true, message: `${typeUpper} received. Compressing in background…` });

      // Background: compress + UPSERT into engineer_documents
      processAndCompressDocument(fileBuffer, typeUpper, project_id, projectIpc, uid)
        .catch(err => console.error('❌ [DOC] Background save error:', err.message));

    } catch (err) {
      if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error', message: err.message });
      console.error('❌ upload-project-document error:', err.message);
    }
  });

  bb.on('error', err => {
    console.error('Busboy error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Upload parsing failed' });
  });

  req.pipe(bb);
});

// --- 9c. POST: Save Variation Order ---
app.post('/api/variation-orders', async (req, res) => {
  const { 
    projectId, variationName, variationType, 
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
    
    // Calculate total modified amount (Logical sum)
    const modified = original + add - ded;

    const query = `
      INSERT INTO variation_orders (
        project_id, variation_name, variation_type, 
        original_amount, additive, deductive, reused_amount, modified_amount, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [projectId, variationName, variationType, original, add, ded, reused, modified, uid];
    const result = await pool.query(query, values);

    // Get project info for logging
    const projectRes = await pool.query('SELECT project_name, ipc FROM engineer_form WHERE project_id = $1', [projectId]);
    const project = projectRes.rows[0];

    await logActivity(
      uid, userName || 'Engineer', 'Engineer', 'VARIATION',
      `VO: ${variationName} (${project?.project_name || projectId})`,
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

// --- 9c. GET: Fetch Variation Orders ---
app.get('/api/variation-orders/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM variation_orders WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Fetch VO Error:", err.message);
    res.status(500).json({ error: "Failed to fetch variation orders" });
  }
});


// --- 10a. GET: Project History by IPC ---
app.get('/api/project-history/:ipc', async (req, res) => {
  try {
    const { ipc } = req.params;
    const result = await pool.query(
      `SELECT 
        project_id AS id,
        project_name AS "projectName",
        school_name AS "schoolName",
        engineer_name AS "engineerName",
        status_of_construction_phase AS status,
        procurement_status,
        accomplishment_percentage AS "accomplishmentPercentage",
        other_remarks AS remarks,
        status_as_of AS "statusAsOf",
        TO_CHAR(created_at, 'Mon DD, YYYY HH12:MI AM') AS created_at
      FROM engineer_form
      WHERE ipc = $1
      ORDER BY project_id ASC`,
      [ipc]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching project history:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- 10. GET: Get Projects (Filtered by Engineer) ---
app.get('/api/projects', async (req, res) => {
  try {
    const { status, region, division, search, engineer_id } = req.query;
    let queryParams = [];
    let whereClauses = [];

    let sql = `
      WITH RankedProjects AS (
          SELECT *,
                 LAG(accomplishment_percentage) OVER (PARTITION BY ipc ORDER BY project_id ASC) as prev_perc
          FROM engineer_form
      ),
      LatestProjects AS (
          SELECT DISTINCT ON (ipc) *
          FROM RankedProjects
          ORDER BY ipc, project_id DESC
      )
      SELECT 
        project_id AS "id", school_name AS "schoolName", project_name AS "projectName",
        school_id AS "schoolId", division, region, status_of_construction_phase AS status, ipc, engineer_name AS "engineerName",
        procurement_status AS "procurement_status",
        accomplishment_percentage AS "accomplishmentPercentage",
        prev_perc AS "previousPercentage",
        approved_budget_for_contract AS "projectAllocation", batch_of_funds AS "batchOfFunds",
        contractor_name AS "contractorName", other_remarks AS "otherRemarks",
        province, city, municipality,
        project_category AS "projectCategory", funding_year AS "fundingYear",
        scope_of_work AS "scopeOfWork", number_of_classrooms AS "numberOfClassrooms",
        number_of_storeys AS "numberOfStoreys", number_of_sites AS "numberOfSites",
        funds_utilized AS "fundsUtilized",
        latitude, longitude,
        has_pow AS "hasPow", has_dupa AS "hasDupa", has_contract AS "hasContract",
        has_moa AS "hasMoa", has_rta AS "hasRta",
        has_variation_order AS "hasVariationOrder", variation_order_pdf AS "variationOrderPdf",
        contract_amount AS "contractAmount",
        is_realigned AS "isRealigned", update_type AS "updateType",
        savings, is_donated AS "isDonated", program_type AS "programType",
        funding_year_justification AS "fundingYearJustification",
        sangguniang_resolution_id, mother_moa_id, supplamental_moa_id,
        status_as_of AS "statusAsOf",
        TO_CHAR(target_completion_date, 'YYYY-MM-DD') AS "targetCompletionDate",
        TO_CHAR(actual_completion_date, 'YYYY-MM-DD') AS "actualCompletionDate",
        TO_CHAR(notice_to_proceed, 'YYYY-MM-DD') AS "noticeToProceed"
      FROM LatestProjects
    `;

    // 1. Identification & Jurisdictional filtering
    if (engineer_id) {
      // DEBUG LOG:
      process.stdout.write(`\n🔍 [DEBUG] Fetching projects for UID: ${engineer_id}\n`);
      const userResult = await pool.query('SELECT role, region, division FROM users WHERE uid = $1', [engineer_id]);
      const userProfile = userResult.rows[0];
      
      if (userProfile) {
        process.stdout.write(`✅ [DEBUG] Profile Found: ${JSON.stringify(userProfile)}\n`);
        
        const isDivEng = ['Division Engineer', 'SDO', 'RO'].some(r => 
          userProfile.role?.toLowerCase() === r.toLowerCase()
        );

        if (isDivEng) {
          process.stdout.write(`📍 [DEBUG] Division Engineer Mode activated for: ${userProfile.region} - ${userProfile.division}\n`);
          if (userProfile.region) {
            const regionVal = userProfile.region.trim();
            queryParams.push(regionVal);
            
            // Handle CARAGA/Region XIII alias
            if (regionVal.toUpperCase() === 'CARAGA' || regionVal.toUpperCase() === 'REGION XIII') {
              whereClauses.push(`(region ILIKE $${queryParams.length} OR region ILIKE '%Region XIII%' OR region ILIKE '%CARAGA%')`);
            } else {
              whereClauses.push(`region ILIKE $${queryParams.length}`);
            }
          }
          if (userProfile.division) {
            queryParams.push(userProfile.division.trim());
            whereClauses.push(`division ILIKE $${queryParams.length}`);
          }
        } else {
          process.stdout.write(`👤 [DEBUG] Regular User Mode. Filtering by engineer_id.\n`);
          queryParams.push(engineer_id);
          whereClauses.push(`engineer_id = $${queryParams.length}`);
        }
      } else {
        process.stdout.write(`⚠️ [DEBUG] No profile found for UID: ${engineer_id}. Defaulting to UID filter.\n`);
        queryParams.push(engineer_id);
        whereClauses.push(`engineer_id = $${queryParams.length}`);
      }
    }

    if (status) {
      queryParams.push(status);
      whereClauses.push(`status = $${queryParams.length}`);
    }
    if (region) {
      queryParams.push(region);
      whereClauses.push(`region ILIKE $${queryParams.length}`);
    }
    if (division) {
      queryParams.push(division);
      whereClauses.push(`division ILIKE $${queryParams.length}`);
    }
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(school_name ILIKE $${queryParams.length} OR project_name ILIKE $${queryParams.length})`);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    sql += ` ORDER BY project_id DESC`;

    const result = await pool.query(sql, queryParams);
    
    // Normalize casing for the frontend
    const rows = result.rows.map(item => {
      let s = item.status;
      if (s) {
        const l = s.toLowerCase();
        if (l === 'ongoing') s = 'Ongoing';
        else if (l === 'suspended') s = 'Suspended';
        else if (l === 'terminated') s = 'Terminated';
        else if (l === 'for final inspection') s = 'For Final Inspection';
        else if (l === 'completed') s = 'Completed';
        else if (l === 'not yet started') s = 'Not Yet Started';
      }
      let ps = item.procurement_status;
      if (ps) {
        const l = ps.toLowerCase();
        if (l === 'not yet procured') ps = 'Not yet procured';
        else if (l === 'under procurement') ps = 'Under procurement';
        else if (l === 'completed') ps = 'Completed';
      }
      return { ...item, status: s, procurement_status: ps };
    });

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching projects:", err.message);
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
        e.school_id AS "schoolId", e.division, e.region, e.status_of_construction_phase AS status, e.ipc,
        e.procurement_status AS "procurement_status",
        e.accomplishment_percentage AS "accomplishmentPercentage",
        e.approved_budget_for_contract AS "projectAllocation", e.batch_of_funds AS "batchOfFunds",
        e.contractor_name AS "contractorName", e.other_remarks AS "otherRemarks",
        e.province, e.city, e.municipality,
        e.status_as_of AS "statusAsOf",
        TO_CHAR(e.target_completion_date, 'YYYY-MM-DD') AS "targetCompletionDate",
        TO_CHAR(e.actual_completion_date, 'YYYY-MM-DD') AS "actualCompletionDate",
        TO_CHAR(e.notice_to_proceed, 'YYYY-MM-DD') AS "noticeToProceed",
        d.pow_pdf, d.dupa_pdf, d.contract_pdf, d.moa_pdf, d.rta_pdf
      FROM "engineer_form" e
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
        school_id AS "schoolId", division, region, status_of_construction_phase AS status, validation_status, ipc,
        validation_remarks AS "validationRemarks", validated_by AS "validatedBy",
        accomplishment_percentage AS "accomplishmentPercentage",
        approved_budget_for_contract AS "projectAllocation", batch_of_funds AS "batchOfFunds",
        contractor_name AS "contractorName", other_remarks AS "otherRemarks",
        status_as_of AS "statusAsOf",
        TO_CHAR(target_completion_date, 'YYYY-MM-DD') AS "targetCompletionDate",
        TO_CHAR(actual_completion_date, 'YYYY-MM-DD') AS "actualCompletionDate",
        TO_CHAR(notice_to_proceed, 'YYYY-MM-DD') AS "noticeToProceed"
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

// --- 11c. POST: Validate Project (School Head) ---
app.post('/api/validate-project', async (req, res) => {
  const { projectId, status, userUid, userName, remarks } = req.body;
  try {
    const query = `
      UPDATE "engineer_form" 
      SET validation_status = $1, validation_remarks = $3, validated_by = $4
      WHERE project_id = $2;
    `;
    await pool.query(query, [status, projectId, remarks || '', userName]);

    await logActivity(
      userUid,
      userName || 'School Head',
      'School Head',
      'VALIDATE',
      `Project ID: ${projectId}`,
      `Marked as ${status}. Remarks: ${remarks || 'None'}`
    );

    res.json({ success: true, message: `Project ${status}` });
  } catch (err) {
    console.error("Validation Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 11d. POST: Save Project Documents (Metadata Only) ---
app.post('/api/save-project-documents', async (req, res) => {
  const { projectId, documents, uploadedBy } = req.body;

  if (!projectId || !documents || !Array.isArray(documents)) {
    return res.status(400).json({ error: "Missing required fields or documents array" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO project_documents 
      (project_id, document_type, file_url, storage_path, uploaded_by, file_size, content_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    for (const doc of documents) {
      await client.query(query, [
        projectId,
        doc.type,         // 'POW', 'DUPA', etc.
        doc.url,          // Firebase Download URL
        doc.path,         // storage/path/to/file.pdf
        uploadedBy,
        doc.size || 0,
        doc.contentType || 'application/pdf'
      ]);
    }

    await client.query('COMMIT');

    // Audit Log
    try {
      await logActivity(
        uploadedBy,
        'Engineer', // Assuming role
        'Engineer',
        'UPLOAD',
        `Project Documents: ${projectId}`,
        `Uploaded ${documents.length} PDF documents`
      );
    } catch (logErr) {
      console.warn("Log failed:", logErr.message);
    }

    res.json({ success: true, message: "Document metadata saved." });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Save Doc Metadata Error:", err);
    res.status(500).json({ error: "Failed to save document metadata" });
  } finally {
    client.release();
  }
});

// --- 20. POST: Upload Project Image (Base64) ---
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  let { projectId, imageData, uploadedBy, category, ipc: providedIpc } = req.body;
  
  // If multipart/form-data via multer, file is in req.file
  if (req.file) {
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const newPath = path.join(__dirname, '..', '..', 'uploads', fileName);
    fs.renameSync(req.file.path, newPath);
    imageData = `/uploads/${fileName}`; 
  } else if (imageData && !imageData.startsWith('/')) {
    // If sent as base64 in body, use healer to save to disk
    imageData = await processAndSaveImage(imageData, null, null, uploadedBy);
  }

  if (!projectId || !imageData) return res.status(400).json({ error: "Missing required data" });

  try {
    let finalIpc = providedIpc;
    if (!finalIpc) {
      const ipcResult = await pool.query('SELECT ipc FROM engineer_form WHERE project_id = $1', [projectId]);
      if (ipcResult.rows.length > 0) finalIpc = ipcResult.rows[0].ipc;
    }

    const query = `
      INSERT INTO engineer_image (project_id, image_data, uploaded_by, category, ipc) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id;
    `;
    const result = await pool.query(query, [projectId, imageData, uploadedBy, category || 'Internal', finalIpc]);

    console.log(`📸 [HEALED] Image Saved: ID ${result.rows[0].id} for Project ${projectId} -> ${imageData}`);
    await logActivity(uploadedBy, 'Engineer', 'Engineer', 'UPLOAD', `Project ID: ${projectId}`, `Uploaded image: ${category || 'Internal'}`);
    res.status(201).json({ success: true, imageId: result.rows[0].id, imageUrl: imageData });
  } catch (err) {
    console.error("❌ Image Upload Error:", err.message);
    res.status(500).json({ error: "Failed to save image" });
  }
});

// --- 21. GET: Fetch All Images for a Project (IPC-aware) ---
app.get('/api/project-images/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    // 1. Get the IPC for this specific project snapshot
    const ipcResult = await pool.query('SELECT ipc FROM engineer_form WHERE project_id = $1', [projectId]);
    const ipc = ipcResult.rows.length > 0 ? ipcResult.rows[0].ipc : null;

    let query;
    let params;

    if (ipc) {
      // 2. Fetch all images linked to this IPC (full project history)
      query = `
        SELECT id, image_data, uploaded_by, created_at, category, ipc 
        FROM engineer_image 
        WHERE ipc = $1 OR project_id = $2
        ORDER BY created_at DESC;
      `;
      params = [ipc, projectId];
    } else {
      // Fallback to just project_id if IPC is missing
      query = `
        SELECT id, image_data, uploaded_by, created_at, category, ipc 
        FROM engineer_image 
        WHERE project_id = $1 
        ORDER BY created_at DESC;
      `;
      params = [projectId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching project images:", err.message);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// --- 22. GET: Fetch All Images for an Engineer ---
app.get('/api/engineer-images/:engineerId', async (req, res) => {
  const { engineerId } = req.params;
  try {
    const query = `
      SELECT ei.id, ei.image_data, ei.created_at, ef.school_name 
      FROM engineer_image ei
      LEFT JOIN engineer_form ef ON ei.project_id = ef.project_id
      WHERE ei.uploaded_by = $1 
      ORDER BY ei.created_at DESC;
    `;
    const result = await pool.query(query, [engineerId]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching engineer gallery:", err.message);
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
                classes_grade_11, classes_grade_12,
                
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
        cnt_less_g12: row.cnt_less_g12, cnt_within_g12: row.cnt_within_g12, cnt_above_g12: row.cnt_above_g12
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
      data.cntLessG12 || 0, data.cntWithinG12 || 0, data.cntAboveG12 || 0
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "School Profile not found (Check School ID)" });
    }

    res.json({ message: "Classes saved successfully!" });
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
                teach_exp_40_45
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
        teach_exp_40_45: row.teach_exp_40_45
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
  console.log("📥 RECEIVED TEACHING PERSONNEL DATA:", JSON.stringify(d, null, 2));
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

                -- Experience Fields
                teach_exp_0_1 = $20::INT, teach_exp_2_5 = $21::INT, teach_exp_6_10 = $22::INT,
                teach_exp_11_15 = $23::INT, teach_exp_16_20 = $24::INT, teach_exp_21_25 = $25::INT,
                teach_exp_26_30 = $26::INT, teach_exp_31_35 = $27::INT, teach_exp_36_40 = $28::INT,
                teach_exp_40_45 = $29::INT,

                updated_at = CURRENT_TIMESTAMP
            WHERE TRIM(submitted_by) = TRIM($1)
            RETURNING school_id;
        `;

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
      d.teach_exp_40_45 || 0 // 29
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      console.error("❌ SQL matched 0 rows for UID:", d.uid);
      return res.status(404).json({ error: "No matching record found in Neon." });
    }

    console.log("✅ Neon Updated Successfully for School:", result.rows[0].school_id);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Neon Database Error:", err.message);
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

// --- 22. POST: Save School Resources ---
app.post('/api/save-school-resources', async (req, res) => {
  const data = req.body;
  console.log(`[Resources] Saving SchoolID: ${data.schoolId}`);
  console.log(`[Resources] Buildable Space: ${data.res_buildable_space}`);
  try {
    const query = `
            UPDATE school_profiles SET
                res_armchairs_good=$2, res_armchairs_repair=$3, res_teacher_tables_good=$4, res_teacher_tables_repair=$5,
                res_blackboards_good=$6, res_blackboards_defective=$7,
                res_desktops_instructional=$8, res_desktops_admin=$9, res_laptops_teachers=$10, res_tablets_learners=$11,
                res_printers_working=$12, res_projectors_working=$13, res_internet_type=$14,
                res_toilets_male=$15, res_toilets_female=$16, res_toilets_pwd=$17, res_toilets_common=$39, res_faucets=$18, res_water_source=$19,
                res_sci_labs=$20, res_com_labs=$21, res_tvl_workshops=$22,
                
                res_ownership_type=$23, res_electricity_source=$24, res_buildable_space=$25,
                sha_category=$40,

                seats_kinder=$26, seats_grade_1=$27, seats_grade_2=$28, seats_grade_3=$29,
                seats_grade_4=$30, seats_grade_5=$31, seats_grade_6=$32,
                seats_grade_7=$33, seats_grade_8=$34, seats_grade_9=$35, seats_grade_10=$36,
                seats_grade_11=$37, seats_grade_12=$38,

                -- New Inventory Fields
                res_ecart_func=$41, res_ecart_nonfunc=$42,
                res_laptop_func=$43, res_laptop_nonfunc=$44,
                res_tv_func=$45, res_tv_nonfunc=$46,
                res_printer_func=$47, res_printer_nonfunc=$48,
                res_desk_func=$49, res_desk_nonfunc=$50,
                res_armchair_func=$51, res_armchair_nonfunc=$52,
                res_toilet_func=$53, res_toilet_nonfunc=$54,
                res_handwash_func=$55, res_handwash_nonfunc=$56,

                updated_at=CURRENT_TIMESTAMP
            WHERE school_id=$1
        `;
    const result = await pool.query(query, [
      data.schoolId,
      data.res_armchairs_good, data.res_armchairs_repair, data.res_teacher_tables_good, data.res_teacher_tables_repair,
      data.res_blackboards_good, data.res_blackboards_defective,
      data.res_desktops_instructional, data.res_desktops_admin, data.res_laptops_teachers, data.res_tablets_learners,
      data.res_printers_working, data.res_projectors_working, valueOrNull(data.res_internet_type),
      data.res_toilets_male, data.res_toilets_female, data.res_toilets_pwd, data.res_faucets, valueOrNull(data.res_water_source),
      data.res_sci_labs, data.res_com_labs, data.res_tvl_workshops,

      valueOrNull(data.res_ownership_type), valueOrNull(data.res_electricity_source), valueOrNull(data.res_buildable_space),

      data.seats_kinder, data.seats_grade_1, data.seats_grade_2, data.seats_grade_3,
      data.seats_grade_4, data.seats_grade_5, data.seats_grade_6,
      data.seats_grade_7, data.seats_grade_8, data.seats_grade_9, data.seats_grade_10,
      data.seats_grade_11, data.seats_grade_12,

      data.res_toilets_common, // $39
      valueOrNull(data.sha_category), // $40

      // New Inventory Values
      data.res_ecart_func || 0, data.res_ecart_nonfunc || 0, // 41, 42
      data.res_laptop_func || 0, data.res_laptop_nonfunc || 0, // 43, 44
      data.res_tv_func || 0, data.res_tv_nonfunc || 0, // 45, 46
      data.res_printer_func || 0, data.res_printer_nonfunc || 0, // 47, 48
      data.res_desk_func || 0, data.res_desk_nonfunc || 0, // 49, 50
      data.res_armchair_func || 0, data.res_armchair_nonfunc || 0, // 51, 52
      data.res_toilet_func || 0, data.res_toilet_nonfunc || 0, // 53, 54
      data.res_handwash_func || 0, data.res_handwash_nonfunc || 0 // 55, 56
    ]);
    if (result.rowCount === 0) {
      console.warn(`[Resources] ID ${data.schoolId} not found.`);
      return res.status(404).json({ error: "School Profile not found" });
    }
    console.log("[Resources] Success");

    // Update Progress in ph_school_completion (Unit 6)
    const iernRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [data.schoolId]);
    if (iernRes.rows.length > 0 && iernRes.rows[0].iern) {
        const iern = iernRes.rows[0].iern;
        await pool.query(`
            INSERT INTO ph_school_completion (iern, unit6_completion)
            VALUES ($1, true)
            ON CONFLICT (iern) DO UPDATE SET unit6_completion = true, updated_at = CURRENT_TIMESTAMP
        `, [iern]);
        await updateSchoolTotalCompletion(iern);
    }

    res.json({ message: "Resources saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- 23. GET: Teacher Specialization Data ---
app.get('/api/teacher-specialization/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await pool.query('SELECT * FROM school_profiles WHERE submitted_by = $1', [uid]);
    if (result.rows.length === 0) return res.json({ exists: false });
    res.json({ exists: true, data: result.rows[0] });
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

// --- 25. POST: Save Physical Facilities ---
app.post('/api/save-physical-facilities', async (req, res) => {
  const data = req.body;
  try {
    const query = `
            UPDATE school_profiles SET
                build_classrooms_total=$2, 
                build_classrooms_new=$3,
                build_classrooms_good=$4,
                build_classrooms_repair=$5,
                build_classrooms_demolition=$6,
                updated_at=CURRENT_TIMESTAMP
            WHERE school_id=$1
        `;
    await pool.query(query, [
      data.schoolId,
      data.build_classrooms_total,
      data.build_classrooms_new,
      data.build_classrooms_good,
      data.build_classrooms_repair,
      data.build_classrooms_demolition
    ]);

    // Update Progress in ph_school_completion (Unit 7)
    const iernRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [data.schoolId]);
    if (iernRes.rows.length > 0 && iernRes.rows[0].iern) {
        const iern = iernRes.rows[0].iern;
        await pool.query(`
            INSERT INTO ph_school_completion (iern, unit7_completion)
            VALUES ($1, true)
            ON CONFLICT (iern) DO UPDATE SET unit7_completion = true, updated_at = CURRENT_TIMESTAMP
        `, [iern]);
        await updateSchoolTotalCompletion(iern);
    }

    res.json({ message: "Facilities saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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
      d.spec_ict_coord || 0, d.spec_drrm_coord || 0
    ];
    const result = await pool.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ error: "Profile not found" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==================================================================
//                    MONITORING & JURISDICTION ROUTES
// ==================================================================

// --- 25. GET: Monitoring Stats (RO / SDO) ---
app.get('/api/monitoring/stats', async (req, res) => {
  const { region, division } = req.query;
  try {
    let statsQuery = `
      SELECT 
        COUNT(*) as total_schools,
        COUNT(CASE WHEN school_name IS NOT NULL THEN 1 END) as profile,
        COUNT(CASE WHEN head_last_name IS NOT NULL THEN 1 END) as head,
        COUNT(CASE WHEN total_enrollment > 0 THEN 1 END) as enrollment,
        COUNT(CASE WHEN classes_kinder IS NOT NULL THEN 1 END) as organizedclasses,
        COUNT(CASE WHEN psc.unit5_completion = true THEN 1 END) as personnel,
        COUNT(CASE WHEN psc.unit6_completion = true THEN 1 END) as resources,
        COUNT(CASE WHEN psc.unit7_completion = true THEN 1 END) as facilities,
        SUM(CASE WHEN psc.total_completion = 100 THEN 1 ELSE 0 END) as completed_schools_count
      FROM school_profiles sp
      LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1)
      WHERE TRIM(sp.region) = TRIM($1)
    `;
    let params = [region];

    if (division) {
      statsQuery += ` AND TRIM(division) = TRIM($2)`;
      params.push(division);
    }

    if (req.query.district) {
      statsQuery += ` AND TRIM(district) = TRIM($${params.length + 1})`;
      params.push(req.query.district);
    }

    const result = await pool.query(statsQuery, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Monitoring Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// --- 25b. GET: Monitoring Stats per Division (RO View) ---
// --- 25b. GET: Monitoring Stats per Division (RO View) ---
app.get('/api/monitoring/division-stats', async (req, res) => {
  const { region } = req.query;
  console.log("DEBUG: FETCHING DIV STATS FOR REGION:", region);
  try {
    const query = `
      SELECT 
        division,
        COUNT(*) as total_schools,
        SUM(CASE WHEN (
           (CASE WHEN school_name IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN total_enrollment > 0 THEN 1 ELSE 0 END) + 
           (CASE WHEN head_last_name IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN classes_kinder IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN stat_ip IS NOT NULL OR stat_displaced IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN shift_kinder IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN teach_kinder IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN spec_math_major > 0 OR spec_guidance > 0 THEN 1 ELSE 0 END) + 
           (CASE WHEN res_water_source IS NOT NULL OR res_toilets_male IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN build_classrooms_total IS NOT NULL THEN 1 ELSE 0 END)
        ) = 10 THEN 1 ELSE 0 END) as completed_schools
      FROM school_profiles
      WHERE TRIM(region) = TRIM($1)
      GROUP BY division
      ORDER BY division ASC
    `;

    const result = await pool.query(query, [region]);
    console.log("DEBUG: DIV STATS RESULT:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Division Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch division stats" });
  }
});

// --- 25c. GET: Monitoring Stats per District (SDO View) ---
app.get('/api/monitoring/district-stats', async (req, res) => {
  const { region, division } = req.query;
  console.log("DEBUG: FETCHING DISTRICT STATS FOR:", region, division);
  try {
    const query = `
      SELECT 
        district,
        COUNT(*) as total_schools,
        SUM(CASE WHEN (
           (CASE WHEN school_name IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN total_enrollment > 0 THEN 1 ELSE 0 END) + 
           (CASE WHEN head_last_name IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN classes_kinder IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN stat_ip IS NOT NULL OR stat_displaced IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN shift_kinder IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN teach_kinder IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN spec_math_major > 0 OR spec_guidance > 0 THEN 1 ELSE 0 END) + 
           (CASE WHEN res_water_source IS NOT NULL OR res_toilets_male IS NOT NULL THEN 1 ELSE 0 END) + 
           (CASE WHEN build_classrooms_total IS NOT NULL THEN 1 ELSE 0 END)
        ) = 10 THEN 1 ELSE 0 END) as completed_schools
      FROM school_profiles
      WHERE TRIM(region) = TRIM($1) AND TRIM(division) = TRIM($2)
      GROUP BY district
      ORDER BY district ASC
    `;

    const result = await pool.query(query, [region, division]);
    console.log("DEBUG: DISTRICT STATS RESULT:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("District Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch district stats" });
  }
});

// --- 26. GET: List Schools in Jurisdiction ---
app.get('/api/monitoring/schools', async (req, res) => {
  const { region, division } = req.query;
  try {
    let query = `
    SELECT
      sp.*,
      (CASE WHEN sp.school_id IS NOT NULL THEN true ELSE false END) as profile_status,
      (CASE WHEN sp.head_last_name IS NOT NULL AND sp.head_last_name != '' THEN true ELSE false END) as head_status,
      (CASE WHEN sp.total_enrollment > 0 THEN true ELSE false END) as enrollment_status,
      (CASE WHEN sp.classes_kinder > 0 THEN true ELSE false END) as classes_status,
      (CASE WHEN sp.shift_kinder IS NOT NULL THEN true ELSE false END) as shifting_status,
      (CASE WHEN sp.teach_kinder > 0 THEN true ELSE false END) as personnel_status,
      (CASE WHEN sp.spec_math_major > 0 OR sp.spec_guidance > 0 THEN true ELSE false END) as specialization_status,
      (CASE WHEN sp.res_water_source IS NOT NULL OR sp.res_toilets_male IS NOT NULL THEN true ELSE false END) as resources_status,
      (CASE WHEN sp.stat_ip IS NOT NULL OR sp.stat_displaced IS NOT NULL THEN true ELSE false END) as learner_stats_status,
      (CASE WHEN sp.build_classrooms_total IS NOT NULL THEN true ELSE false END) as facilities_status

      FROM school_profiles sp
      WHERE TRIM(sp.region) = TRIM($1)
  `;
    let params = [region];

    if (division) {
      query += ` AND TRIM(sp.division) = TRIM($2)`;
      params.push(division);
    }

    if (req.query.district) {
      query += ` AND TRIM(sp.district) = TRIM($${params.length + 1})`;
      params.push(req.query.district);
    }

    query += ` ORDER BY school_name ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Jurisdiction Schools Error:", err);
    res.status(500).json({ error: "Failed to fetch schools", details: err.message });
  }
});

// --- 27. GET: Engineer Project Stats for Jurisdiction ---
app.get('/api/monitoring/engineer-stats', async (req, res) => {
  const { region, division } = req.query;
  try {
    let query = `
      SELECT 
        COUNT(*) as total_projects,
        AVG(e.accomplishment_percentage):: NUMERIC(10, 2) as avg_progress,
        COUNT(CASE WHEN e.status = 'Completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN e.status = 'Ongoing' THEN 1 END) as ongoing_count,
        COUNT(CASE WHEN e.status = 'Delayed' THEN 1 END) as delayed_count
      FROM engineer_form e
      JOIN school_profiles sp ON e.school_id = sp.school_id
      WHERE TRIM(sp.region) = TRIM($1)
    `;
    let params = [region];

    if (division) {
      query += ` AND TRIM(sp.division) = TRIM($2)`;
      params.push(division);
    }

    if (req.query.district) {
      query += ` AND TRIM(sp.district) = TRIM($${params.length + 1})`;
      params.push(req.query.district);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Engineer Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch engineer stats" });
  }
});

// --- 28. GET: All Engineer Projects for Jurisdiction ---
app.get('/api/monitoring/engineer-projects', async (req, res) => {
  const { region, division } = req.query;
  try {
    let query = `
      SELECT
        e.project_id as id, e.project_name as "projectName", e.school_id as "schoolId", e.school_name as "schoolName",
        e.accomplishment_percentage as "accomplishmentPercentage", e.status, e.project_allocation as "projectAllocation",
        e.validation_status as "validation_status", e.status_as_of as "statusAsOfDate"
      FROM engineer_form e
      LEFT JOIN school_profiles sp ON e.school_id = sp.school_id
      WHERE TRIM(e.region) = TRIM($1)
    `;
    let params = [region];

    if (division) {
      query += ` AND TRIM(sp.division) = TRIM($2)`;
      params.push(division);
    }

    if (req.query.district) {
      query += ` AND TRIM(sp.district) = TRIM($${params.length + 1})`;
      params.push(req.query.district);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Jurisdiction Projects Error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
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
SELECT * FROM engineer_form WHERE school_id = $1 ORDER BY created_at DESC
  `;
    const result = await pool.query(query, [schoolId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// --- 30. GET: Leaderboard Data ---
app.get('/api/leaderboard', async (req, res) => {
  const { scope, filter } = req.query; // scope: 'region' (for RO) or 'division' (for SDO/Head)
  try {
    let whereClause = '';
    let params = [];

    if (scope === 'division') {
      whereClause = 'WHERE division = $1';
      params.push(filter);
    } else if (scope === 'region') {
      whereClause = 'WHERE region = $1';
      params.push(filter);
    }

    const calculation = `COALESCE(psc.total_completion, 0)`;

    let query = '';

    if (scope === 'national') {
      // Aggregate by Region
      query = `
        SELECT sp.region as name,
        CAST(AVG(${calculation}) AS DECIMAL(10,1)) as avg_completion
        FROM school_profiles sp
        LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1)
        WHERE sp.region IS NOT NULL
        GROUP BY sp.region
        ORDER BY avg_completion DESC
      `;
    } else if (scope === 'national_divisions') {
      // Aggregate by Division (National)
      query = `
        SELECT sp.division as name, sp.region,
        CAST(AVG(${calculation}) AS DECIMAL(10,1)) as avg_completion
        FROM school_profiles sp
        LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1)
        WHERE sp.division IS NOT NULL
        GROUP BY sp.division, sp.region
        ORDER BY avg_completion DESC
      `;
    } else {
      // School Level List (Division or Region Scope)
      query = `
        SELECT
        sp.school_id, sp.school_name, sp.division, sp.region,
        ${calculation} as completion_rate,
        sp.updated_at
        FROM school_profiles sp
        LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1)
        ${whereClause.replace('WHERE ', 'WHERE sp.')}
        ORDER BY completion_rate DESC, sp.updated_at DESC
      `;
    }

    const result = await pool.query(query, params);

    let responseData = {};

    if (scope === 'national') {
      responseData = { regions: result.rows };
    } else if (scope === 'national_divisions') {
      responseData = { divisions: result.rows };
    } else {
      responseData = { schools: result.rows };
      // Calculate Division Averages if requesting Regional View
      if (scope === 'region') {
        const divMap = {};
        result.rows.forEach(s => {
          if (!divMap[s.division]) divMap[s.division] = { name: s.division, total: 0, count: 0 };
          divMap[s.division].total += parseFloat(s.completion_rate);
          divMap[s.division].count++;
        });
        responseData.divisions = Object.values(divMap).map(d => ({
          name: d.name,
          avg_completion: (d.total / d.count).toFixed(1)
        })).sort((a, b) => b.avg_completion - a.avg_completion);
      }
    }

    res.json(responseData);
  } catch (err) {
    console.error("Leaderboard Error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// --- 30c. GET: Activity Data for Individual School Snapshot ---
app.get('/api/schools/:schoolId/activity', async (req, res) => {
  const { schoolId } = req.params;
  try {
    // Shared completion calculation logic (aligned with leaderboard)
    const calculation = `COALESCE(psc.total_completion, 0)`;

    // Fetch the school's own performance context
    const profileRes = await pool.query(`
        SELECT sp.school_name, sp.division, sp.region, ${calculation} as percentage, psc.* 
        FROM school_profiles sp 
        LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1)
        WHERE sp.school_id = $1
    `, [schoolId]);

    const school = profileRes.rows[0] || { name: 'My School', percentage: 0, division: '', region: '' };
    const percentage = Math.round(parseFloat(school.percentage || 0));

    // Comparative Stats for the Chart
    const compQuery = `
      SELECT 'District' as name, AVG(${calculation}) as completed FROM school_profiles sp LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1) WHERE sp.division = $1
      UNION ALL
      SELECT 'My School' as name, ${percentage} as completed
      UNION ALL
      SELECT 'Division' as name, AVG(${calculation}) as completed FROM school_profiles sp LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1) WHERE sp.region = $2
    `;
    const compRes = await pool.query(compQuery, [school.division, school.region]);

    // Progress Flags (Modular Beta)
    const modularRes = await pool.query('SELECT total_enrollment, enroll_kinder, verified_as_of FROM ph_schools WHERE school_id = $1', [schoolId]);
    const m = modularRes.rows[0] || {};
    
    // Construct response
    res.json({
      success: true,
      data: {
        progress: {
          percentage,
          completedUnits: Math.floor(percentage / (100 / 8)),
          totalUnits: 8,
          flags: {
            unit1: !!profileRes.rows[0]?.unit1_completion,
            unit2: !!profileRes.rows[0]?.unit2_completion,
            unit3: !!profileRes.rows[0]?.unit3_completion,
            unit4: !!profileRes.rows[0]?.unit4_completion,
            unit5: !!profileRes.rows[0]?.unit5_completion,
            unit6: !!profileRes.rows[0]?.unit6_completion,
            unit7: !!profileRes.rows[0]?.unit7_completion,
            unit8: !!profileRes.rows[0]?.unit8_completion
          }
        },
        gamification: {
            fastest_sprint: { unit: 1, time_text: '1h 20m' } // Mocked for now
        },
        comparative: compRes.rows.map(r => ({ name: r.name, completed: Math.round(parseFloat(r.completed || 0)) }))
      }
    });
  } catch (err) {
    console.error("Activity API Error:", err);
    res.status(500).json({ error: "Failed to fetch activity dashboard data" });
  }
});

// --- 30d. POST: Sync Quest Progress ---
app.post('/api/user/progress', async (req, res) => {
    const { unitId, schoolId } = req.body;
    try {
        console.log(`[Sync] Updating progress for Unit ${unitId} in School ${schoolId}`);
        
        const iernRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
        if (iernRes.rows.length > 0 && iernRes.rows[0].iern) {
            const iern = iernRes.rows[0].iern;
            const unitCol = `unit${unitId}_completion`;
            
            // 1. Update Unit Flag
            await pool.query(`
                INSERT INTO ph_school_completion (iern, ${unitCol})
                VALUES ($1, true)
                ON CONFLICT (iern) DO UPDATE SET ${unitCol} = true, updated_at = CURRENT_TIMESTAMP
            `, [iern]);

            // 2. Recalculate Total Completion
            await updateSchoolTotalCompletion(iern);
        }

        // Log it to activity log so it counts towards 'recent activity'
        await pool.query('INSERT INTO audit_logs (school_id, action, details) VALUES ($1, $2, $3)', 
            [schoolId, 'UNIT_COMPLETE', `Completed Unit ${unitId}`]);
            
        res.json({ success: true });
    } catch (err) {
        console.error("Sync Progress Error:", err);
        res.status(500).json({ error: "Failed to sync progress" });
    }
});

// --- 30e. PUT: Generic Modular Unit Update ---
// Handles Unit 3-9 which send various JSON payloads to school_profiles
app.put('/api/ph_schools/:schoolId', async (req, res) => {
    const { schoolId } = req.params;
    const data = req.body;
    try {
        // Dynamically build update based on keys provided
        const keys = Object.keys(data).filter(k => k !== 'school_id' && k !== 'unit7_completed' && k !== 'is_modular');
        if (keys.length === 0) return res.json({ success: true });

        const setClause = keys.map((k, i) => `${k} = $${i+2}`).join(', ');
        const values = [schoolId, ...keys.map(k => data[k])];

        await pool.query(`UPDATE school_profiles SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE school_id = $1`, values);
        
        // Update Progress Tracking if unitId provided
        if (data.unitId) {
            const iernRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
            if (iernRes.rows.length > 0 && iernRes.rows[0].iern) {
                const iern = iernRes.rows[0].iern;
                const unitCol = `unit${data.unitId}_completion`;
                await pool.query(`
                    INSERT INTO ph_school_completion (iern, school_id, ${unitCol})
                    VALUES ($1, $2, true)
                    ON CONFLICT (iern) DO UPDATE SET ${unitCol} = true, school_id = EXCLUDED.school_id, updated_at = CURRENT_TIMESTAMP
                `, [iern, schoolId]);
                await updateSchoolTotalCompletion(iern);
            }
        }

        // Also ensure record exists in ph_schools for secondary sync
        await pool.query('INSERT INTO ph_schools (school_id) VALUES ($1) ON CONFLICT (school_id) DO NOTHING', [schoolId]);

        res.json({ success: true, message: "Modular unit data synced successfully" });
    } catch (err) {
        console.error("Modular Sync Error:", err);
        res.status(500).json({ error: "Failed to sync modular data" });
    }
});

// --- 30b. GET: Aggregated Regional Stats (For Central Office) ---
// --- 30b. GET: Aggregated Regional Stats (For Central Office) ---
app.get('/api/monitoring/regions', async (req, res) => {
  try {
    const query = `
      WITH school_stats AS (
        SELECT 
          region,
          COUNT(*) as total_schools,
          COUNT(CASE WHEN total_enrollment > 0 THEN 1 END) as with_enrollment,
          COUNT(CASE WHEN head_last_name IS NOT NULL THEN 1 END) as with_head,
          SUM(CASE WHEN psc.total_completion = 100 THEN 1 ELSE 0 END) as completed_schools
        FROM school_profiles sp
        LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1)
        GROUP BY region
      ),
      project_stats AS (
        SELECT 
          region,
          COUNT(*) as total_projects,
          COALESCE(SUM(project_allocation), 0) as total_allocation,
          AVG(accomplishment_percentage) as avg_accomplishment,
          -- Distinct Counts for New Logic (Robust Matching)
          COUNT(CASE WHEN TRIM(status) ILIKE 'Ongoing' THEN 1 END) as ongoing_projects,
          COUNT(CASE WHEN TRIM(status) ILIKE 'Not Yet Started' THEN 1 END) as not_yet_started_projects,
          COUNT(CASE WHEN TRIM(status) ILIKE '%Under Procurement%' THEN 1 END) as under_procurement_projects,
          COUNT(CASE WHEN TRIM(status) ILIKE 'Completed' THEN 1 END) as completed_projects,
          COUNT(CASE WHEN TRIM(status) ILIKE 'Delayed' THEN 1 END) as delayed_projects
        FROM engineer_form
        GROUP BY region
      )
      SELECT 
        s.region,
        COALESCE(s.total_schools, 0) as total_schools,
        COALESCE(s.with_enrollment, 0) as with_enrollment,
        COALESCE(s.with_head, 0) as with_head,
        COALESCE(s.completed_schools, 0) as completed_schools,
        
        COALESCE(p.total_projects, 0) as total_projects,
        COALESCE(p.total_allocation, 0) as total_allocation,
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
    console.error("Regional Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch regional stats" });
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

  } catch (err) {
    console.error("Save Learner Stats Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- 28. GET: Fetch Quest Progress (Modular Beta) ---
app.get('/api/ph_schools/progress/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query(`
      SELECT psc.* 
      FROM ph_school_completion psc
      JOIN ph_schools ps ON ps.iern = psc.iern
      WHERE ps.school_id = $1
    `, [schoolId]);

    let completedUnits = [];
    let xp = 0;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      if (row.unit1_completion) { completedUnits.push(1); xp += 150; }
      if (row.unit2_completion) { completedUnits.push(2); xp += 200; }
      if (row.unit3_completion) { completedUnits.push(3); xp += 250; }
      if (row.unit4_completion) { completedUnits.push(4); xp += 300; }
      if (row.unit5_completion) { completedUnits.push(5); xp += 350; }
      if (row.unit6_completion) { completedUnits.push(6); xp += 400; }
      if (row.unit7_completion) { completedUnits.push(7); xp += 450; }
      if (row.unit8_completion) { completedUnits.push(8); xp += 500; }
    } else {
        // Fallback: If no progress record, Unit 1 is technically done once a school exists in ph_schools
        const schoolCheck = await pool.query('SELECT 1 FROM ph_schools WHERE school_id = $1', [schoolId]);
        if (schoolCheck.rows.length > 0) {
            completedUnits.push(1);
            xp += 150;
        }
    }

    res.json({ success: true, progress: { completedUnits, xp } });
  } catch (err) {
    console.error("Fetch Quest Progress Error:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// --- 29. GET: Fetch School Details by ID (Modular Beta) ---
app.get('/api/ph_schools/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM ph_schools WHERE school_id = $1', [schoolId]);
    if (result.rows.length === 0) {
      return res.json({ exists: false });
    }
    res.json({ exists: true, data: result.rows[0] });
  } catch (err) {
    console.error("Fetch School Details Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- 30. POST: Save Unit 1 School Identity Data (Modular Beta) ---
app.post('/api/ph_schools/unit1', async (req, res) => {
  const data = req.body;
  try {
    const query = `
      INSERT INTO ph_schools (
        school_id, iern, school_name, region, province, division, district, 
        municipality, barangay, leg_district, curricular_offering,
        school_head, contact_number, ownership, ownership_document_type,
        google_drive_link, google_drive_file_id, google_drive_file_name,
        google_drive_thumbnail_url, school_type, mother_school_id,
        extension_mother_school_name, established_month, established_year,
        head_first_name, head_middle_name, head_last_name, head_sex,
        head_position_title, head_date_hired, local_file_path, local_file_name, local_file_size,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, CURRENT_TIMESTAMP
      )
      ON CONFLICT (school_id) DO UPDATE SET
        iern = EXCLUDED.iern,
        school_name = EXCLUDED.school_name,
        region = EXCLUDED.region,
        province = EXCLUDED.province,
        division = EXCLUDED.division,
        district = EXCLUDED.district,
        municipality = EXCLUDED.municipality,
        barangay = EXCLUDED.barangay,
        leg_district = EXCLUDED.leg_district,
        curricular_offering = EXCLUDED.curricular_offering,
        school_head = EXCLUDED.school_head,
        contact_number = EXCLUDED.contact_number,
        ownership = EXCLUDED.ownership,
        ownership_document_type = EXCLUDED.ownership_document_type,
        google_drive_link = EXCLUDED.google_drive_link,
        google_drive_file_id = EXCLUDED.google_drive_file_id,
        google_drive_file_name = EXCLUDED.google_drive_file_name,
        google_drive_thumbnail_url = EXCLUDED.google_drive_thumbnail_url,
        school_type = EXCLUDED.school_type,
        mother_school_id = EXCLUDED.mother_school_id,
        extension_mother_school_name = EXCLUDED.extension_mother_school_name,
        established_month = EXCLUDED.established_month,
        established_year = EXCLUDED.established_year,
        head_first_name = EXCLUDED.head_first_name,
        head_middle_name = EXCLUDED.head_middle_name,
        head_last_name = EXCLUDED.head_last_name,
        head_sex = EXCLUDED.head_sex,
        head_position_title = EXCLUDED.head_position_title,
        head_date_hired = EXCLUDED.head_date_hired,
        local_file_path = EXCLUDED.local_file_path,
        local_file_name = EXCLUDED.local_file_name,
        local_file_size = EXCLUDED.local_file_size,
        updated_at = CURRENT_TIMESTAMP;
    `;
    const values = [
      data.school_id, data.iern || null, data.school_name, data.region, data.province, data.division, data.district,
      data.municipality, data.barangay, data.leg_district, data.curricular_offering,
      valueOrNull(data.school_head), valueOrNull(data.contact_number), valueOrNull(data.ownership), valueOrNull(data.ownership_document_type),
      valueOrNull(data.google_drive_link), valueOrNull(data.google_drive_file_id), valueOrNull(data.google_drive_file_name),
      valueOrNull(data.google_drive_thumbnail_url), valueOrNull(data.school_type), valueOrNull(data.mother_school_id),
      valueOrNull(data.extension_mother_school_name), valueOrNull(data.established_month), valueOrNull(data.established_year),
      valueOrNull(data.head_first_name), valueOrNull(data.head_middle_name), valueOrNull(data.head_last_name), valueOrNull(data.head_sex),
      valueOrNull(data.head_position_title), valueOrNull(data.head_date_hired), valueOrNull(data.local_file_path), valueOrNull(data.local_file_name), parseIntOrNull(data.local_file_size)
    ];
    await pool.query(query, values);

    // Update Completion Table for Unit 1
    if (data.iern) {
        await pool.query(`
            INSERT INTO ph_school_completion (iern, school_id, unit1_completion)
            VALUES ($1, $2, true)
            ON CONFLICT (iern) DO UPDATE SET unit1_completion = true, school_id = EXCLUDED.school_id, updated_at = CURRENT_TIMESTAMP
        `, [data.iern, data.school_id]);
        await updateSchoolTotalCompletion(data.iern);
    }

    res.json({ success: true, message: "Unit 1 saved successfully!" });
  } catch (err) {
    console.error("Save Unit 1 Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- 27. PUT: Save Unit 2 Learner Data (Modular Beta) ---
app.put('/api/ph_schools/unit2/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  const data = req.body;

  try {
    // We expect { unit2_simplified_enrollment: { array: [...], questionnaire: {} }, sned_self_contained_count: N }
    const rawData = data.unit2_simplified_enrollment || {};
    const simplifiedData = Array.isArray(rawData) ? rawData : (rawData.array || []);
    
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
        totalM += m;
        totalF += f;
        if (enrollmentByGrade[item.grade_level] !== undefined) {
            enrollmentByGrade[item.grade_level] = total;
        }
    });

    if (!Array.isArray(rawData) && rawData.questionnaire && rawData.questionnaire.genderTotals) {
        totalM = parseInt(rawData.questionnaire.genderTotals.male) || 0;
        totalF = parseInt(rawData.questionnaire.genderTotals.female) || 0;
    }

    // Correctly calculate global total based on SNED program type
    // Mainstreamed SNED learners are already in totalM/totalF, so they are excluded here to avoid double counting.
    const snedCount = (data.has_sned && data.sned_program_type === 'Self-Contained') 
        ? (parseInt(data.sned_total_count) || 0) 
        : 0;

    const globalTotal = totalM + totalF + snedCount;

    const fields = [
      'enroll_kinder = $1', 'enroll_g1 = $2', 'enroll_g2 = $3', 'enroll_g3 = $4',
      'enroll_g4 = $5', 'enroll_g5 = $6', 'enroll_g6 = $7', 'total_enrollment = $8',
      'male_enrollment = $9', 'female_enrollment = $10', 
      'sned_self_contained_count = $11',
      'unit2_simplified_enrollment = $12',
      'verified_as_of = CURRENT_TIMESTAMP'
    ];

    const values = [
      enrollmentByGrade.kinder, enrollmentByGrade.g1, enrollmentByGrade.g2, enrollmentByGrade.g3,
      enrollmentByGrade.g4, enrollmentByGrade.g5, enrollmentByGrade.g6, globalTotal,
      totalM, totalF,
      parseInt(sned_self_contained_count) || 0,
      JSON.stringify(rawData),
      schoolId // $13
    ];

    const query = `UPDATE ph_schools SET ${fields.join(', ')} WHERE school_id = $13`;

    await pool.query(query, values);

    // Update Progress in ph_school_completion
    const iernRes = await pool.query('SELECT iern FROM ph_schools WHERE school_id = $1', [schoolId]);
    if (iernRes.rows.length > 0 && iernRes.rows[0].iern) {
        const iern = iernRes.rows[0].iern;
        await pool.query(`
            INSERT INTO ph_school_completion (iern, school_id, unit2_completion)
            VALUES ($1, $2, true)
            ON CONFLICT (iern) DO UPDATE SET unit2_completion = true, school_id = EXCLUDED.school_id, updated_at = CURRENT_TIMESTAMP
        `, [iern, schoolId]);
        await updateSchoolTotalCompletion(iern);
    }

    res.json({ success: true, message: "Unit 2 Learner data saved successfully!" });

  } catch (err) {
    console.error("Save Unit 2 Learner Data Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- 26. GET: Fetch IERN Data ---
app.get('/api/schools_iern/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM schools_IERN WHERE school_id = $1', [schoolId]);

    if (result.rows.length > 0) {
      res.json({ exists: true, data: result.rows[0] });
    } else {
      res.status(404).json({ exists: false, error: 'IERN data not found for this school ID.' });
    }
  } catch (err) {
    console.error("Fetch IERN Data Error:", err);
    res.status(500).json({ error: "Fetch failed" });
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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

// ==================================================================
//                        SERVER STARTUP
// ==================================================================

// 1. FOR LOCAL DEVELOPMENT (runs when you type 'node api/index.js')


// Robust path comparison for Windows
// Robust path comparison for Windows
const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1];

console.log("Startup Check:");
console.log("  Executed:", executedFile);
console.log("  Current: ", currentFile);

/* 
   ON WINDOWS:
   Executed: E:\InsightEd-Mobile-PWA\api\index.js
   Current:  e:\InsightEd-Mobile-PWA\api\index.js
   
   Note the case difference (E: vs e:). 
   path.resolve() adjusts slashes but DOES NOT fix drive letter case on all Node versions.
   We will normalize to lowercase for comparison.
*/
const isMainModule = path.resolve(executedFile).toLowerCase() === path.resolve(currentFile).toLowerCase();

// --- 1. GLOBAL ERROR HANDLERS TO PREVENT SILENT CRASHES ---
// ==================================================================
//         CHUNKED PDF UPLOAD ROUTES
// ==================================================================

// 1. Receive and store a single binary chunk
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

      const chunkDir = path.join(__dirname, 'tmp_chunks', fileUUID);
      if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true });
      }

      const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
      const writeStream = fs.createWriteStream(chunkPath);
      file.pipe(writeStream);

      writeStream.on('finish', () => {
        res.status(200).json({ success: true, chunkIndex });
      });

      writeStream.on('error', (err) => { throw err; });
    } catch (err) {
      console.error('❌ Chunk Upload Error:', err.message);
      res.status(500).json({ error: 'Chunk upload failed' });
    }
  });

  bb.on('error', (err) => {
    console.error('Busboy error:', err);
    res.status(500).send('Upload Failed');
  });

  req.pipe(bb);
});

// 2. Finalize multipart upload — concatenate chunks → compress at 96 DPI → store as file
app.post('/api/upload/multipart-finalize', async (req, res) => {
  const { fileUUID, totalChunks, contentType } = req.body;
  if (!fileUUID || !totalChunks) return res.status(400).json({ error: "Missing required metadata" });

  const chunkDir = path.join(__dirname, 'tmp_chunks', fileUUID);
  let tempInput = null;

  try {
    if (!fs.existsSync(chunkDir)) throw new Error("Chunk directory not found");

    const chunkBuffers = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) throw new Error(`Missing chunk ${i}`);
      chunkBuffers.push(fs.readFileSync(chunkPath));
    }
    const finalBuffer = Buffer.concat(chunkBuffers);

    // Attempt compression via centralized helper
    const isPdf = (contentType || '').includes('pdf') || finalBuffer.slice(0, 4).toString() === '%PDF';
    if (isPdf) {
      const filePath = await compressDocument(finalBuffer, 'CHUNKED_MULTIPART');
      fs.rmSync(chunkDir, { recursive: true, force: true });
      return res.status(200).json({ success: true, url: filePath });
    }

    // Default: Fallback to base64 ONLY if not a PDF (e.g. some other small binary)
    const dataUrl = `data:${contentType || 'application/octet-stream'};base64,${finalBuffer.toString('base64')}`;
    fs.rmSync(chunkDir, { recursive: true, force: true });
    res.status(200).json({ success: true, url: dataUrl });
  } catch (err) {
    console.error('❌ Finalize Error:', err.message);
    res.status(500).json({ error: "Failed to merge chunk blocks" });
  } finally {
    if (tempInput && fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (fs.existsSync(chunkDir)) fs.rmSync(chunkDir, { recursive: true, force: true });
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

// Always start if strictly detected as main, OR if explicitly forced by env (fallback)
if (isMainModule || process.env.START_SERVER === 'true') {
  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, () => {
    console.log(`\n================================================`);
    console.log(`🚀 SERVER RUNNING - PID: ${process.pid}`);
    console.log(`🚀 Port: ${PORT}`);
    console.log(`🚀 Time: ${new Date().toLocaleString()}`);
    console.log(`================================================\n`);
  });

  // Hardened timeouts for large PDF uploads (10 minutes)
  server.timeout = 600000;
  server.keepAliveTimeout = 610000;
  server.headersTimeout = 620000;

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use! Please close the other process or use a different port.`);
    } else {
      console.error("❌ Server Error:", e);
    }
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
}

// 2. FOR VERCEL (Production)
// Export default is required for ESM in Vercel
export default app;
