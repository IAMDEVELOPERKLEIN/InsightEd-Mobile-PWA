
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Extract the logic from api/index.js (simplified version for testing)
function getVisibilityLogic(role) {
    const isAdmin = ['central office', 'hrodi', 'super user', 'super admin', 'admin', 'efd', 'efd engineer', 'hrodi engineer', 'central office finance'].includes(role.toLowerCase());
    const isDivEng = ['division engineer', 'sdo', 'ro', 'regional office', 'school division office'].includes(role.toLowerCase());
    
    if (isAdmin) return 'ADMIN_ACCESS (ALL)';
    if (isDivEng) return 'DIVISION_ACCESS (REGION/DIV)';
    return 'USER_ACCESS (OWN_ONLY)';
}

const testRoles = [
    { role: 'Admin', expected: 'ADMIN_ACCESS (ALL)' },
    { role: 'EFD Engineer', expected: 'ADMIN_ACCESS (ALL)' },
    { role: 'HRODI Engineer', expected: 'ADMIN_ACCESS (ALL)' },
    { role: 'Central Office', expected: 'ADMIN_ACCESS (ALL)' },
    { role: 'Super User', expected: 'ADMIN_ACCESS (ALL)' },
    { role: 'EFD', expected: 'ADMIN_ACCESS (ALL)' },
    { role: 'Regional Office', expected: 'DIVISION_ACCESS (REGION/DIV)' },
    { role: 'School Division Office', expected: 'DIVISION_ACCESS (REGION/DIV)' },
    { role: 'Division Engineer', expected: 'DIVISION_ACCESS (REGION/DIV)' },
    { role: 'Engineer', expected: 'USER_ACCESS (OWN_ONLY)' }
];

console.log('--- Role Visibility Logic Test ---');
let success = true;
testRoles.forEach(test => {
    const result = getVisibilityLogic(test.role);
    const passed = result === test.expected;
    console.log(`${passed ? '✅' : '❌'} Role: [${test.role}] -> Result: [${result}] (Expected: [${test.expected}])`);
    if (!passed) success = false;
});

if (success) {
    console.log('\n✨ All visibility tests passed!');
} else {
    console.log('\n❌ Some tests failed.');
    process.exit(1);
}
