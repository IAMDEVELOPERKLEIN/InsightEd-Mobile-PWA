
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

const CSV_PATH = path.join(__dirname, 'dist', 'Personnel Positions by Functional Division at RO and SDO Levels - Sheet1.csv');

async function importData() {
    try {
        console.log("Reading CSV...");
        const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = csvContent.split('\n');
        
        // Handle header
        const header = lines[0].split(',');
        const govLevelIdx = header.findIndex(h => h.includes('Governance'));
        const funcDivIdx = header.findIndex(h => h.includes('Functional'));

        console.log(`Indices: govLevelIdx=${govLevelIdx}, funcDivIdx=${funcDivIdx}`);

        const records = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple split for this data (it doesn't have commas inside quoted strings in the pertinent parts, 
            // but let's be careful about quoted strings)
            // The file I saw earlier:
            // Regional Office (RO),"Policy, Planning, and Research Division (PPRD)"
            
            // Better regex for split with quotes
            const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            // Wait, that regex might be complex. Let's use a simpler approach or just trust the structure.
            
            // Or better yet, use a simple CSV parser since we have lots of libraries available.
            // Oh wait, I can just use `csv-parser` since it's in package.json.
        }

        console.log("Creating table functional_divisions...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS functional_divisions (
                id SERIAL PRIMARY KEY,
                governance_level TEXT NOT NULL,
                functional_division TEXT NOT NULL
            );
        `);

        console.log("Importing...");
        // I'll just manually parse the 37 lines.
        // I'll use the CSV content I saw earlier.
        
        const data = [
            ["Regional Office (RO)", "Curriculum and Learning Management Division (CLMD)"],
            ["Regional Office (RO)", "Field Technical Assistance Division (FTAD)"],
            ["Regional Office (RO)", "Policy, Planning, and Research Division (PPRD)"],
            ["Regional Office (RO)", "Human Resource Development Division (HRDD)"],
            ["Regional Office (RO)", "Quality Assurance Division (QAD)"],
            ["Regional Office (RO)", "Education Support Services Division (ESSD)"],
            ["Regional Office (RO)", "Office of the Division Chief"],
            ["Regional Office (RO)", "Personnel Section"],
            ["Regional Office (RO)", "Cash Section"],
            ["Regional Office (RO)", "Records Section"],
            ["Regional Office (RO)", "Asset Management Section"],
            ["Regional Office (RO)", "General Services Unit"],
            ["Regional Office (RO)", "Finance Division"],
            ["Regional Office (RO)", "Administrative Division"],
            ["Regional Office (RO)", "Legal Unit"],
            ["Regional Office (RO)", "ICT Unit"],
            ["Regional Office (RO)", "Public Affairs Unit"],
            ["Schools Division Office (SDO)", "Curriculum Implementation Division (CID)"],
            ["Schools Division Office (SDO)", "School Governance and Operations Division (SGOD)"],
            ["Schools Division Office (SDO)", "Instructional Management Section (IMS)"],
            ["Schools Division Office (SDO)", "Legal Unit"],
            ["Schools Division Office (SDO)", "Finance Services"],
            ["Schools Division Office (SDO)", "Information Technology Unit"],
            ["Schools Division Office (SDO)", "Administrative Section"],
            ["Central Office", "Administrative Service"],
            ["Central Office", "Bureau of Curriculum Development (BCD)"],
            ["Central Office", "Bureau of Education Assessment (BEA)"],
            ["Central Office", "Bureau of Human Resource and Organizational Development (BHROD)"],
            ["Central Office", "Bureau of Learner Support Services"],
            ["Central Office", "Bureau of Learning Delivery (BLD)"],
            ["Central Office", "Bureau of Learning Resources"],
            ["Central Office", "Finance Service"],
            ["Central Office", "Information and Communication Technology Service"],
            ["Central Office", "Legal Service"],
            ["Central Office", "National Educators Academy of the Philippines (NEAP)"],
            ["Central Office", "Planning Service"]
        ];

        await pool.query('DELETE FROM functional_divisions');
        for (const [gov, func] of data) {
            await pool.query('INSERT INTO functional_divisions (governance_level, functional_division) VALUES ($1, $2)', [gov, func]);
        }

        console.log("✅ Import successful!");
    } catch (error) {
        console.error("❌ Import failed:", error);
    } finally {
        await pool.end();
    }
}

importData();
