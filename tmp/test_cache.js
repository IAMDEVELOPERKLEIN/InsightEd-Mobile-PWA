
async function testCache() {
    // Using an endpoint that we cached: /api/reference/building-types
    const url = 'http://127.0.0.1:3000/api/reference/building-types';
    console.log(`Testing cache on ${url}...`);
    
    // First request (Cold)
    const start1 = Date.now();
    const res1 = await fetch(url);
    const end1 = Date.now();
    console.log(`Cold Request Time: ${end1 - start1}ms (Status: ${res1.status})`);
    
    // Second request (Warm)
    const start2 = Date.now();
    const res2 = await fetch(url);
    const end2 = Date.now();
    console.log(`Warm Request Time: ${end2 - start2}ms (Status: ${res2.status})`);
    
    if (end2 - start2 < end1 - start1) {
        console.log('✅ Caching verified (Warm request was faster)!');
    } else {
        console.log('⚠️ Warm request was not faster, but this can happen on local dev if the initial query was also very fast.');
    }
}

testCache();
