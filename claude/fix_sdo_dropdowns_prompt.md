# SYSTEM ROLE
You are an expert full-stack developer operating in a React/Node/Postgres environment. Your goal is to fix a critical data mismatch bug in the SDO dashboard where dropdowns are empty due to "SDO " prefix inconsistencies.

# 🌌 THE VIBE & AESTHETIC
"Invisible Robustness." The system should gracefully handle administrative naming variations without user intervention. The "Vibe" is about making the software "just work" regardless of whether the user profile says "SDO CALACA CITY" or "CALACA CITY".

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite)
- **Backend:** Node.js (Express) + pg (node-postgres)
- **Pattern:** Input Normalization Layer

# 📝 CORE REQUIREMENTS
1. Strip "SDO " and "SDO" (case-insensitive) prefixes from the `division` parameter in SDO-related endpoints.
2. Maintain backward compatibility for divisions that do not have the prefix.
3. Ensure no trailing/leading whitespace remains after cleaning.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Define Normalization Logic**
- **1a:** Add a `normalizeDivision` helper function at the top level of the SDO endpoints section in `api/index.js`.
- **1b:** Implement the regex `/^SDO\s+/i` replacement and `.trim()`.

**Step 2: Apply to Target Endpoints**
- **2a:** Modify `app.get('/api/sdo/location-options', ...)` to clean `req.query.division`.
- **2b:** Modify `app.get('/api/sdo/location-coordinates', ...)` to clean `req.query.division`.
- **2c:** Modify `app.get('/api/sdo/first-school-location', ...)` to clean `req.query.division`.

**Step 3: Verification & Diagnostics**
- **3a:** Create a diagnostic script `tmp/test_normalization.cjs` to verify the logic against edge cases.
- **3b:** Log the "Incoming vs Normalized" division names to the console during execution for transparency.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Create `tmp/test_normalization.cjs`:
```javascript
const normalizeDivision = (div) => {
    if (!div) return div;
    // Replace "SDO " or "SDO" at the start, case-insensitively, and trim
    return div.replace(/^SDO\s*/i, '').trim();
};

const tests = [
    { input: "SDO CALACA CITY", expected: "CALACA CITY" },
    { input: "sdo batangas", expected: "batangas" },
    { input: "CALACA CITY", expected: "CALACA CITY" },
    { input: "  SDO PALAWAN  ", expected: "PALAWAN" }
];

console.log("🧪 Testing Division Normalization...");
tests.forEach(t => {
    const result = normalizeDivision(t.input);
    const pass = result.toUpperCase() === t.expected.toUpperCase();
    console.log(`[${pass ? 'PASS' : 'FAIL'}] Input: "${t.input}" -> Result: "${result}" (Expected: "${t.expected}")`);
});
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT modify the user profile data itself; only normalize for the query.
- AVOID hardcoding specific city names; use generic prefix removal.
- ENSURE `req.query.region` is also handled if it has weird whitespace, though `division` is the primary suspect.
