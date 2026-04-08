# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Express) and React environment. Your goal is to implement Location Filter Normalization and fix EFD Dashboard Filter visibility issues.

# 🌌 THE VIBE & AESTHETIC
This is a "Bulletproof Data Integrity" task. The system must handle messy user input (extra spaces, inconsistent prefixes like "SDO ") gracefully and ensure that dashboard filters are always visible and functional. The aesthetic is "Reliable & Robust".

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js, Express, PostgreSQL (pg driver).
- **Frontend:** React, TailwindCSS, custom UI components.
- **Key Pattern:** SQL Query Building with `ILIKE` and `regexp_replace` for fuzzy matching.

# 📝 CORE REQUIREMENTS
1.  **Backend Normalization**:
    *   Update `/api/projects` and `/api/dashboard/efd-summary` location filters.
    *   Use `TRIM(column) ILIKE TRIM($n)` for Region, Province, Municipality, District, and City.
    *   Use `regexp_replace(TRIM(division), '^(SDO|Division of)[-\\s]+', '', 'i') ILIKE $n` for Division matching.
    *   Apply this normalization both for user jurisdiction checks and query parameter filters.
2.  **Frontend Fix**:
    *   Update `FilterDrawer.jsx` to accept and use `categoryOptions`, `yearOptions`, and `batchOptions`.
    *   Ensure `EFDHome.jsx` passes these options to `FilterDrawer`.
3.  **Prompt Archive**:
    *   Ensure the implementation follows the provided plan.

# 🚀 STEP-BY-STEP EXECUTION PLAN
Please implement the feature by following these steps in strict order:

**Step 1: Backend Filter Normalization**
- **1a:** Modify `api/index.js` to update `/api/dashboard/efd-summary` location filters (lines ~9946-10050). Correct the regex escaping and ensure all comparisons are normalized.
- **1b:** Modify `api/index.js` to update `/api/projects` location filters (lines ~10084-10300). Apply the same normalization logic.

**Step 2: Frontend Filter Visibility Fix**
- **2a:** Modify `src/components/FilterDrawer.jsx` to destructure and use `categoryOptions`, `yearOptions`, and `batchOptions` from props.
- **2b:** Update the derivation logic in `FilterDrawer.jsx` to prefer passed-in options over `sourceData` derivation for these fields.
- **2c:** Verify `src/modules/EFDHome.jsx` correctly passes `allCategories`, `allYears`, and `allBatches`.

**Step 3: Verification**
- **3a:** Create a temporary scratch script `/tmp/test_sql_normalization.sql` or similar to verify the `regexp_replace` logic works for various cases (e.g., "SDO ", "Division of ", "SDO-").
- **3b:** Manually verify the filter drawer in the EFD dashboard.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Add a small diagnostic log in the backend route to log the final `whereClauses` and `queryParams` when a filter is applied:
```javascript
if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 Filter Query Params:', queryParams);
    console.log('🔍 SQL WHERE Clauses:', whereClauses.join(' AND '));
}
```

# 🛑 CONSTRAINTS & GUARDRAILS
- ALWAYS handle `null` or `undefined` values before calling `.trim()` or `.replace()`.
- DO NOT break existing `OFFSET` or `LIMIT` logic.
- Ensure `regexp_replace` uses the `'i'` flag for case-insensitive prefix stripping.
