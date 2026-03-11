import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3";

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

    try {
        await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    } catch (e) {
        throw new Error(`Ollama server not reachable at ${OLLAMA_BASE_URL}. Please ensure Ollama is running.`);
    }

    let content = "";
    let source = "admin_paste";

    if (filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        try {
            const parser = new PDFParse({ data: dataBuffer });
            const result = await parser.getText();
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

    for (const chunk of chunks) {
        try {
            const resp = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    model: EMBEDDING_MODEL, 
                    prompt: chunk,
                    options: {
                        num_thread: 6
                    }
                })
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(errText);
            }

            const result = await resp.json();
            const embedding = result.embedding;

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

    console.log(`\n🤖 Chatbot Processing Question: "${question}"`);
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
            return "I'm sorry, I don't have information on that yet. Please contact the helpdesk for further assistance.";
        }

        // 2. Get embedding for the question
        const embedStart = performance.now();
        const embedResp = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: EMBEDDING_MODEL, 
                prompt: question,
                options: {
                    num_thread: 6
                }
            })
        });

        if (!embedResp.ok) {
            return "I'm sorry, I couldn't reach the local AI engine for embeddings. Is Ollama running?";
        }

        const embedResult = await embedResp.json();
        const qEmbedding = embedResult.embedding;
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
            return "I'm sorry, I don't have information on that yet. Please contact the helpdesk for further assistance.";
        }

        const context = topChunks.map(c => c.text).join("\n\n");

        // 4. Generate answer
        const prompt = `
Answer the user's question ONLY using the provided context. 
If the answer isn't in the context, say "I'm sorry, I don't have information on that yet. Please contact the helpdesk for further assistance."
Do not use your own knowledge outside the context.

Context:
${context}

User Question: ${question}
`;

        const genStart = performance.now();
        const generateResp = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: CHAT_MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    num_thread: 6,
                    num_ctx: 4096
                }
            })
        });

        if (!generateResp.ok) {
            return "I'm sorry, I couldn't reach the local AI engine to generate an answer. Is Ollama running?";
        }

        const genResult = await generateResp.json();
        const genEnd = performance.now();
        console.log(`⏱️ LLM Generation: ${(genEnd - genStart).toFixed(2)}ms`);

        const totalTime = (performance.now() - startTime).toFixed(2);
        console.log(`✅ Chatbot Total Response Time: ${totalTime}ms\n`);

        return genResult.response;
    } catch (e) {
        console.error("Chat Error:", e);
        return "I'm sorry, I encountered an error while processing your request. Please try again later.";
    }
};
