import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTable() {
    console.log("Checking chatbot_knowledge table...");
    try {
        const res = await pool.query('SELECT COUNT(*) FROM chatbot_knowledge');
        console.log(`Count: ${res.rows[0].count}`);
        
        const sample = await pool.query('SELECT embedding FROM chatbot_knowledge LIMIT 1');
        if (sample.rows.length > 0) {
            const emb = typeof sample.rows[0].embedding === 'string' ? JSON.parse(sample.rows[0].embedding) : sample.rows[0].embedding;
            console.log(`Embedding dimension: ${emb.length}`);
        } else {
            console.log("Table is empty.");
        }
    } catch (e) {
        console.error("❌ Error checking table:", e.message);
    } finally {
        await pool.end();
    }
}

checkTable();
