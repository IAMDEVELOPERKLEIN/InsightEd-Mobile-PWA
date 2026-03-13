
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUser() {
    const schoolId = '119154';
    try {
        console.log(`Checking School ID: ${schoolId}`);
        
        const usersRes = await pool.query("SELECT email, uid, role FROM users WHERE email LIKE $1", [`${schoolId}@%`]);
        console.log("Users Match:", usersRes.rows);
        
        const spRes = await pool.query("SELECT email, school_id, school_name FROM school_profiles WHERE school_id = $1", [schoolId]);
        console.log("School Profiles Match:", spRes.rows);
        
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await pool.end();
    }
}

checkUser();
