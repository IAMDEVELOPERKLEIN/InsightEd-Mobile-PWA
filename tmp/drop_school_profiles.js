import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_z8JNLGaE0pFr@ep-dry-forest-a14epyio-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});
try {
  console.log("Dropping school_profiles table...");
  await pool.query("DROP TABLE IF EXISTS school_profiles CASCADE;");
  console.log("✅ Table dropped successfully.");
} catch (err) {
  console.error("❌ Error dropping table:", err.message);
} finally {
  await pool.end();
}
