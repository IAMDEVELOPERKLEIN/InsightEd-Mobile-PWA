import admin from 'firebase-admin';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
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

const DEFAULT_PASSWORD = 'InSightEd@2024';

const engineerData = {
    name: 'Jonathan Narvato',
    email: 'jonathan.narvato@deped.gov.ph',
    region: 'Region V',
    division: 'Camarines Sur',
    role: 'Division Engineer'
};

async function addEngineer() {
    console.log(`\n🚀 Processing: ${engineerData.name} (${engineerData.email})...`);
    let uid;

    // STEP A: Firebase Auth Create/Lookup
    try {
        const fbUser = await admin.auth().createUser({
            email: engineerData.email,
            password: DEFAULT_PASSWORD,
            displayName: engineerData.name
        });
        uid = fbUser.uid;
        console.log(`✅ Firebase Auth Account Created: ${uid}`);
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            const fbUser = await admin.auth().getUserByEmail(engineerData.email);
            uid = fbUser.uid;
            console.log(`ℹ️ User already exists in Firebase Auth: ${uid}`);
        } else {
            console.error(`❌ Firebase Auth Error:`, err.message);
            process.exit(1);
        }
    }

    // STEP B: Firestore Sync
    try {
        const names = engineerData.name.split(' ');
        const firstName = names[0];
        const lastName = names.slice(1).join(' ') || '';

        await admin.firestore().collection('users').doc(uid).set({
            email: engineerData.email,
            role: engineerData.role,
            firstName,
            lastName,
            region: engineerData.region,
            division: engineerData.division,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`✅ Firestore User Profile Synced.`);
    } catch (err) {
        console.error(`❌ Firestore Sync Error:`, err.message);
    }

    // STEP C: Sync to Postgres "users" table
    const userSql = `
        INSERT INTO users (
            uid, email, role, created_at,
            first_name, last_name,
            region, division
        ) VALUES (
            $1, $2, $3, CURRENT_TIMESTAMP,
            $4, $5, $6, $7
        )
        ON CONFLICT (uid) DO UPDATE SET
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            region = EXCLUDED.region,
            division = EXCLUDED.division
    `;
    const names = engineerData.name.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    try {
        await pool.query(userSql, [
            uid, engineerData.email, engineerData.role,
            firstName, lastName, engineerData.region, engineerData.division
        ]);
        console.log(`✅ Postgres User Profile Synced.`);
    } catch (err) {
        console.error(`❌ Postgres Sync Error:`, err.message);
    }

    // STEP D: Link Projects in engineer_form
    try {
        const projectRes = await pool.query(
            "UPDATE engineer_form SET engineer_id = $1 WHERE engineer_name = $2 AND engineer_id IS NULL",
            [uid, engineerData.name]
        );
        console.log(`✅ Linked ${projectRes.rowCount} projects to this engineer.`);
    } catch (err) {
        console.error(`❌ Project Linking Error:`, err.message);
    }

    console.log(`\n--- REGISTRATION COMPLETE ---`);
    console.log(`Email: ${engineerData.email}`);
    console.log(`Default Password: ${DEFAULT_PASSWORD}`);

    await pool.end();
    process.exit(0);
}

addEngineer().catch(err => {
    console.error("Registration failed:", err);
    process.exit(1);
});
