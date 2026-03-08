import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.NEW_DATABASE_URL) {
    console.log('No secondary database configured. Skipping.');
    process.exit(0);
}

const pool = new Pool({
    connectionString: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running migration on Secondary DB...');
        await client.query(`
          ALTER TABLE engineer_form 
          ADD COLUMN IF NOT EXISTS funding_year INTEGER,
          ADD COLUMN IF NOT EXISTS funding_year_justification TEXT;
          
          -- Also ensure any other missing columns are added to handle dual-write INSERT
          ALTER TABLE engineer_form 
          ADD COLUMN IF NOT EXISTS issuance_of_invitation_to_bid DATE,
          ADD COLUMN IF NOT EXISTS pre_bid_conference DATE,
          ADD COLUMN IF NOT EXISTS opening_of_technical_proposal DATE,
          ADD COLUMN IF NOT EXISTS opening_of_financial_proposal DATE,
          ADD COLUMN IF NOT EXISTS request_for_quotation DATE,
          ADD COLUMN IF NOT EXISTS negotiation DATE,
          ADD COLUMN IF NOT EXISTS opening_of_quotation DATE,
          ADD COLUMN IF NOT EXISTS pow_pdf TEXT,
          ADD COLUMN IF NOT EXISTS dupa_pdf TEXT,
          ADD COLUMN IF NOT EXISTS contract_pdf TEXT,
          ADD COLUMN IF NOT EXISTS engineer_id TEXT,
          ADD COLUMN IF NOT EXISTS funds_utilized NUMERIC,
          ADD COLUMN IF NOT EXISTS savings NUMERIC,
          ADD COLUMN IF NOT EXISTS status_design_phase TEXT,
          ADD COLUMN IF NOT EXISTS contract_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS date_notice_of_award DATE;
          
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='engineer_form' AND column_name='status') THEN
              ALTER TABLE engineer_form RENAME COLUMN status TO status_of_construction_phase;
            END IF;
          END $$;
        `);
        console.log('✅ Secondary DB Migration successful');
    } catch (err) {
        console.error('❌ Secondary DB Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
