
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function compare() {
  try {
    const userRes = await pool.query("SELECT uid FROM users WHERE email = 'john.christian.lareza@deped.gov.ph'");
    if (userRes.rows.length > 0) {
      const userUid = userRes.rows[0].uid;
      console.log(`User UID: ${userUid}`);
      
      const projRes = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id = $1", [userUid]);
      console.log(`Matching projects in engineer_form: ${projRes.rows[0].count}`);
      
      if (projRes.rows[0].count === '0') {
        process.stdout.write("\nNo projects match this UID exactly. Checking for partial matches or other engineers...\n");
        const allEngs = await pool.query("SELECT DISTINCT engineer_id, engineer_name FROM engineer_form");
        allEngs.rows.forEach(r => {
           console.log(` - Record: EngID=${r.engineer_id}, Name=${r.engineer_name}`);
        });
      }
    } else {
      console.log("User not found.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

compare();
