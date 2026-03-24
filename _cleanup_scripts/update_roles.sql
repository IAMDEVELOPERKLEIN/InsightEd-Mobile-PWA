-- update_roles.sql
-- Run this script in your PostgreSQL database to migrate existing 'Beta Tester' users to 'School Head'
UPDATE users 
SET role = 'School Head' 
WHERE role = 'Beta Tester' OR role = 'beta tester';
