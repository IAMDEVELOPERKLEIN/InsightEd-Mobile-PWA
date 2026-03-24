import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    // 1. Current school_summary value
    const ss = await pool.query(
      `SELECT data_health_score, data_health_description, issues, last_updated FROM school_summary WHERE school_id = $1`, ['111570']
    );
    console.log('\n=== school_summary (source of truth) ===');
    if (ss.rows.length > 0) {
      console.log(JSON.stringify(ss.rows[0], null, 2));
    } else {
      console.log('NOT FOUND');
    }

    // 2. What /api/schools/:schoolId/health-score returns (simulate the query)
    const hs = await pool.query(`
      SELECT 
        ss.data_health_score,
        ss.data_health_description,
        ss.issues as data_quality_issues,
        sp.completion_percentage,
        sp.forms_completed_count
      FROM school_profiles sp
      LEFT JOIN school_summary ss ON sp.school_id = ss.school_id
      WHERE sp.school_id = $1
    `, ['111570']);
    console.log('\n=== /api/schools/:schoolId/health-score JOIN result ===');
    if (hs.rows.length > 0) {
      console.log(JSON.stringify(hs.rows[0], null, 2));
    }

    // 3. What /api/school-by-user returns (School Head view)
    const su = await pool.query(`
      SELECT 
        sp.school_id,
        ss.data_health_score,
        ss.data_health_description,
        ss.issues as data_quality_issues
      FROM school_profiles sp
      LEFT JOIN school_summary ss ON sp.school_id = ss.school_id
      WHERE sp.school_id = $1
    `, ['111570']);
    console.log('\n=== /api/school-by-user JOIN result (School Head view) ===');
    if (su.rows.length > 0) {
      console.log(JSON.stringify(su.rows[0], null, 2));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}
check();
