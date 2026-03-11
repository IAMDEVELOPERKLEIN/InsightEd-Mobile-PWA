import dotenv from 'dotenv';
dotenv.config();

async function testFetch() {
    const key = process.env.GEMINI_API_KEY;
    console.log(`Using Key: ${key.substring(0, 5)}...`);
    
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
    
    for (const model of models) {
        console.log(`\nTesting Model: ${model}`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "hi" }] }]
                })
            });
            console.log(`Status: ${resp.status} ${resp.statusText}`);
            if (resp.ok) {
                const data = await resp.json();
                console.log("Response:", data.candidates[0].content.parts[0].text);
            } else {
                const err = await resp.text();
                console.log("Error Body:", err);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

testFetch();
