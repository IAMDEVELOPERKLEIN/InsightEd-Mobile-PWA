import fetch from 'node-fetch';

async function checkAllRegions() {
    try {
        const response = await fetch('http://localhost:3000/api/projects');
        const projects = await response.json();

        const regionCounts = {};

        projects.forEach(p => {
            const r = p.region || 'NULL';
            regionCounts[r] = (regionCounts[r] || 0) + 1;
        });

        console.log('--- ALL REGION VARIATIONS AND COUNTS ---');
        Object.keys(regionCounts).sort().forEach(r => {
            console.log(`"${r}": ${regionCounts[r]} projects`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkAllRegions();
