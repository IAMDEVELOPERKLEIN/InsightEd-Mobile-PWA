# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js, React, and Azure Postgres environment. Your goal is to write clean, modular, and highly performant code based on the following specifications for hardening the Unit 8 sync pipeline.

# 🌌 THE VIBE & AESTHETIC
"Bulletproof & Enterprise" — This fix must eliminate all "mysterious" failures. The system should feel deterministic, with strictly enforced boundaries and high-concurrency resilience. Precision in diagnostics is prioritized over generic user-facing fallback messages.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React with `react-hook-form` and `framer-motion`.
- **Backend:** Node.js Express API.
- **Database:** Azure Postgres (Managed).
- **Validation:** Zod (Strict).
- **Key Patterns:** Zod Preprocessing for numeric sanitization, Explicit SQL Casting (`::jsonb`), and DDL/DML Separation.

# 📝 CORE REQUIREMENTS
1. **NaN Sanitization:** Intercept JavaScript `NaN` values at the Zod boundary and convert them to `null` before they reach Postgres NUMERIC columns.
2. **DDL Lock Avoidance:** Remove all `ALTER TABLE` or structural alignment logic from the API request handlers to prevent `AccessExclusiveLock` deadlocks in production.
3. **Explicit Data Casting:** Force all array-based payloads to be treated as `jsonb` within the SQL `INSERT/UPDATE` queries to handle legacy schema variations.
4. **Diagnostic Precision:** Replace generic "Database Alignment" failure alerts with specific error telemetry logging in the frontend.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Schema Hardening (Backend)**
- **1a:** In `api/index.js`, implement a `safeNumeric` Zod helper: `const safeNumeric = z.preprocess(val => (val === "" || val === null || Number.isNaN(Number(val)) ? null : Number(val)), z.number().nullable().optional());`.
- **1b:** Apply `safeNumeric` to all numeric fields in the `schoolLocationSchema` (e.g., `road_paved_pct`, `river_crossing_count`, all 14+ points of reference).

**Step 2: Database Concurrency & Logic (Backend)**
- **2a:** Locate the `/api/system/align-unit8` endpoint in `api/index.js` (or related files).
- **2b:** Remove the `ALTER TABLE` query. Refactor the endpoint to perform a **read-only audit** of the schema instead.
- **2c:** In the `POST /api/school-location` SQL query, ensure all array parameters ($3, $8, $12, $13, $35) have explicit `::jsonb` casts.

**Step 3: Frontend Payload & Diagnostics**
- **3a:** In `src/forms/SchoolLocation.jsx`, audit the `onSubmit` handler. Ensure `transportation_modes`, `hazards_experienced`, etc., are passed as raw JS arrays to the payload.
- **3b:** Update the `else` block in the sync handler to log `result.message` or `result.details` to the console for easier VM-side debugging.

**Step 4: Verification & Final Polish**
- **4a:** Execute a mock POST request with `{"river_crossing_count": "NaN"}` and verify it saves as `null`.
- **4b:** Verify that the `align-unit8` endpoint no longer acquires heavy locks.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// Unit 8 Resilience Monitor
const DEBUG_UNIT8 = true;
const monitorUnit8Payload = (payload) => {
    if (!DEBUG_UNIT8) return;
    const nanFields = Object.keys(payload).filter(k => typeof payload[k] === 'number' && isNaN(payload[k]));
    if (nanFields.length > 0) {
        console.warn("⚠️ [Unit8-Debug] NaN detected in fields:", nanFields);
    }
    console.log("📦 [Unit8-Debug] Final Submission Payload:", payload);
};
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT use `z.coerce.number()` without the `safeNumeric` preprocessor.
- NEVER execute `ALTER TABLE` inside an `app.post` or `app.get` route.
- Use absolute paths for all file modifications.
