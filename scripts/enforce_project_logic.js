import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Helper to handle both UTF-8 and UTF-16LE .env files (common in this project)
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

const isDryRun = process.argv.includes('--dry-run');

/**
 * Validates a project record and returns its highest eligible tier.
 */
function checkProjectStatus(project) {
    let currentTier = 'EFD';

    const isMoaMode = project.mode_of_project === 'MOA';
    const hasMoaId = !!(project.moa && String(project.moa).trim());
    const hasRtaId = !!(project.rta && String(project.rta).trim());

    if (isMoaMode && hasMoaId && hasRtaId) {
        currentTier = 'FINANCE';

        const hasTranche1 = project.tranche_1 && parseFloat(project.tranche_1) > 0;
        const hasAgency = !!(project.implementing_agencies && String(project.implementing_agencies).trim());

        if (hasTranche1 && hasAgency) {
            currentTier = 'AGENCY';
        }
    }

    return currentTier;
}

async function enforceLogic() {
    if (isDryRun) {
        console.log('🚀 RUNNING IN AUDIT/DRY-RUN MODE. No records will be updated.');
    }

    try {
        const BATCH_SIZE = 100;
        let offset = 0;
        let hasMore = true;

        const stats = {
            total: 0,
            efd: 0,
            finance: 0,
            agency: 0,
            orphans: 0
        };

        console.log('📊 Starting logic enforcement processing...');

        while (hasMore) {
            const res = await pool.query('SELECT * FROM engineer_form ORDER BY project_id DESC LIMIT $1 OFFSET $2', [BATCH_SIZE, offset]);
            const projects = res.rows;

            if (projects.length === 0) {
                hasMore = false;
                break;
            }

            for (const project of projects) {
                stats.total++;
                const tier = checkProjectStatus(project);

                if (tier === 'AGENCY') stats.agency++;
                else if (tier === 'FINANCE') stats.finance++;
                else if (tier === 'EFD') stats.efd++;

                if (project.mode_of_project === 'MOA') {
                    const missing = [];
                    if (!project.moa || !String(project.moa).trim()) missing.push('MOA ID');
                    if (!project.rta || !String(project.rta).trim()) missing.push('RTA ID');

                    if (missing.length > 0) {
                        stats.orphans++;
                        console.warn(`⚠️ ORPHAN PROJECT [ID: ${project.project_id}]: "${project.project_name}" is MOA but missing: ${missing.join(', ')}`);
                    }
                }

                // Only log details for our recently seeded projects (ID >= 424) for verification
                if (project.project_id >= 424) {
                    console.log(`🔍 [ID: ${project.project_id}] "${project.project_name}" -> Highest Tier: ${tier}`);
                }
            }

            offset += BATCH_SIZE;
        }

        console.log('\n✅ Processing Complete.');
        console.log('------------------------------------------------');
        console.log(`Total Projects Scanned: ${stats.total}`);
        console.log(`Tiers: AGENCY: ${stats.agency} | FINANCE: ${stats.finance} | EFD: ${stats.efd}`);
        console.log(`Orphans Identified: ${stats.orphans}`);
        console.log('------------------------------------------------');

    } catch (err) {
        console.error(`❌ Fatal Error: ${err.message}`);
    } finally {
        await pool.end();
    }
}

enforceLogic();
