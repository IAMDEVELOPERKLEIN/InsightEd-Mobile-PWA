import fetch from 'node-fetch';

// Check raw iern counts in ph_schools for Legazpi/Camarines Sur
async function debugDivision() {
    // First check: what does the /api/monitoring/division-stats return for legazpi?
    const region = 'Region V';
    const url = `http://localhost:3000/api/monitoring/division-stats?region=${encodeURIComponent(region)}`;
    const response = await fetch(url);
    const data = await response.json();
    const legazpi = data.find(d => d.division && d.division.includes('LEGASPI') || d.division && d.division.includes('LEGAZPI'));
    const camarinesSur = data.find(d => d.division && d.division.includes('CAMARINES SUR'));
    console.log('Legazpi City row:', JSON.stringify(legazpi, null, 2));
    console.log('Camarines Sur row:', JSON.stringify({ 
        division: camarinesSur?.division, 
        total_schools: camarinesSur?.total_schools, 
        completed_schools: camarinesSur?.completed_schools 
    }));
}

debugDivision().catch(console.error);
