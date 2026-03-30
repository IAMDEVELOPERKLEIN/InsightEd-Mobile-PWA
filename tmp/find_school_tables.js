import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_z8JNLGaE0pFr@ep-dry-forest-a14epyio-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});
try {
  const res = await pool.query("SELECT table_name FROM information_schema.columns WHERE column_name = 'school_id' AND table_schema = 'public'");
  console.log("Tables with school_id:", JSON.stringify(res.rows.map(r => r.table_name)));
} catch (err) {
  console.error(err);
} finally {
  await pool.end();
}
