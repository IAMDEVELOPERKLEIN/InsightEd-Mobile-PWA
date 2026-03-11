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
 * Now supports separate question and answer fields.
 */
export const teachChatbot = async (question, answer = null, filePath = null) => {
    if (!pool) throw new Error("Database pool not initialized.");
    if (!genAI) throw new Error("GEMINI_API_KEY is not configured in .env.");

    let chunks = [];
    let source = "admin_paste";

    if (filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        try {
            const result = await pdfParse(dataBuffer);
            const content = result.text;
            source = path.basename(filePath);
            // For PDFs, we still chunk by double newline and treat as answers
            const rawChunks = content.split(/\n\s*\n/).filter(c => c.trim().length > 10);
            chunks = rawChunks.map(c => ({
                question: `Information from ${source}`,
                answer: c.trim()
            }));
        } catch (e) {
            console.error("PDF Parsing Error:", e);
            throw new Error("Failed to parse PDF file.");
        }
    } else if (question && answer) {
        // Single Q&A pair
        chunks = [{ question: question.trim(), answer: answer.trim() }];
    } else if (question && !answer) {
        // Bulk text handling (legacy/fallback)
        const rawChunks = question.split(/\n\s*\n/).filter(c => c.trim().length > 10);
        chunks = rawChunks.map(c => ({
            question: "General Information",
            answer: c.trim()
        }));
    }

    if (chunks.length === 0) return { success: false, message: "No content to ingest." };

    const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    for (const chunk of chunks) {
        try {
            // Embed the combined Q&A for better context matching
            const combined = `Question: ${chunk.question}\nAnswer: ${chunk.answer}`;
            const result = await embedModel.embedContent(combined);
            const embedding = result.embedding.values;

            await pool.query(
                'INSERT INTO chatbot_knowledge (question, answer, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5)',
                [
                    chunk.question, 
                    chunk.answer, 
                    combined, // Keep 'content' field for legacy compatibility
                    JSON.stringify(embedding), 
                    JSON.stringify({ source, timestamp: new Date().toISOString() })
                ]
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
        // 1. Fetch all knowledge base items
        const dbStart = performance.now();
        const kbResult = await pool.query('SELECT question, answer, embedding FROM chatbot_knowledge');
        const dbEnd = performance.now();

        const kbItems = kbResult.rows.map(item => ({
            question: item.question,
            answer: item.answer,
            text: `Question: ${item.question}\nAnswer: ${item.answer}`,
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
            await recordMissingQuestion(question);
            const fallback = "I'm sorry, I don't have information on that yet. Please **download Google Chat** on your mobile device and send a message to **support.stride@deped.gov.ph** for further assistance.";
            await logChatbotQuery(question, fallback, { type: 'fallback', reason: 'no_context' });
            return fallback;
        }

        const context = topChunks.map(c => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n---\n\n");

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
        // 1. Cost Protection / Quota Check
        const usageCount = await getDailyUsageCount();
        const QUOTA_LIMIT = 1400; // Safe threshold for 1,500 RPD Free Tier
        
        if (usageCount >= QUOTA_LIMIT) {
            const quotaMsg = "The AI is currently resting to stay within free usage limits. Please check back tomorrow, or contact **support.stride@deped.gov.ph** if you have urgent concerns.";
            await logChatbotQuery(question, quotaMsg, { type: 'quota_exceeded', count: usageCount });
            return quotaMsg;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const genEnd = performance.now();
        console.log(`⏱️ Gemini Generation: ${(genEnd - genStart).toFixed(2)}ms`);

        const totalTime = (performance.now() - startTime).toFixed(2);
        console.log(`✅ Chatbot Total Response Time: ${totalTime}ms\n`);

        const responseText = response.text();
        
        // If Gemini identifies it doesn't know the answer despite some chunks, record it
        if (responseText.includes("I'm sorry, I don't have information on that yet")) {
            await recordMissingQuestion(question);
            await logChatbotQuery(question, responseText, { type: 'fallback', reason: 'ai_low_confidence' });
        } else {
            await logChatbotQuery(question, responseText, { type: 'success' });
        }

        return responseText;
    } catch (e) {
        console.error("Chat Error:", e);
        const errorMsg = e.message.includes('safety') 
            ? "I encountered a safety restriction and cannot answer this. Please rephrase."
            : "An error occurred while processing your request.";
        
        await logChatbotQuery(question, errorMsg, { type: 'error', error: e.message });
        return errorMsg;
    }
};

/**
 * Updates an existing knowledge entry and re-generates its embedding.
 */
export const updateKnowledgeEntry = async (id, question, answer) => {
    if (!pool) throw new Error("Database pool not initialized.");
    if (!genAI) throw new Error("GEMINI_API_KEY is not configured in .env.");

    if (!question.trim() || !answer.trim()) throw new Error("Question and Answer cannot be empty.");

    try {
        const combined = `Question: ${question.trim()}\nAnswer: ${answer.trim()}`;
        const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await embedModel.embedContent(combined);
        const embedding = result.embedding.values;

        await pool.query(
            'UPDATE chatbot_knowledge SET question = $1, answer = $2, content = $3, embedding = $4, metadata = jsonb_set(metadata, \'{updated_at}\', $5) WHERE id = $6',
            [question.trim(), answer.trim(), combined, JSON.stringify(embedding), `"${new Date().toISOString()}"`, id]
        );

        return { success: true };
    } catch (e) {
        console.error("Update knowledge error:", e);
        throw e;
    }
};

/**
 * Deletes a knowledge entry.
 */
export const deleteKnowledgeEntry = async (id) => {
    if (!pool) throw new Error("Database pool not initialized.");

    try {
        await pool.query('DELETE FROM chatbot_knowledge WHERE id = $1', [id]);
        return { success: true };
    } catch (e) {
        console.error("Delete knowledge error:", e);
        throw e;
    }
};

/**
 * Records a question that the chatbot couldn't answer.
 */
export const recordMissingQuestion = async (question) => {
    if (!pool) return;
    try {
        // Check if this question already exists with a blank answer to avoid duplicates
        const existing = await pool.query(
            'SELECT id FROM chatbot_knowledge WHERE question = $1 AND (answer IS NULL OR answer = \'\')',
            [question.trim()]
        );

        if (existing.rows.length > 0) return;

        console.log(`📝 Recording missing question: "${question}"`);
        
        // Use a zero vector as placeholder for embedding (768 dimensions for gemini-embedding-001)
        const placeholderEmbedding = new Array(768).fill(0);

        await pool.query(
            'INSERT INTO chatbot_knowledge (question, answer, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5)',
            [
                question.trim(), 
                '', 
                `Question: ${question.trim()}\nAnswer: [Pending Response]`, 
                JSON.stringify(placeholderEmbedding),
                JSON.stringify({ source: 'auto_captured', timestamp: new Date().toISOString() })
            ]
        );
    } catch (e) {
        console.error("Failed to record missing question:", e);
    }
};

/**
 * Logs every chatbot interaction for analytical purposes.
 */
export const logChatbotQuery = async (question, response, metadata = {}) => {
    if (!pool) return;
    try {
        await pool.query(
            'INSERT INTO chatbot_queries (question, response, metadata) VALUES ($1, $2, $3)',
            [question, response, JSON.stringify(metadata)]
        );
    } catch (e) {
        console.error("Failed to log chatbot query:", e);
    }
};

/**
 * Returns the number of queries sent to the chatbot today.
 */
export const getDailyUsageCount = async () => {
    if (!pool) return 0;
    try {
        const res = await pool.query(
            'SELECT COUNT(*) FROM chatbot_queries WHERE created_at >= CURRENT_DATE'
        );
        return parseInt(res.rows[0].count);
    } catch (e) {
        console.error("Failed to get daily usage count:", e);
        return 0;
    }
};
