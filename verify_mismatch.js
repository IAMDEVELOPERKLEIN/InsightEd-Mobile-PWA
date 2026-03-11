
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyMismatch() {
  try {
    const userRes = await pool.query("SELECT uid, email, role FROM users WHERE email = 'john.christian.lareza@deped.gov.ph'");
    if (userRes.rows.length === 0) {
      console.log("User john.christian.lareza@deped.gov.ph not found.");
    } else {
      const user = userRes.rows[0];
      console.log(`Current User: Email=${user.email}, UID=${user.uid}, Role=${user.role}`);
      
      const projRes = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id = $1", [user.uid]);
      console.log(`Projects assigned to this UID: ${projRes.rows[0].count}`);

      const allProjs = await pool.query("SELECT DISTINCT engineer_id, engineer_name FROM engineer_form LIMIT 10");
      console.log("\nExisting assignments in engineer_form:");
      allProjs.rows.forEach(r => console.log(` - EngID: ${r.engineer_id}, EngName: ${r.engineer_name}`));
    }

  } catch (err) {
    console.error("Error in verification:", err);
  } finally {
    await pool.end();
  }
}

verifyMismatch();
