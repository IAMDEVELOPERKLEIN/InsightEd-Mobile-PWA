
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findLargeFields() {
  const query = `
    SELECT 
      MAX(LENGTH(project_name::text)) as max_project_name,
      MAX(LENGTH(school_name::text)) as max_school_name,
      MAX(LENGTH(other_remarks::text)) as max_remarks,
      MAX(LENGTH(actions::text)) as max_actions,
      MAX(LENGTH(pow_pdf::text)) as max_pow,
      MAX(LENGTH(dupa_pdf::text)) as max_dupa,
      MAX(LENGTH(contract_pdf::text)) as max_contract,
      MAX(LENGTH(delay_reason::text)) as max_delay,
      MAX(LENGTH(funding_year_justification::text)) as max_funding_just
    FROM engineer_form;
  `;

  try {
    const res = await pool.query(query);
    console.log("Max lengths per column:");
    console.log(JSON.stringify(res.rows[0], null, 2));
    
    // Also check for the total size of each row
    const rowSizeQuery = `
      SELECT project_id, (
        COALESCE(LENGTH(project_name::text), 0) + 
        COALESCE(LENGTH(school_name::text), 0) + 
        COALESCE(LENGTH(other_remarks::text), 0) + 
        COALESCE(LENGTH(actions::text), 0) + 
        COALESCE(LENGTH(pow_pdf::text), 0) + 
        COALESCE(LENGTH(dupa_pdf::text), 0) + 
        COALESCE(LENGTH(contract_pdf::text), 0)
      ) as estimated_row_size
      FROM engineer_form
      ORDER BY estimated_row_size DESC
      LIMIT 10;
    `;
    const resSize = await pool.query(rowSizeQuery);
    console.log("\nTop 10 largest rows (estimated):");
    console.log(JSON.stringify(resSize.rows, null, 2));

  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

findLargeFields();
