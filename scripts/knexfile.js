import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Helper to handle both UTF-8 and UTF-16LE .env files (common in this project)
function getDatabaseUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

    if (fs.existsSync(envPath)) {
        try {
            let envContent = fs.readFileSync(envPath, 'utf16le');
            let match = envContent.match(/DATABASE_URL=(.+)/);
            if (!match) {
                envContent = fs.readFileSync(envPath, 'utf8');
                match = envContent.match(/DATABASE_URL=(.+)/);
            }
            if (match) {
                return match[1].trim().replace(/^['"]|['"]$/g, '');
            }
        } catch (e) {
            console.error("⚠️ Failed to parse .env in knexfile:", e.message);
        }
    }
    return null;
}

const dbUrl = getDatabaseUrl();

const config = {
    client: 'pg',
    connection: {
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    },
    pool: {
        min: 2,
        max: 10
    }
};

export default config;
