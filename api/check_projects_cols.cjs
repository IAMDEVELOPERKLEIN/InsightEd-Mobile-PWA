require('dotenv').config();
const pg = require('pg');
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

(async () => {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects';");
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
