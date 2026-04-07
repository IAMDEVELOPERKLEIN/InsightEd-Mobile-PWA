-- SQL Query to identify duplicate projects in 'engineer_form' using a Content Fingerprint
-- This query hashes all relevant columns to find rows with identical content.

SELECT 
    school_name, 
    school_id,
    COUNT(*) - 1 as redundant_copies, -- Shows how many 'Ghost' records can be deleted
    string_agg(project_id::text, ', ') as id_list
FROM (
    SELECT 
        project_id,
        school_name,
        school_id,
        -- Creating a 'Content Fingerprint' by hashing all data columns (excluding IDs and timestamps)
        md5(CAST(row(
            project_name, school_name, school_id, region, division, status_of_construction_phase, 
            accomplishment_percentage, status_as_of, target_completion_date, actual_completion_date, 
            notice_to_proceed, contractor_name, approved_budget_for_contract, batch_of_funds, 
            other_remarks, engineer_id, validation_status, validation_remarks, validated_by, 
            engineer_name, latitude, longitude, construction_start_date, project_category, 
            scope_of_work, number_of_classrooms, number_of_sites, number_of_storeys, actions, 
            contract_amount, funds_utilized, savings, status_design_phase, contract_id, 
            date_notice_of_award, issuance_of_invitation_to_bid, pre_bid_conference, 
            opening_of_technical_proposal, opening_of_financial_proposal, request_for_quotation, 
            negotiation, opening_of_quotation, funding_year, funding_year_justification, 
            revised_target_completion_date, delay_reason, time_lapsed_days, time_lapsed_percentage, 
            is_donated, uploader_type, mode_of_project, date_assigned, assigned_engineer_id, 
            assigned_engineer_name, internal_description, external_description, 
            uploader_id_update_moa_rta, implementing_agency, implementing_agency_specific, 
            uploader_id_moa_rta, no_of_units, program_type, province, city, municipality, 
            mother_moa_id, supplemental_moa_id, sangguniang_resolution_id, bid_opening, 
            issuance_of_resolution_to_award, leg_district, supplamental_moa_id, status_as_of_date, 
            notice_to_proceed_date, issuance_of_invitation_to_bid_date, pre_bid_conference_date, 
            opening_of_technical_proposal_date, opening_of_financial_proposal_date, 
            request_for_quotation_date, negotiation_date, opening_of_quotation_date, 
            procurement_status, project_category_id, pow_pdf, dupa_pdf, contract_pdf
        ) AS text)) as fingerprint
    FROM engineer_form
) sub
GROUP BY school_name, school_id, fingerprint
HAVING COUNT(*) > 1
ORDER BY redundant_copies DESC;
