import XLSX from 'xlsx';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// --- ROBUST ENV PARSING ---
dotenv.config();
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
    try {
        let envContent = fs.readFileSync('.env', 'utf16le');
        let match = envContent.match(/DATABASE_URL=(.+)/);
        if (!match) {
            envContent = fs.readFileSync('.env', 'utf8');
            match = envContent.match(/DATABASE_URL=(.+)/);
        }
        if (match) dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
    } catch (e) { console.error("Failed to parse .env", e.message); }
}
if (!dbUrl) dbUrl = 'postgres://postgres:password@localhost:5432/postgres';

const { Pool } = pg;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

// --- FIREBASE ADMIN INIT ---
const serviceAccount = require("../service-account.json");
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const firestore = admin.firestore();
const DEFAULT_PASSWORD = 'InSightEd@2024';

async function runImport() {
    const filePath = path.resolve('public/LMS-CY-2024-SAVINGS-DATABASED-as-of-March 3,UPDATED.xlsx');
    console.log(`Reading Excel: ${filePath}`);

    const workbook = XLSX.readFile(filePath);
    const sheetName = 'LMS 2024';
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { range: 6 });

    // 1. Extract Unique Engineers
    const engineers = new Map(); // Name -> { email, contact, division, region }
    for (const row of rawData) {
        const name = (row['Division Engineer'] || '').trim();
        const email = (row['Email Address'] || '').trim();
        const contact = (row['Cellphone Number'] || '').trim();
        const division = (row['Division'] || '').trim();
        const region = (row['Region'] || '').trim();

        if (name && email && email.includes('@')) {
            if (!engineers.has(name)) {
                engineers.set(name, { email, contact, division, region });
            }
        }
    }

    console.log(`Found ${engineers.size} unique engineers to register.`);

    for (const [name, info] of engineers.entries()) {
        console.log(`\nProcessing: ${name} (${info.email})...`);
        let uid;

        // STEP A: Firebase Auth Create/Lookup
        try {
            const fbUser = await admin.auth().createUser({
                email: info.email,
                password: DEFAULT_PASSWORD,
                displayName: name
            });
            uid = fbUser.uid;
            console.log(`✅ Firebase Account Created: ${uid}`);
        } catch (err) {
            // Log full error code if it's not the one we expect
            if (err.code === 'auth/email-already-exists' || (err.errorInfo && err.errorInfo.code === 'auth/email-already-exists')) {
                const fbUser = await admin.auth().getUserByEmail(info.email);
                uid = fbUser.uid;
                console.log(`ℹ️ User already exists in Firebase Auth: ${uid}`);
            } else {
                console.error(`❌ Firebase Error for ${name}:`, err.code, err.message);
                // Try recovery even if code didn't match perfectly but message did
                if (err.message.includes('already in use')) {
                    const fbUser = await admin.auth().getUserByEmail(info.email);
                    uid = fbUser.uid;
                    console.log(`ℹ️ Recovered UID by email: ${uid}`);
                } else {
                    continue;
                }
            }
        }

        // STEP B: Sync to Firestore (Mandatory for frontend)
        const names = name.split(' ');
        const firstName = names[0];
        const lastName = names.slice(1).join(' ') || '';

        try {
            await firestore.collection('users').doc(uid).set({
                email: info.email,
                role: 'Division Engineer',
                firstName: firstName,
                lastName: lastName,
                authProvider: "email",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                region: info.region,
                division: info.division,
                contactNumber: info.contact
            }, { merge: true });
            console.log(`✅ Firestore Profile Synced.`);
        } catch (err) {
            console.error(`❌ Firestore Error for ${name}:`, err.message);
        }

        // STEP C: Sync to Postgres "users" table
        const userSql = `
            INSERT INTO users (
                uid, email, role, created_at,
                first_name, last_name,
                region, division, contact_number
            ) VALUES (
                $1, $2, $3, CURRENT_TIMESTAMP,
                $4, $5, $6, $7, $8
            )
            ON CONFLICT (uid) DO UPDATE SET
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                region = EXCLUDED.region,
                division = EXCLUDED.division,
                contact_number = EXCLUDED.contact_number
        `;

        try {
            await pool.query(userSql, [
                uid, info.email, 'Division Engineer',
                firstName, lastName, info.region, info.division, info.contact
            ]);
            console.log(`✅ Postgres User Profile Synced.`);
        } catch (err) {
            console.error(`❌ Postgres Sync Error for ${name}:`, err.message);
        }

        // STEP D: Link Projects in engineer_form
        try {
            const projectRes = await pool.query(
                "UPDATE engineer_form SET engineer_id = $1 WHERE (engineer_name = $2 OR engineer_name = $3) AND engineer_id IS NULL",
                [uid, name, name.replace('Ar. ', '').replace('Engr. ', '')]
            );
            console.log(`✅ Linked ${projectRes.rowCount} projects to this engineer.`);
        } catch (err) {
            console.error(`❌ Project Linking Error for ${name}:`, err.message);
        }
    }

    console.log(`\n--- ENGINEER IMPORT COMPLETE ---`);
    console.log(`Default Password for all: ${DEFAULT_PASSWORD}`);
    process.exit(0);
}

runImport().catch(err => {
    console.error("Import failed:", err);
    process.exit(1);
});
