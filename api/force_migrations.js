
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools' 
      AND column_name IN ('division', 'district', 'region', 'school_name')
    `);
    console.log('Found columns:', res.rows.map(r => r.column_name));

    // Force run the new migrations for insights
    const insightsCols = [
      'total_teachers_kinder', 'total_teachers_elementary', 'total_teachers_jhs', 'total_teachers_shs',
      'bldg_count_good', 'bldg_count_minor_repair', 'bldg_count_major_repair',
      'it_laptop_total', 'it_tablet_total', 'it_pc_total', 'it_printer_total', 'it_ecart_total'
    ];
    const insightsAlter = insightsCols.map(c => `ADD COLUMN IF NOT EXISTS ${c} INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE ph_schools ${insightsAlter.join(', ')}`);
    console.log('✅ Insights migrations forced successfully');

  } catch (err) {
    console.error('Verification failed:', err.message);
  } finally {
    await pool.end();
  }
}

verify();
