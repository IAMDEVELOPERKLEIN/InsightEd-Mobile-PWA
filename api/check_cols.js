import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/insighted', 
});

(async () => {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form';");
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
})();
