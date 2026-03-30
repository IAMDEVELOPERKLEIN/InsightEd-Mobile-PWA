import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_z8JNLGaE0pFr@ep-dry-forest-a14epyio-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});
try {
  const res = await pool.query("SELECT * FROM ph_schools LIMIT 1");
  if (res.rows.length > 0) {
    console.log(JSON.stringify(Object.keys(res.rows[0])));
  } else {
    // If empty, fallback to information_schema
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ph_schools'");
    console.log(JSON.stringify(res2.rows.map(r => r.column_name)));
  }
} catch (err) {
  console.error(err);
} finally {
  await pool.end();
}
