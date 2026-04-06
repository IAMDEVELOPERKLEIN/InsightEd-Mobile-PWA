# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js/PostgreSQL environment. Your goal is to write clean, modular, and highly performant code based on the following specifications.

# 🌌 THE VIBE & AESTHETIC
The fix must be surgical and invisible to the user—the interface should just "work" as expected. No UI changes are needed, only a robust data pipeline that handles the common "double space" anomaly in Philippine geographical data.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite)
- **Backend:** Node.js with Express and `pg` (PostgreSQL)
- **Database:** PostgreSQL (Azure-hosted)
- **Key Patterns:** Space-insensitive SQL queries using `REGEXP_REPLACE`.

# 📝 CORE REQUIREMENTS
1. **Normalize Database:** Eliminate double spaces in the `municipality` column of `ph_barangays` and `ph_schools`.
2. **Harden API Queries:** Update location endpoints in `api/index.js` to collapse internal spaces in both the column and the parameter during comparisons.
3. **Zero-Shot Reliability:** The solution must be idempotent and safely handle various capital/city naming conventions.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Database Forensics & Normalization**
- **1a:** Identify all municipalities with internal double spaces using `WHERE municipality LIKE '%  %'`.
- **1b:** Execute `UPDATE` queries using `REGEXP_REPLACE(municipality, '\\s+', ' ', 'g')`.

**Step 2: API Logic Hardening**
- **2a:** Locate `GET /api/locations/barangays` in `api/index.js`.
- **2b:** Wrap municipality comparisons in `REGEXP_REPLACE(..., '\\s+', ' ', 'g')`.
- **2c:** Repeat for other location-dependent endpoints (`/api/locations/schools`, etc.).

**Step 3: Verification**
- **3a:** Verify that "LEGAZPI CITY (Capital)" correctly retrieves the list of barangays using a single-space query.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
const DEBUG_MODE = true;
async function diagnoseLocation(municipalityName) {
    if (!DEBUG_MODE) return;
    console.log(`[Diagnostic] Checking "${municipalityName}"...`);
    const results = await pool.query("SELECT DISTINCT municipality FROM ph_barangays WHERE municipality ILIKE $1", [`%${municipalityName}%`]);
    results.rows.forEach(r => {
        console.log(`Found: "${r.municipality}" | Length: ${r.municipality.length}`);
        if (r.municipality.includes('  ')) console.warn("⚠️ DOUBLE SPACE DETECTED");
    });
}
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT use `REPLACE(..., '  ', ' ')` as it only handles one double space; use `REGEXP_REPLACE` for multi-space resilience.
- ENSURE `TRIM` is applied before normalization to handle leading/trailing edge cases.
