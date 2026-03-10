import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Helper to handle both UTF-8 and UTF-16LE .env files
function getDatabaseUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    try {
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf16le');
            let match = envContent.match(/DATABASE_URL=(.+)/);
            if (!match) {
                envContent = fs.readFileSync(envPath, 'utf8');
                match = envContent.match(/DATABASE_URL=(.+)/);
            }
            if (match) {
                return match[1].trim().replace(/^['"]|['"]$/g, '');
            }
        }
    } catch (e) {
        console.error(`⚠️ Failed to parse .env: ${e.message}`);
    }
    return null;
}

const dbUrl = getDatabaseUrl();
const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

const projects = [
    {
        project_name: 'Project Alpha (Finance + Agency)',
        school_name: 'Benguet Central School',
        school_id: '100001',
        region: 'CAR',
        division: 'Benguet',
        engineer_id: 'ENG-001',
        mode_of_project: 'MOA',
        implementing_agencies: 'PGO Benguet',
        moa: 'MOA-2026-001',
        rta: 'RTA-2026-001',
        tranche_1: 5000000.00,
        status: 'Ongoing'
    },
    {
        project_name: 'Project Beta (Finance + Agency + Tranche 2)',
        school_name: 'Ifugao State University',
        school_id: '100002',
        region: 'CAR',
        division: 'Ifugao',
        engineer_id: 'ENG-001',
        mode_of_project: 'MOA',
        implementing_agencies: 'PGO Ifugao',
        moa: 'MOA-2026-002',
        rta: 'RTA-2026-002',
        tranche_1: 3000000.00,
        tranche_2: 2000000.00,
        status: 'Ongoing'
    },
    {
        project_name: 'Project Gamma (RTA Mode)',
        school_name: 'Kalinga National High School',
        school_id: '100003',
        region: 'CAR',
        division: 'Kalinga',
        engineer_id: 'ENG-002',
        mode_of_project: 'RTA',
        implementing_agencies: null,
        moa: null,
        rta: null,
        tranche_1: 1500000.00,
        status: 'Pending'
    },
    {
        project_name: 'Project Delta (MOA but No Tranche)',
        school_name: 'Mountain Province PS',
        school_id: '100004',
        region: 'CAR',
        division: 'Mountain Province',
        engineer_id: 'ENG-002',
        mode_of_project: 'MOA',
        implementing_agencies: 'PGO Kalinga',
        moa: 'MOA-2026-004',
        rta: 'RTA-2026-004',
        tranche_1: null,
        status: 'Ongoing'
    },
    {
        project_name: 'Project Epsilon (Direct)',
        school_name: 'Apayao Central Elementary',
        school_id: '100005',
        region: 'CAR',
        division: 'Apayao',
        engineer_id: 'ENG-003',
        mode_of_project: 'Direct',
        implementing_agencies: null,
        moa: null,
        rta: null,
        tranche_1: null,
        status: 'Completed'
    }
];

async function seed() {
    try {
        console.log("🚀 Connecting to database...");
        const client = await pool.connect();

        // 1. Ensure columns exist (Sanity Check)
        console.log("🛠️ Verifying schema...");
        await client.query(`
            ALTER TABLE engineer_form 
            ADD COLUMN IF NOT EXISTS mode_of_project VARCHAR(255),
            ADD COLUMN IF NOT EXISTS implementing_agencies TEXT,
            ADD COLUMN IF NOT EXISTS moa TEXT,
            ADD COLUMN IF NOT EXISTS rta TEXT,
            ADD COLUMN IF NOT EXISTS tranche_1 NUMERIC,
            ADD COLUMN IF NOT EXISTS tranche_2 NUMERIC,
            ADD COLUMN IF NOT EXISTS tranche_3 NUMERIC,
            ADD COLUMN IF NOT EXISTS status TEXT;
        `);

        // 2. Insert Projects
        console.log("🌱 Seeding projects...");
        for (const p of projects) {
            const query = `
                INSERT INTO engineer_form (
                    project_name, school_name, school_id, region, division, engineer_id,
                    mode_of_project, implementing_agencies, 
                    moa, rta, tranche_1, tranche_2, tranche_3, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING project_id;
            `;
            const values = [
                p.project_name, p.school_name, p.school_id, p.region, p.division, p.engineer_id,
                p.mode_of_project, p.implementing_agencies,
                p.moa, p.rta, p.tranche_1, p.tranche_2 || null, p.tranche_3 || null, p.status
            ];

            const res = await client.query(query, values);
            console.log(`✅ Inserted: "${p.project_name}" [ID: ${res.rows[0].project_id}]`);
        }

        console.log("\n✨ Seeding completed successfully!");
        client.release();
    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
    } finally {
        await pool.end();
    }
}

seed();
