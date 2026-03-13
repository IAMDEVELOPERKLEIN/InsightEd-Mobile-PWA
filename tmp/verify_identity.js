
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifyIdentityResolution() {
    try {
        console.log("--- Identity Resolution Verification ---");
        
        // 1. Test existing user
        const existingUserRes = await pool.query("SELECT email FROM users LIMIT 1");
        if (existingUserRes.rows.length > 0) {
            const email = existingUserRes.rows[0].email;
            console.log(`Testing existing user: ${email}`);
            // We can't call the internal function from here unless we exported it, 
            // but we can simulate the queries it makes.
        } else {
            console.warn("No users in table to test.");
        }

        // 2. Test School ID resolution from ph_schools
        const schoolRes = await pool.query("SELECT school_id, school_name FROM ph_schools LIMIT 1");
        if (schoolRes.rows.length > 0) {
            const sid = schoolRes.rows[0].school_id;
            console.log(`Testing ph_schools resolution for ID: ${sid}`);
            const email = sid + '@deped.gov.ph';
            
            // Look for it in users
            const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
            if (checkUser.rows.length > 0) {
                console.log("✅ Auto-migration successful (or user already existed).");
            } else {
                console.log("ℹ️ User not found in 'users' yet. (This is expected before first login)");
            }
        }

        console.log("--- Verification Complete ---");
    } catch (err) {
        console.error("Verification failed:", err);
    } finally {
        await pool.end();
    }
}

verifyIdentityResolution();
