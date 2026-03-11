import pdfParse from 'pdf-parse-new';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

let pool = null;

/**
 * Injects the database pool into the chatbot module.
 */
export const setPool = (dbPool) => {
    pool = dbPool;
};

// --- SIMILARITY SEARCH ---
function cosineSimilarity(A, B) {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < A.length; i++) {
        dotProduct += (A[i] * B[i]);
        mA += (A[i] * A[i]);
        mB += (B[i] * B[i]);
    }
    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    return (mA === 0 || mB === 0) ? 0 : dotProduct / (mA * mB);
}

// --- CORE FUNCTIONS ---

/**
 * Ingests text or PDF files into the knowledge base.
 */
export const teachChatbot = async (text, filePath = null) => {
    if (!pool) throw new Error("Database pool not initialized.");
    if (!genAI) throw new Error("GEMINI_API_KEY is not configured in .env.");

    let content = "";
    let source = "admin_paste";

    if (filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        try {
            const result = await pdfParse(dataBuffer);
            content = result.text;
            source = path.basename(filePath);
        } catch (e) {
            console.error("PDF Parsing Error:", e);
            throw new Error("Failed to parse PDF file.");
        }
    } else if (text) {
        content = text;
    }

    if (!content.trim()) return { success: false, message: "No content to ingest." };

    const chunks = content.split(/\n\s*\n/).filter(c => c.trim().length > 10);
    const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    for (const chunk of chunks) {
        try {
            const result = await embedModel.embedContent(chunk);
            const embedding = result.embedding.values;

            await pool.query(
                'INSERT INTO chatbot_knowledge (content, embedding, metadata) VALUES ($1, $2, $3)',
                [chunk, JSON.stringify(embedding), JSON.stringify({ source, timestamp: new Date().toISOString() })]
            );
        } catch (e) {
            console.error("Embedding/DB error for chunk:", e);
        }
    }

    return { success: true, count: chunks.length };
};

/**
 * Queries the knowledge base and generates an answer using Gemini.
 */
export const chatWithKnowledge = async (question) => {
    if (!pool) return "I'm sorry, my database is currently offline. Please try again later.";
    if (!genAI) return "I'm sorry, my AI engine is not configured (missing API key). Please contact the administrator.";

    console.log(`\n🤖 Chatbot Processing Question: "${question}" (Gemini Flash)`);
    const startTime = performance.now();

    try {
        // 1. Fetch all knowledge base items (since we rank in-memory)
        const dbStart = performance.now();
        const kbResult = await pool.query('SELECT content, embedding FROM chatbot_knowledge');
        const dbEnd = performance.now();

        const kbItems = kbResult.rows.map(item => ({
            text: item.content,
            embedding: typeof item.embedding === 'string' ? JSON.parse(item.embedding) : item.embedding
        }));
        console.log(`⏱️ DB Fetch: ${(dbEnd - dbStart).toFixed(2)}ms (${kbItems.length} items)`);

        if (kbItems.length === 0) {
            return "I'm sorry, I don't have information on that yet. Please **download Google Chat** on your mobile device and send a message to **support.stride@deped.gov.ph** for further assistance.";
        }

        // 2. Get embedding for the question
        const embedStart = performance.now();
        const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const embedResult = await embedModel.embedContent(question);
        const qEmbedding = embedResult.embedding.values;
        const embedEnd = performance.now();
        console.log(`⏱️ Embedding Gen: ${(embedEnd - embedStart).toFixed(2)}ms`);

        // 3. Search for relevant chunks
        const searchStart = performance.now();
        const scoredChunks = kbItems.map(item => ({
            ...item,
            score: cosineSimilarity(qEmbedding, item.embedding)
        })).sort((a, b) => b.score - a.score);

        const topChunks = scoredChunks.slice(0, 3).filter(c => c.score > 0.4);
        const searchEnd = performance.now();
        console.log(`⏱️ Similarity Search: ${(searchEnd - searchStart).toFixed(2)}ms`);

        if (topChunks.length === 0) {
            return "I'm sorry, I don't have information on that yet. Please **download Google Chat** on your mobile device and send a message to **support.stride@deped.gov.ph** for further assistance.";
        }

        const context = topChunks.map(c => c.text).join("\n\n");

        // 4. Generate answer
        const prompt = `
Answer the user's question ONLY using the provided context. 
If the answer isn't in the context, say EXACTLY: "I'm sorry, I don't have information on that yet. Please **download Google Chat** on your mobile device and send a message to **support.stride@deped.gov.ph** for further assistance."
Do not use your own knowledge outside the context.

FORMATTING RULES:
- IMPORTANT: Use double newlines before starting any list.
- Use numbered lists (1. 2. 3.) for steps.
- Use bullet points (*) for lists of items.
- **BOLD** every single important name, button, role, and action using double asterisks: **text**.
- Example formatting: "Click the **'Login'** button if you are a **School Head**."
- Keep the response clean and well-spaced.

Context:
${context}

User Question: ${question}
`;

        const genStart = performance.now();
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const genEnd = performance.now();
        console.log(`⏱️ Gemini Generation: ${(genEnd - genStart).toFixed(2)}ms`);

        const totalTime = (performance.now() - startTime).toFixed(2);
        console.log(`✅ Chatbot Total Response Time: ${totalTime}ms\n`);

        return response.text();
    } catch (e) {
        console.error("Chat Error:", e);
        if (e.message.includes('safety')) {
            return "I'm sorry, I cannot answer that question as it violates safety guidelines.";
        }
        return "I'm sorry, I encountered an error while processing your request. Please try again later.";
    }
};
