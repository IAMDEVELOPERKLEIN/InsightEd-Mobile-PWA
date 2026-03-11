import { chatWithKnowledge } from '../api/chatbot.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { setPool } from '../api/chatbot.js';

dotenv.config({ path: '.env' });

const mockPool = {
    query: async (sql) => {
        if (sql.includes('SELECT content, embedding FROM chatbot_knowledge')) {
            return {
                rows: [
                    { content: "The supervisor's office is on the 3rd floor.", embedding: new Array(768).fill(0.1) }
                ]
            };
        }
        return { rows: [] };
    }
};

setPool(mockPool);

async function benchmark() {
    console.log("🚀 Starting Ollama Performance Benchmark...");
    
    // We expect OLLAMA_BASE_URL to point to the remote VM if configured in .env, 
    // but the user's .env didn't have it. Let's force it for the benchmark if needed.
    // In chatbot.js, it defaults to localhost.
    
    const question = "Where is the supervisor's office?";
    const iterations = 3;
    const results = [];

    console.log(`\nTesting ${iterations} iterations...`);

    for (let i = 1; i <= iterations; i++) {
        console.log(`\n--- Iteration ${i} ---`);
        const start = performance.now();
        const response = await chatWithKnowledge(question);
        const end = performance.now();
        const duration = end - start;
        
        results.push(duration);
        console.log(`Response: ${response.substring(0, 50)}...`);
        console.log(`Duration: ${duration.toFixed(2)}ms`);
    }

    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\n✅ Benchmark Complete!`);
    console.log(`Average Response Time: ${avg.toFixed(2)}ms`);
}

benchmark().catch(console.error);
