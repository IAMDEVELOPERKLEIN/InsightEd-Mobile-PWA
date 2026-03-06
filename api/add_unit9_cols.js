import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insighted'
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE ph_schools 
      ADD COLUMN IF NOT EXISTS unit9_furniture TEXT,
      ADD COLUMN IF NOT EXISTS unit9_ict TEXT,
      ADD COLUMN IF NOT EXISTS unit9_has_ecart BOOLEAN,
      ADD COLUMN IF NOT EXISTS unit9_ecarts TEXT,
      ADD COLUMN IF NOT EXISTS unit9_wash TEXT,
      ADD COLUMN IF NOT EXISTS unit9_utilities TEXT;
    `);
    console.log("Successfully added Unit 9 columns.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
