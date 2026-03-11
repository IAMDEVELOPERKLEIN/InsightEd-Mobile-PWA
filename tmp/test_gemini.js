import { chatWithKnowledge } from '../api/chatbot.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { setPool } from '../api/chatbot.js';

dotenv.config({ path: '.env' });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

setPool(pool);

async function testGemini() {
    console.log("🚀 Testing Gemini API Integration...");
    
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ Error: GEMINI_API_KEY is not set in .env");
        return;
    }

    const question = "how do I cook rice?";
    
    try {
        const start = performance.now();
        const response = await chatWithKnowledge(question);
        const end = performance.now();
        
        console.log(`\nResponse: ${response}`);
        console.log(`\nTotal Latency: ${(end - start).toFixed(2)}ms`);
        console.log("✅ Success!");
    } catch (e) {
        console.error("❌ Test Failed:", e.message);
    }
}

testGemini().catch(console.error);
