const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedAgencyData() {
    try {
        const res = await pool.query(`
      UPDATE engineer_form 
      SET 
        mode_of_project = 'MOA',
        implementing_agencies = 'PGO Benguet',
        tranche_1 = 1500000,
        moa = 'MOA-2026-001',
        rta = 'RTA-BENGUET-09'
      WHERE project_id IN (
        SELECT project_id FROM engineer_form ORDER BY project_id DESC LIMIT 2
      )
      RETURNING project_id, mode_of_project, implementing_agencies, tranche_1, moa, rta;
    `);
        console.log(`Successfully seeded ${res.rowCount} agency projects:`, res.rows);
    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        pool.end();
    }
}

seedAgencyData();
