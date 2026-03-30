import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_z8JNLGaE0pFr@ep-dry-forest-a14epyio-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});
try {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ph_schools'");
  console.log(JSON.stringify(res.rows, null, 2));
} catch (err) {
  console.error(err);
} finally {
  await pool.end();
}
