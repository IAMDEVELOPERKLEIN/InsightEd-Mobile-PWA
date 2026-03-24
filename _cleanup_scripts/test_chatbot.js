import { teachChatbot, chatWithKnowledge } from './api/chatbot.js';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
    console.log("---- FAQ Chatbot Verification (Local Ollama) ----");

    console.log("\n1. Testing Knowledge Ingestion...");
    try {
        const ingestResult = await teachChatbot("The office of the supervisor is located at the 3rd floor, Room 302. Operating hours are 8 AM to 5 PM.");
        console.log("Ingest Result:", ingestResult);
    } catch (e) {
        console.error("Ingestion Error (Caught successfully):", e.message);
    }

    console.log("\n2. Testing Query (Available in context)...");
    try {
        const answer1 = await chatWithKnowledge("Where is the supervisor's office?");
        console.log("Q: Where is the supervisor's office?");
        console.log("A:", answer1);
    } catch (e) {
        console.error("Query 1 Failed:", e.message);
    }

    console.log("\n---- Verification Complete ----");
}

runTest().catch(console.error);
