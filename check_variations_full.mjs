import fetch from 'node-fetch';

async function checkVariations() {
    try {
        const response = await fetch('http://localhost:3000/api/projects');
        const projects = await response.json();

        const regionToDivisions = {};

        projects.forEach(p => {
            const r = p.region || 'NULL';
            const d = p.division || 'NULL';
            if (!regionToDivisions[r]) regionToDivisions[r] = new Set();
            regionToDivisions[r].add(d);
        });

        console.log('--- REGION TO DIVISIONS MAPPING ---');
        Object.keys(regionToDivisions).sort().forEach(r => {
            console.log(`Region: "${r}"`);
            console.log(`Divisions: ${Array.from(regionToDivisions[r]).sort().join(', ')}`);
            console.log('---');
        });

    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkVariations();
