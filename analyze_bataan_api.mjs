import fetch from 'node-fetch';

async function analyzeBataan() {
    try {
        console.log('Fetching projects from local API...');
        const response = await fetch('http://localhost:3000/api/projects');
        const projects = await response.json();

        console.log(`Total projects fetched: ${projects.length}`);

        const bataanProjects = projects.filter(p =>
            (p.division?.toLowerCase().includes('bataan')) ||
            (p.region?.toLowerCase().includes('region iii')) ||
            (p.region === '3')
        );

        console.log(`\nBataan/Region III projects found: ${bataanProjects.length}`);

        if (bataanProjects.length > 0) {
            bataanProjects.forEach(p => {
                console.log('---');
                console.log(`ID: ${p.id}, School: ${p.schoolName}`);
                console.log(`Region: "${p.region}" (Type: ${typeof p.region})`);
                console.log(`Division: "${p.division}" (Type: ${typeof p.division})`);
                console.log(`isDonated: ${p.isDonated} (Type: ${typeof p.isDonated})`);
                console.log(`is_donated: ${p.is_donated} (Type: ${typeof p.is_donated})`);
            });
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

analyzeBataan();
