import fetch from 'node-fetch';

async function checkVariations() {
    try {
        const response = await fetch('http://localhost:3000/api/projects');
        const projects = await response.json();

        const regions = new Set();
        const divisions = new Set();
        const regionToDivisions = {};

        projects.forEach(p => {
            if (p.region) {
                regions.add(p.region);
                if (!regionToDivisions[p.region]) regionToDivisions[p.region] = new Set();
                if (p.division) regionToDivisions[p.region].add(p.division);
            }
            if (p.division) divisions.add(p.division);
        });

        console.log('Unique Regions in projects data:');
        console.log(Array.from(regions));

        console.log('\nRegion to Divisions mapping:');
        Object.keys(regionToDivisions).forEach(r => {
            console.log(`${r}:`, Array.from(regionToDivisions[r]));
        });

    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkVariations();
