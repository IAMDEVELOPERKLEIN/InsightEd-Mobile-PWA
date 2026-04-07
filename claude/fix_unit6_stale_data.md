# SYSTEM ROLE
You are an expert full-stack developer operating in a React/Vite PWA environment with a PostgreSQL backend. Your goal is to write clean, modular, and highly performant code based on the following specifications.

# 🌌 THE VIBE & AESTHETIC
**Data Integrity Guardian:** This fix must feel "rock solid." The system must strictly adhere to the "Single Source of Truth" principle. Users should feel confident that when they update their enrollment in Unit 2, it propagates flawlessly to Unit 6 without being "reset" by old cached data.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite), Framer Motion, TailwindCSS.
- **Data Source:** Unit 2 (Learners) provides the `enrolled` count; Unit 3 (Organized Classes) provides the `sections` count.
- **Storage:** Unit 6 (Resources) stores its furniture audit in `unit7_furniture` (JSON column in `ph_schools`).

# 📝 CORE REQUIREMENTS
1.  **Protect Source of Truth:** Prevent `Unit6SchoolResources.jsx` from overwriting current `enrolled` and `sections` counts during state restoration from `unit7_furniture`.
2.  **Seamless Integration:** The fix must occur silently during the `useEffect` initialization phase.
3.  **Audit Persistence:** Ensure that manual audit data (e.g., `armchair_wood_func`) is still correctly restored, while only the counts are refreshed.

# 🚀 STEP-BY-STEP EXECUTION PLAN
Please implement the feature by following these steps in strict order. Do not proceed to the next major step until all sub-steps are fully implemented and logically complete:

**Step 1: Locate and Validate the Restoration Loop**
- **1a:** Identify the code block in `src/components/modular/Unit6SchoolResources.jsx` (approx. lines 318-333) that restores `gradesData` from `d.unit7_furniture`.
- **1b:** Confirm that the current implementation uses a full spread `{ ...mergedExpectedGrades[idx], ...sg }` which causes the overwrite.

**Step 2: Implement Selective Merge Logic**
- **2a:** Refactor the merge logic to exclude `enrolled` and `sections` from the saved grade object (`sg`) before merging.
- **2b:** Use object destructuring to strip the stale fields: `const { enrolled, sections, ...auditData } = sg;`.
- **2c:** Update the state assignment: `mergedExpectedGrades[idx] = { ...mergedExpectedGrades[idx], ...auditData, isVerified: true };`.

**Step 3: Verification & Edge Case Handling**
- **3a:** Ensure that if a grade was previously "verified," it remains verified but with the updated counts.
- **3b:** Add a console log (guarded by a debug flag) to report whenever a count mismatch is detected and corrected during restoration.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a lightweight diagnostic script in the `useEffect` cleanup or a separate debug component.
- **Logic:** Add a `const DEBUG_MODE = true;` flag at the top of the component.
- **Telemetry:** When `DEBUG_MODE` is active, log a table comparing `Source-of-Truth` counts vs. `Restored-Cache` counts if they differ.
- **Validation:** Catch and log if `mergedExpectedGrades` becomes empty or malformed after the merge.

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT modify the database schema.
- AVOID changing the `d.unit7_furniture` data structure; only change how it's READ and MERGED.
- ENSURE that multigrade groupings (which are also merged in Phase 1) correctly inherit the fresh counts from their component grades.
