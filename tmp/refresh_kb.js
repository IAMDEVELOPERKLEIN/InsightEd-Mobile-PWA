import { Pool } from 'pg';
import dotenv from 'dotenv';
import { teachChatbot, setPool } from '../api/chatbot.js';

dotenv.config({ path: '.env' });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

setPool(pool);

async function refreshKnowledgeBase() {
    console.log("🛠️ Starting Knowledge Base Refresh...");
    
    try {
        // 1. Clear existing knowledge
        console.log("🧹 Clearing old knowledge...");
        await pool.query('DELETE FROM chatbot_knowledge');
        
        // 2. Define common troubleshooting tips
        const content = `
TROUBLESHOOTING: LOGIN ISSUES
If you cannot login to STRIDE InsightED:
1. Ensure your email is correct and has been verified.
2. Check if you are using the correct Master Password if you are an Admin.
3. If you forgot your password, use the "Forgot Password" link on the login page.
4. If your account is disabled, please contact the Regional Office or SDO for assistance.
5. Ensure you have a stable internet connection.

ABOUT THE APP
STRIDE InsightED is a mobile-first dashboard for the Department of Education (DepEd) to monitor infrastructure projects, school performance, and education resources in real-time.
It provides data visualization for Central, Regional, and Division levels.

SUPERVISOR'S OFFICE LOCATION
The Supervisor's Office is located on the 3rd Floor of the Main Building, Room 302.
Office hours are 8:00 AM to 5:00 PM, Monday to Friday.
`;

        // 3. Ingest data
        console.log("📥 Ingesting new knowledge with Gemini Embeddings...");
        const result = await teachChatbot(content);
        
        if (result.success) {
            console.log(`✅ Successfully ingested ${result.count} chunks.`);
        } else {
            console.error("❌ Ingestion failed:", result.message);
        }

    } catch (e) {
        console.error("❌ Refresh Failed:", e.message);
    } finally {
        await pool.end();
        console.log("👋 Done.");
    }
}

refreshKnowledgeBase();
