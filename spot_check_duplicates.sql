-- SQL Query to check individual projects side-by-side
-- Adjust the school_id and project_name to filter specifically for a suspected duplicate cluster.

SELECT * 
FROM engineer_form 
WHERE school_id = '500795' -- Glan Central Integrated SPED Center (Example)
  AND (project_name = '' OR project_name IS NULL) -- Adjust filter as needed
ORDER BY project_id ASC;
