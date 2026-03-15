
import admin from 'firebase-admin';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import dotenv from 'dotenv';
dotenv.config();

// Try to initialize firebase-admin using same logic as backend
async function checkFirebase() {
    try {
        if (!admin.apps.length) {
            const serviceAccount = require("../service-account.json");
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        const email = 'jocelyn.gentapa001@deped.gov.ph';
        console.log(`Checking Firebase for: ${email}`);
        
        const user = await admin.auth().getUserByEmail(email);
        console.log("Firebase User found:", user.uid);
        
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            console.log("❌ User NOT found in Firebase.");
        } else {
            console.error("Firebase Error:", err.message);
        }
    }
}

checkFirebase();
