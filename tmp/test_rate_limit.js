
async function testRateLimit() {
    const url = 'http://127.0.0.1:3000/api/health';
    console.log(`Testing rate limit on ${url}...`);
    
    const results = [];
    for (let i = 0; i < 110; i++) {
        results.push(fetch(url).then(res => ({
            status: res.status,
            idx: i
        })));
    }
    
    const responses = await Promise.all(results);
    const success = responses.filter(r => r.status === 200).length;
    const rateLimited = responses.filter(r => r.status === 429).length;
    
    console.log(`Total Requests: ${responses.length}`);
    console.log(`Success (200): ${success}`);
    console.log(`Rate Limited (429): ${rateLimited}`);
    
    if (rateLimited > 0) {
        console.log('✅ Rate Limit verified!');
    } else {
        console.log('❌ Rate Limit NOT triggered.');
    }
}

testRateLimit();
