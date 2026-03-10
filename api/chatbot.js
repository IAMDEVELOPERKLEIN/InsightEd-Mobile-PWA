import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3";
const STORAGE_PATH = path.join(process.cwd(), 'storage', 'chatbot_knowledge_ollama.json');

// --- DATABASE SIMULATION (InMemory Vector Store) ---
let knowledgeBase = [];

// Load existing knowledge if any
if (fs.existsSync(STORAGE_PATH)) {
    try {
        knowledgeBase = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
        console.log(`Loaded ${knowledgeBase.length} knowledge chunks.`);
    } catch (e) {
        console.error("Error loading knowledge base:", e);
    }
}

const saveKnowledge = () => {
    if (!fs.existsSync(path.dirname(STORAGE_PATH))) {
        fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
    }
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(knowledgeBase, null, 2));
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
    // No external API key needed for Ollama
    // But we check if the Ollama server is accessible
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

    // Simple chunking (by paragraphs or fixed length)
    const chunks = content.split(/\n\s*\n/).filter(c => c.trim().length > 10);

    for (const chunk of chunks) {
        try {
            const resp = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: chunk })
            });

            if (!resp.ok) {
                const errText = await resp.text();
                console.error("Embedding API Error:", errText);
                throw new Error(errText);
            }

            const result = await resp.json();
            const embedding = result.embedding;

            knowledgeBase.push({
                text: chunk,
                embedding: embedding,
                metadata: { source, timestamp: new Date().toISOString() }
            });
        } catch (e) {
            console.error("Embedding error for chunk:", e);
        }
    }

    saveKnowledge();
    return { success: true, count: chunks.length };
};

/**
 * Queries the knowledge base and generates an answer using Gemini.
 */
export const chatWithKnowledge = async (question) => {
    if (knowledgeBase.length === 0) {
        return "I'm sorry, I don't have information on that yet. Please contact the helpdesk for further assistance.";
    }

    try {
        // 1. Get embedding for the question via Ollama
        const embedResp = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: question })
        });

        if (!embedResp.ok) {
            return "I'm sorry, I couldn't reach the local AI engine for embeddings. Is Ollama running?";
        }

        const embedResult = await embedResp.json();
        const qEmbedding = embedResult.embedding;

        // 2. Search for relevant chunks
        const scoredChunks = knowledgeBase.map(item => ({
            ...item,
            score: cosineSimilarity(qEmbedding, item.embedding)
        })).sort((a, b) => b.score - a.score);

        const topChunks = scoredChunks.slice(0, 3).filter(c => c.score > 0.4); // Threshold

        if (topChunks.length === 0) {
            return "I'm sorry, I don't have information on that yet. Please contact the helpdesk for further assistance.";
        }

        const context = topChunks.map(c => c.text).join("\n\n");

        // 3. Generate answer via Ollama
        const prompt = `
Answer the user's question ONLY using the provided context. 
If the answer isn't in the context, say "I'm sorry, I don't have information on that yet. Please contact the helpdesk for further assistance."
Do not use your own knowledge outside the context.

Context:
${context}

User Question: ${question}
`;

        const generateResp = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: CHAT_MODEL,
                prompt: prompt,
                stream: false
            })
        });

        if (!generateResp.ok) {
            return "I'm sorry, I couldn't reach the local AI engine to generate an answer. Is Ollama running?";
        }

        const genResult = await generateResp.json();
        return genResult.response;
    } catch (e) {
        console.error("Chat Error:", e);
        return "I'm sorry, I encountered an error while processing your request. Please try again later.";
    }
};
