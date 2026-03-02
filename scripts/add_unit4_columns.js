import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addUnit4Columns() {
  const client = await pool.connect();
  try {
    console.log("⏳ Adding Unit 4 columns to ph_schools...");
    
    // Track which groups the school selected in the Gatekeeper
    await client.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS selected_learner_groups JSONB DEFAULT '[]'::jsonb;`);

    const grades = ['k', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
    const categories = ['als', 'muslim', 'ip', 'lwd', 'displaced', 'overage', 'sned', 'dropout', 'repeater'];
    
    // Dynamically create columns for every category and grade
    for (const cat of categories) {
      for (const grade of grades) {
        await client.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS ${cat}_${grade} INTEGER DEFAULT 0;`);
      }
    }

    // Add Health Check (BMI) columns
    await client.query(`
      ALTER TABLE ph_schools 
      ADD COLUMN IF NOT EXISTS bmi_severely_wasted INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS bmi_wasted INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS bmi_overweight_obese INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS bmi_normal INTEGER DEFAULT 0;
    `);
    
    console.log("✅ Successfully added Unit 4 Learner Statistics columns!");
  } catch (err) {
    console.error("❌ Error updating table:", err);
  } finally {
    client.release();
    pool.end();
  }
}

addUnit4Columns();