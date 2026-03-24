import fetch from 'node-fetch';

async function testDivisionStats() {
    const region = 'Region V';
    const url = `http://localhost:3000/api/monitoring/division-stats?region=${encodeURIComponent(region)}`;
    console.log(`Testing: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Error ${response.status}: ${await response.text()}`);
        return;
    }

    const data = await response.json();
    console.log(`\nTotal divisions: ${data.length}`);
    console.log('\nRegistration counts per division:');
    data.forEach(d => {
        console.log(`  ${d.division}: ${d.completed_schools} registered / ${d.total_schools} total`);
    });
}

testDivisionStats().catch(console.error);
