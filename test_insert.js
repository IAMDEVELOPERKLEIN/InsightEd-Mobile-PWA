import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.utf8' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    const client = await pool.connect();
    try {
        const query = `
      INSERT INTO "engineer_form" (
        project_name, school_name, school_id, region, division,
        status_of_construction_phase, accomplishment_percentage, status_as_of,
        target_completion_date, actual_completion_date, notice_to_proceed,
        contractor_name, approved_budget_for_contract, contract_amount, batch_of_funds, other_remarks,
        engineer_id, ipc, engineer_name, latitude, longitude,
        pow_pdf, dupa_pdf, contract_pdf,
        construction_start_date, project_category, scope_of_work,
        number_of_classrooms, number_of_sites, number_of_storeys, funds_utilized,
        actions, savings,
        status_design_phase, contract_id, date_notice_of_award,
        issuance_of_invitation_to_bid, pre_bid_conference, opening_of_technical_proposal,
        opening_of_financial_proposal, request_for_quotation, negotiation, opening_of_quotation,
        funding_year, funding_year_justification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45)
      RETURNING project_id;
    `;
        const values = Array(45).fill(null);
        values[0] = 'TEST PROJECT';
        values[1] = 'TEST SCHOOL';
        values[2] = '000000';
        values[17] = 'TEST-IPC';

        console.log('Running test INSERT with 45 values...');
        const res = await client.query(query, values);
        console.log('✅ INSERT successful! ID:', res.rows[0].project_id);

        // Clean up
        await client.query("DELETE FROM engineer_form WHERE project_id = $1", [res.rows[0].project_id]);
        console.log('✅ Cleaned up.');
    } catch (err) {
        console.error('❌ INSERT FAILED:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

test();
