import fetch from 'node-fetch';

async function test() {
    const endpoints = [
        'http://localhost:3000/api/projects',
        'http://localhost:3000/api/reference/funding-years',
        'http://localhost:3000/api/reference/efd-locations'
    ];

    for (const url of endpoints) {
        console.log(`Testing ${url}...`);
        try {
            const start = Date.now();
            const res = await fetch(url);
            console.log(`Status: ${res.status} (took ${Date.now() - start}ms)`);
            if (res.ok) {
                const data = await res.json();
                console.log(`Data Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
                console.log(`Items: ${Array.isArray(data) ? data.length : 'N/A'}`);
            } else {
                const text = await res.text();
                console.log(`Error: ${text}`);
            }
        } catch (e) {
            console.error(`Fetch failed: ${e.message}`);
        }
    }
}

test();
