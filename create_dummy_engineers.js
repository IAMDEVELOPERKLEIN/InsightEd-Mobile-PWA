import admin from 'firebase-admin';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

dotenv.config();

// Robust .env parsing for UTF-16LE support (matching api/index.js logic)
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
    try {
        let envContent = fs.readFileSync('.env', 'utf16le');
        let match = envContent.match(/DATABASE_URL=(.+)/);
        if (!match) {
            envContent = fs.readFileSync('.env', 'utf8');
            match = envContent.match(/DATABASE_URL=(.+)/);
        }
        if (match) {
            dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
        }
    } catch (e) {
        console.error("⚠️ Failed to manually parse .env:", e.message);
    }
}

const { Pool } = pg;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl && dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

if (!admin.apps.length) {
    const serviceAccount = require("./service-account.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function createEngineers() {
    const regions = ["Region I", "Region II", "Region III", "Region IV-A", "Region V"];
    const divisions = ["PANGASINAN", "CAGAYAN", "PAMPANGA", "LAGUNA", "ALBAY"];
    const credentials = [];

    console.log("🚀 Starting dummy account creation...");

    for (let i = 0; i < 5; i++) {
        const email = `dummy_eng_${Math.random().toString(36).substring(7)}@deped.gov.ph`;
        const password = 'DummyPassword123!';
        const firstName = `Dummy${i + 1}`;
        const lastName = `Engineer`;
        const region = regions[i % regions.length];
        const division = divisions[i % divisions.length];

        try {
            // 1. Create Firebase Auth User
            const userRecord = await admin.auth().createUser({
                email,
                password,
                displayName: `${firstName} ${lastName}`
            });
            const uid = userRecord.uid;

            // 2. Create Firestore Document
            await db.collection('users').doc(uid).set({
                email,
                role: 'Division Engineer',
                firstName,
                lastName,
                region,
                division,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 3. Create PostgreSQL Record
            await pool.query(
                `INSERT INTO users (uid, email, role, first_name, last_name, region, division, contact_number) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [uid, email, 'Division Engineer', firstName, lastName, region, division, '0912345678' + i]
            );

            credentials.push({ email, password, region, division });
            console.log(`✅ Created: ${email} (${uid})`);

        } catch (error) {
            console.error(`❌ Error creating account ${i + 1}:`, error.message);
        }
    }

    await pool.end();
    console.log("\n✨ Finished creating dummy accounts.");
    console.log("\nCREDENTIALS LIST:");
    console.table(credentials);

    // Save credentials to a temporary file for easy access
    fs.writeFileSync('dummy_credentials.json', JSON.stringify(credentials, null, 2));
}

createEngineers();
