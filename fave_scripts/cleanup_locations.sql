-- Cleanup Location Data in schools_IERN and ph_schools
-- This script normalizes Region, Division, District, Province, and Municipality columns
-- to ensure consistent casing and remove trailing/leading whitespace.

BEGIN;

-- 1. Update schools_IERN (Case-sensitive column names)
UPDATE "schools_IERN" 
SET 
  "Region" = UPPER(TRIM("Region")),
  "Division" = UPPER(TRIM("Division")),
  "District" = UPPER(TRIM("District")),
  "Province" = UPPER(TRIM("Province")),
  "Municipality" = UPPER(TRIM("Municipality"));

-- 2. Update ph_schools (Standard column names)
UPDATE ph_schools 
SET 
  region = UPPER(TRIM(region)),
  division = UPPER(TRIM(division)),
  district = UPPER(TRIM(district)),
  province = UPPER(TRIM(province)),
  municipality = UPPER(TRIM(municipality));

-- 3. Update users table (Optional but good for fallback consistency)
UPDATE users 
SET 
  region = UPPER(TRIM(region)),
  division = UPPER(TRIM(division)),
  province = UPPER(TRIM(province)),
  city = UPPER(TRIM(city));

COMMIT;

SELECT 'Location cleanup complete.' as status;
