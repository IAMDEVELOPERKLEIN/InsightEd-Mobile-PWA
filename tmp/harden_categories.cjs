const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function hardenCategories() {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting Category Hardening...");
    
    // 1. Bulk update existing records
    await client.query("BEGIN");
    console.log("🔄 Bulk updating existing engineer_form categories...");
    
    const updateQueries = [
      { id: '01', matches: ['NEW CONSTRUCTION', 'New Construction'] },
      { id: '02', matches: ['REPAIR', 'Repair and Rehab'] },
      { id: '03', matches: ['LMS', 'Last Mile Schools'] },
      { id: '04', matches: ['SCHOOL HEALTH FACILITIES', 'Health facilities'] },
      { id: '05', matches: ['GABALDON', 'Gabaldon Restoration'] },
      { id: '06', matches: ['LIBRARY HUB', 'Library Hub'] },
      { id: '07', matches: ['ILRC', 'SpEd Inclusive Learning Resource Centers (ILRC)'] },
      { id: '08', matches: ['ALS-CLC', 'Alternative Learning System - Community Based Learning Centers (ALS-CLC)'] },
      { id: '11', matches: ['QRF'] },
      { id: '12', matches: ['ELECTRIFICATION'] }
    ];

    for (let mapping of updateQueries) {
      for (let matchStr of mapping.matches) {
        await client.query(
          "UPDATE engineer_form SET project_category_id = $1 WHERE UPPER(TRIM(project_category)) = UPPER($2)",
          [mapping.id, matchStr]
        );
      }
    }
    await client.query("COMMIT");
    console.log("✅ Engineer form categories bulk updated.");

    // 2. Harden the Trigger
    console.log("🔄 Deploying hardened trigger function...");
    await client.query(`
CREATE OR REPLACE FUNCTION public.sync_beff_to_engineer_form()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    matched_ipc TEXT;
    next_seq INTEGER;
    generated_ipc TEXT;
    cat_id TEXT;
    extracted_year TEXT;
    clean_cat TEXT;
BEGIN
    -- 1. Extract Funding Year (Strictly Numeric)
    extracted_year := COALESCE(substring(NEW."funding year"::text from '[0-9]+'), to_char(CURRENT_DATE, 'YYYY'));

    -- 2. Clean Category Name
    clean_cat := UPPER(TRIM(NEW."project category"));

    -- 3. Resolve Project Category ID (Case Insensitive & Shorthand aware)
    IF clean_cat IN ('NEW CONSTRUCTION') THEN cat_id := '01';
    ELSIF clean_cat IN ('REPAIR', 'REPAIR AND REHAB') THEN cat_id := '02';
    ELSIF clean_cat IN ('LMS', 'LAST MILE SCHOOLS') THEN cat_id := '03';
    ELSIF clean_cat IN ('SCHOOL HEALTH FACILITIES', 'HEALTH FACILITIES') THEN cat_id := '04';
    ELSIF clean_cat IN ('GABALDON', 'GABALDON RESTORATION') THEN cat_id := '05';
    ELSIF clean_cat IN ('LIBRARY HUB') THEN cat_id := '06';
    ELSIF clean_cat IN ('ILRC', 'SPED INCLUSIVE LEARNING RESOURCE CENTERS (ILRC)') THEN cat_id := '07';
    ELSIF clean_cat IN ('ALS-CLC', 'ALTERNATIVE LEARNING SYSTEM - COMMUNITY BASED LEARNING CENTERS (ALS-CLC)') THEN cat_id := '08';
    ELSIF clean_cat IN ('MIDRISE SCHOOL BUILDING') THEN cat_id := '09';
    ELSIF clean_cat IN ('QRF') THEN cat_id := '11';
    ELSIF clean_cat IN ('ELECTRIFICATION') THEN cat_id := '12';
    ELSE cat_id := '10';
    END IF;

    -- 4. "Smart Match" Lookup (Strictly Multi-Column)
    SELECT ipc INTO matched_ipc
    FROM engineer_form
    WHERE school_id = NEW.school_id
      AND LOWER(TRIM(project_name)) = LOWER(TRIM(NEW.project_name))
      AND funding_year = CAST(NULLIF(extracted_year, '') AS INTEGER)
      AND approved_budget_for_contract = clean_to_numeric(NEW.approved_budget_for_contract::text)
      AND number_of_classrooms = CAST(NULLIF(clean_to_numeric(NEW.number_of_classrooms::text)::text, '') AS INTEGER)
    LIMIT 1;

    -- 5. IPC Resolution
    IF matched_ipc IS NOT NULL THEN
        generated_ipc := matched_ipc;
        NEW.ipc := generated_ipc; -- Set the NEW row to use the existing one
    ELSIF NEW.ipc IS NULL OR NEW.ipc = '' THEN
        SELECT COALESCE(
            MAX(CAST(NULLIF(SPLIT_PART(ipc, '-', 4), '') AS INTEGER)), 0
        ) INTO next_seq
        FROM engineer_form
        WHERE ipc LIKE 'INF-' || cat_id || '-' || extracted_year || '-%';

        generated_ipc := 'INF-' || cat_id || '-' || extracted_year || '-' || LPAD((next_seq + 1)::TEXT, 5, '0');
        NEW.ipc := generated_ipc;
    ELSE
        generated_ipc := NEW.ipc;
    END IF;

    -- 6. Sink into engineer_form
    IF EXISTS (SELECT 1 FROM engineer_form WHERE ipc = generated_ipc) THEN
        UPDATE engineer_form SET
            project_name = NEW.project_name,
            school_name = NEW.school_name,
            school_id = NEW.school_id,
            project_category = NEW."project category",
            project_category_id = cat_id,
            funding_year = CAST(NULLIF(extracted_year, '') AS INTEGER),
            region = NEW.region,
            division = NEW.division,
            accomplishment_percentage = clean_to_numeric(NEW.accomplishment_percentage::text),
            contract_amount = clean_to_numeric(NEW.contract_amount::text),
            approved_budget_for_contract = clean_to_numeric(NEW.approved_budget_for_contract::text),
            number_of_classrooms = CAST(NULLIF(clean_to_numeric(NEW.number_of_classrooms::text)::text, '') AS INTEGER),
            status_as_of = CAST(NULLIF(NEW.status_as_of::text, '') AS DATE),
            target_completion_date = CAST(NULLIF(NEW.target_completion_date::text, '') AS DATE),
            notice_to_proceed = CAST(NULLIF(NEW.notice_to_proceed::text, '') AS DATE)
        WHERE ipc = generated_ipc;
    ELSE
        INSERT INTO engineer_form (
            ipc, project_name, school_name, school_id, project_category, project_category_id, funding_year,
            region, division, accomplishment_percentage, contract_amount, approved_budget_for_contract, number_of_classrooms,
            status_as_of, target_completion_date, notice_to_proceed, created_at
        )
        VALUES (
            generated_ipc, NEW.project_name, NEW.school_name, NEW.school_id, NEW."project category", cat_id, CAST(NULLIF(extracted_year, '') AS INTEGER),
            NEW.region, NEW.division, clean_to_numeric(NEW.accomplishment_percentage::text), clean_to_numeric(NEW.contract_amount::text), clean_to_numeric(NEW.approved_budget_for_contract::text), CAST(NULLIF(clean_to_numeric(NEW.number_of_classrooms::text)::text, '') AS INTEGER),
            CAST(NULLIF(NEW.status_as_of::text, '') AS DATE), CAST(NULLIF(NEW.target_completion_date::text, '') AS DATE), CAST(NULLIF(NEW.notice_to_proceed::text, '') AS DATE),
            COALESCE(CAST(NULLIF(NEW.created_at::text, '') AS TIMESTAMP), CURRENT_TIMESTAMP)
        );
    END IF;
        
    RETURN NEW;
END;
$function$
    `);
    console.log("✅ Trigger hardened.");

  } catch (err) {
    console.error("❌ Failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

hardenCategories();
