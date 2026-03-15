/**
 * Since we can't connect directly to DB from external scripts,
 * Let's create a temporary debug endpoint in a separate test server that can access the pool,
 * OR we can just check what the API returns for a debug query added temporarily.
 * 
 * Instead, let's add a temporary route to the API and call it.
 */
import fetch from 'node-fetch';

// Let's check via the division-stats what the actual values are
async function debug() {
    // Check region V divisions, looking at LEGASPI vs LEGAZPI
    const region = 'Region V';
    const url = `http://localhost:3000/api/monitoring/division-stats?region=${encodeURIComponent(region)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Print all divisions and their registered counts
    console.log('All divisions for Region V:');
    data.sort((a, b) => a.division.localeCompare(b.division)).forEach(d => {
        console.log(`  "${d.division}": ${d.completed_schools} / ${d.total_schools}`);
    });
    
    // Check for any LEGAZPI variants
    const legazpiVariants = data.filter(d => d.division && (d.division.toUpperCase().includes('LEGASPI') || d.division.toUpperCase().includes('LEGAZPI')));
    console.log('\nLegazpi variants found:', JSON.stringify(legazpiVariants.map(d => ({ division: d.division, completed: d.completed_schools, total: d.total_schools }))));
    
    // Check Camarines Sur
    const camSur = data.find(d => d.division && d.division.includes('CAMARINES SUR'));
    console.log('\nCamarines Sur:', camSur ? `${camSur.completed_schools} / ${camSur.total_schools}` : 'NOT FOUND');
}

debug().catch(console.error);
