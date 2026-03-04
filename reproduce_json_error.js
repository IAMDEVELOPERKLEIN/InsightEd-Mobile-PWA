import fetch from 'node-fetch';

async function test(id) {
    console.log(`Testing ID: ${id}`);
    try {
        const res = await fetch(`http://localhost:3000/api/schools_iern/${id}`);
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Body (raw): "${text}"`);
        if (text) {
            const json = JSON.parse(text);
            console.log(`JSON: ${JSON.stringify(json)}`);
        } else {
            console.log("Empty body!");
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
    console.log('---');
}

async function run() {
    await test('134299'); // Valid existing ID
    await test('999999'); // Non-existent ID
    await test('');       // Empty ID (might 404)
}

run();
