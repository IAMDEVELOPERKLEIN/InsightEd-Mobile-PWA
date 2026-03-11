import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ph_schools'");
    const cols = res.rows.map(r => r.column_name);
    const targetCols = [
        'school_id', 'school_name', 'region', 'province', 'municipality', 
        'division', 'district', 'leg_district', 'curricular_offering', 
        'latitude', 'longitude', 'barangay', 'iern', 'updated_at'
    ];
    
    targetCols.forEach(tc => {
        if (!cols.includes(tc)) {
            console.log(`❌ Column missing: ${tc}`);
        } else {
            console.log(`✅ Column exists: ${tc}`);
        }
    });

  } catch (err) {
    console.error("Schema Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
