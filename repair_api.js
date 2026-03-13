import fs from 'fs';
import path from 'path';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the top (Prepend missing imports)
const topFix = `import dotenv from 'dotenv';
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin'; 
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initOtpTable, runMigrations } from './db_init.js';
import { fileURLToPath } from 'url';
import pathModule from 'path';
import fsModule from 'fs'; 
import csv from 'csv-parser'; 
import { BlobServiceClient } from '@azure/storage-blob'; 
import busboy from 'busboy'; 
import { createRequire } from "module"; 
const require = createRequire(import.meta.url);
import { exec } from 'child_process';
import { FirebaseScrypt } from 'firebase-scrypt'; 
import bcrypt from 'bcrypt'; 
import { teachChatbot, chatWithKnowledge, setPool, updateKnowledgeEntry, deleteKnowledgeEntry } from './chatbot.js';
import { v4 as uuidv4 } from 'uuid';
import { calculateRiskIndex } from './utils/safetyScore.js';
import { z } from 'zod'; 
import rateLimit from 'express-rate-limit'; 
import { initCache, cacheMiddleware } from './cache.js'; 

dotenv.config();

const transporter = nodemailer.createTransport({
`;

if (!content.includes("import dotenv from 'dotenv'")) {
    content = topFix + content;
    console.log("✅ Prepended imports");
}

// 2. Fix the middle (Forgot Password closure)
const middleSearch = '<p>Click the link below to verify your email and invoke the reset logic:</p>';
const middleFix = `                <p>Click the link below to verify your email and invoke the reset logic:</p>
                <a href="\${link}">Reset Password</a>
                <p>If you did not request this, please ignore this email.</p>
\`
    };
    await transporter.sendMail(mailOptions);
    console.log(\`✅ Password reset email sent\`);
    res.json({ success: true, message: "Reset link sent" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- MASTER PASSWORD ACCESS (Admin/Superuser) ---
app.post('/api/auth/master-login', async (req, res) => {
  const { email, masterPassword } = req.body;
  if (!email || !masterPassword) return res.status(400).json({ error: "Email and Master Password required." });
  try {
    const correctMasterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (!correctMasterPassword) return res.status(500).json({ error: "Master password not configured." });
    if (masterPassword !== correctMasterPassword) return res.status(403).json({ error: "Invalid master password." });

    let targetEmail = email.trim();
    let userData = null;

    if (!targetEmail.includes('@') && /^\\d+$/.test(targetEmail)) {
      const lookupResult = await pool.query(
        "SELECT email FROM users WHERE email LIKE $1 UNION SELECT email FROM school_profiles WHERE school_id = $2 AND email IS NOT NULL LIMIT 1",
        [\`\${targetEmail}@%\`, targetEmail]
      );
      targetEmail = lookupResult.rows.length > 0 ? lookupResult.rows[0].email : \`\${targetEmail}@deped.gov.ph\`;
    }

    const userRes = await pool.query(
      \`SELECT * FROM users WHERE LOWER(email) = LOWER($1) 
       OR uid IN (SELECT submitted_by FROM school_profiles WHERE email = $1 LIMIT 1)\`,
      [targetEmail]
    );

    if (userRes.rows.length > 0) {
      userData = userRes.rows[0];
    } else {
      const spRes = await pool.query('SELECT * FROM school_profiles WHERE LOWER(email) = LOWER($1) LIMIT 1', [targetEmail]);
      if (spRes.rows.length > 0) {
        userData = {
          uid: spRes.rows[0].submitted_by || uuidv4(),
          email: spRes.rows[0].email,
          role: 'school_head',
          first_name: spRes.rows[0].school_name,
          last_name: ''
        };
      } else {
        return res.status(404).json({ error: "User not found in Postgres registry." });
      }
    }

    const token = jwt.sign(
      { uid: userData.uid, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await pool.query(\`
      INSERT INTO activity_logs(user_uid, user_name, role, action_type, target_entity, details)
      VALUES($1, $2, $3, $4, $5, $6)
    \`, [
      userData.uid,
      \`\${userData.first_name || ''} \${userData.last_name || ''}\`.trim() || 'Master User',
      'MASTER_ACCESS',
      'MASTER_LOGIN',
      userData.email,
      \`Master login for \${userData.email}\`
    ]);

    res.json({ success: true, token, user: { uid: userData.uid, email: userData.email, role: userData.role } });
  } catch (error) {
    console.error("Master Login Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const normalizeOffering = (val) => {
`;

// Note: I'm very careful with line breaks and matching here.
// In the current broken state (Step 655):
// 3615:                 <p>Click the link below to verify your email and invoke the reset logic:</p>
// 3616:   const lower = String(val).toLowerCase().trim();

if (content.includes(middleSearch)) {
    // We want to replace from middleSearch UP TO the broken line.
    // However, string.replace with regex might be cleaner.
    const regex = new RegExp(middleSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\s*const lower = String\\(val\\)\\.toLowerCase\\(\\)\\.trim\\(\\);", "m");
    if (content.match(regex)) {
        content = content.replace(regex, middleFix + "  const lower = String(val).toLowerCase().trim();");
        console.log("✅ Fixed Forgot Password and Master Login");
    } else {
        console.log("⚠️ Middle fix regex did not match exactly. Trying simple replacement.");
        // Fallback: replace just the suspicious transition
        const fallbackSearch = middleSearch + "\n  const lower = String(val).toLowerCase().trim();";
        if (content.includes(fallbackSearch)) {
             content = content.replace(fallbackSearch, middleFix + "  const lower = String(val).toLowerCase().trim();");
             console.log("✅ Fixed Forgot Password (fallback)");
        }
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("🚀 api/index.js REPAIRED successfully!");
