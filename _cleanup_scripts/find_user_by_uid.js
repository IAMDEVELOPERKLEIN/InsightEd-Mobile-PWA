
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findUserByUid() {
  try {
    const targetUid = 'xyxbCx7ebGaiceHmD2MvCozK63k1';
    console.log(`Searching for user with UID: ${targetUid}`);
    const res = await pool.query("SELECT uid, email, role, first_name FROM users WHERE uid = $1", [targetUid]);
    
    if (res.rows.length > 0) {
      const u = res.rows[0];
      console.log(`Found User: Email=${u.email}, Role=${u.role}, Name=${u.first_name}`);
    } else {
      console.log("No user found with that UID.");
      
      console.log("\nChecking for similar UIDs (starts with xyxbCx7eb)...");
      const res2 = await pool.query("SELECT uid, email FROM users WHERE uid LIKE 'xyxbCx7eb%'");
      res2.rows.forEach(r => console.log(` - UID: ${r.uid}, Email: ${r.email}`));
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

findUserByUid();
