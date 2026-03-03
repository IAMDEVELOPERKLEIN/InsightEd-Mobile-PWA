import XLSX from 'xlsx';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// --- ROBUST ENV PARSING (matching api/index.js) ---
dotenv.config();
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
    try {
        let envContent = fs.readFileSync('.env', 'utf16le');
        let match = envContent.match(/DATABASE_URL=(.+)/);
        if (!match) {
            envContent = fs.readFileSync('.env', 'utf8');
            match = envContent.match(/DATABASE_URL=(.+)/);
        }
        if (match) dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
    } catch (e) { console.error("Failed to parse .env", e.message); }
}
if (!dbUrl) dbUrl = 'postgres://postgres:password@localhost:5432/postgres';

const { Pool } = pg;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

// --- HELPERS ---
const parseExcelDate = (val) => {
    if (!val || val === '-' || val === 'N/A') return null;
    if (typeof val === 'number') {
        const d = new Date((val - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

const parseNumber = (val) => {
    if (val === null || val === undefined || val === '' || val === '-') return null;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/,/g, '').trim();
    return isNaN(Number(cleaned)) ? null : Number(cleaned);
};

const valueOrNull = (v) => (v === undefined || v === null || v === '' || v === '-') ? null : v;

async function runImport() {
    const filePath = path.resolve('public/LMS-CY-2024-SAVINGS-DATABASED-as-of-March 3,UPDATED.xlsx');
    console.log(`Reading Excel: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error("File not found!");
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = 'LMS 2024';
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
        console.error(`Sheet "${sheetName}" not found! Available sheets:`, workbook.SheetNames);
        process.exit(1);
    }

    const rawData = XLSX.utils.sheet_to_json(worksheet, { range: 6 });
    console.log(`Total rows read from range: ${rawData.length}`);

    // --- IDEMPOTENT START: Clear previous imports ---
    console.log("Cleaning up previous Excel imports...");
    await pool.query("DELETE FROM engineer_form WHERE actions = 'Imported from Excel'");

    // Get current max IPC for 2024 (should be 0 now after delete, but let's be safe)
    const ipcRes = await pool.query("SELECT ipc FROM engineer_form WHERE ipc LIKE 'INF-2024-%' ORDER BY ipc DESC LIMIT 1");
    let nextSeq = 1;
    if (ipcRes.rows.length > 0) {
        const lastIpc = ipcRes.rows[0].ipc;
        nextSeq = parseInt(lastIpc.split('-')[2]) + 1;
    }
    console.log(`Starting IPC Sequence: INF-2024-${String(nextSeq).padStart(5, '0')}`);

    let count = 0;
    let skipped = 0;
    for (const row of rawData) {
        const schoolId = String(row['School ID'] || '').trim();
        if (!schoolId || schoolId === 'null' || isNaN(Number(schoolId)) || schoolId === '') {
            skipped++;
            if (skipped < 5) console.log(`Skipping invalid row:`, JSON.stringify(row).substring(0, 100));
            continue;
        }

        const ipc = `INF-2024-${String(nextSeq++).padStart(5, '0')}`;
        const engineerName = row['Division Engineer'] || 'Division Engineer';

        const sql = `
            INSERT INTO engineer_form (
                project_name, school_name, school_id, region, division,
                status_of_construction_phase, accomplishment_percentage, status_as_of,
                target_completion_date, actual_completion_date, notice_to_proceed,
                contractor_name, approved_budget_for_contract, contract_amount, batch_of_funds, other_remarks,
                ipc, engineer_name,
                construction_start_date, project_category, scope_of_work,
                status_design_phase, contract_id, date_notice_of_award,
                issuance_of_invitation_to_bid, pre_bid_conference, opening_of_technical_proposal,
                opening_of_financial_proposal, request_for_quotation, negotiation, opening_of_quotation,
                actions
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
            )
        `;

        const values = [
            valueOrNull(row['School Name'] + ' - ' + (row['SCOPE OF WORK'] || 'Project')), // project_name fallback
            valueOrNull(row['School Name']),
            schoolId,
            valueOrNull(row['Region']),
            valueOrNull(row['Division']),
            valueOrNull(row['STATUS\r\nof CONSTRUCTION PHASE']) || 'Not Yet Started',
            parseNumber(row['PERCENTAGE OF COMPLETION']) || 0,
            new Date().toISOString().split('T')[0], // status_as_of
            parseExcelDate(row[' Target Completion Date ']),
            parseExcelDate(row['Actual Date of Completion']),
            parseExcelDate(row['Issuance of Notice to Proceed']),
            valueOrNull(row['Name of Contractor']),
            parseNumber(row['Project Allocation ']),
            parseNumber(row['CONTRACT AMOUNT']),
            valueOrNull(row['Batch']),
            valueOrNull(row['Other Remarks']),
            ipc,
            engineerName,
            parseExcelDate(row['Issuance of Notice to Proceed']), // construction_start_date fallback if not provided
            'Last Mile Schools', // project_category fallback based on sheet name
            valueOrNull(row['SCOPE OF WORK']),
            valueOrNull(row['STATUS\r\nof DESIGN PHASE']),
            valueOrNull(row['Contract ID']),
            parseExcelDate(row['Issuance of Notice of Award']),
            parseExcelDate(row['Issuance of Invitation to Bid']),
            parseExcelDate(row['Pre-Bid Conference']),
            parseExcelDate(row['Opening of Technical Proposal']),
            parseExcelDate(row['Opening of Financial Proposal Proposal']),
            parseExcelDate(row['Request for Quotation']),
            parseExcelDate(row['Negotiation']),
            parseExcelDate(row['Opening of Quotation']),
            'Imported from Excel'
        ];

        try {
            await pool.query(sql, values);
            count++;
            if (count % 10 === 0) console.log(`Imported ${count} rows...`);
        } catch (err) {
            console.error(`Error importing School ID ${schoolId}:`, err.message);
        }
    }

    console.log(`\n--- IMPORT COMPLETE ---`);
    console.log(`Successfully imported ${count} projects.`);
    console.log(`Skipped ${skipped} invalid rows.`);
    process.exit(0);
}

runImport().catch(err => {
    console.error("Import failed:", err);
    process.exit(1);
});
