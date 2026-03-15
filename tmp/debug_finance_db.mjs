import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function debugFinanceAPI() {
    console.log('🔍 Debugging Finance Dashboard Queries...');
    try {
        const testAgg = await pool.query(`
          SELECT 
            COUNT(*) as total_projects,
            SUM(COALESCE(tranche_1, 0)) as total_tranche_1
          FROM engineer_form
          LIMIT 1
        `);
        console.log('✅ Aggregate query with tranche_1 works.');
    } catch (e) {
        console.error('❌ Aggregate query failed:', e.message);
    }

    try {
        const testFiles = await pool.query(`
          SELECT project_id, moa_pdf, rta_pdf FROM engineer_form LIMIT 1
        `);
        console.log('✅ Columns moa_pdf and rta_pdf exist.');
    } catch (e) {
        console.error('❌ Columns moa_pdf or rta_pdf missing:', e.message);
        
        try {
            const testFilesAlt = await pool.query(`
              SELECT project_id, moa, rta FROM engineer_form LIMIT 1
            `);
            console.log('✅ Alternative columns moa and rta exist.');
        } catch (e2) {
            console.error('❌ Alternative columns moa and rta also missing:', e2.message);
        }
    }

    try {
        const checkCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form'
        `);
        console.log('Available columns in engineer_form:', checkCols.rows.map(r => r.column_name).join(', '));
    } catch (e) {
        console.error('❌ Failed to list columns:', e.message);
    }

    await pool.end();
}

debugFinanceAPI();
