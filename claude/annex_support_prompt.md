# SYSTEM ROLE
You are an expert full-stack developer operating in a React, Framer Motion, and Node.js (PostgreSQL) environment. Your goal is to write clean, modular, and highly performant code to support multiple annexes in a school identification form.

# 🌌 THE VIBE & AESTHETIC
The UI must feel fluid and responsive. As a user adds annexes, the fields should animate in with a "spring" effect. Real-time validation (fetching school names) should happen as soon as a 6-digit ID is entered, with a subtle loading spinner and a success/error checkmark. The transition between "Unit 1" steps should remain buttery smooth.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, Framer Motion, TailwindCSS.
- **Backend/State:** Node.js Express API, PostgreSQL (pg), client-side state in `Unit1SchoolIdentity.jsx` using `useState`.
- **Offline Support:** IndexedDB (via `src/db.js`) used for drafts and outbox.
- **Key Patterns:** JSONB column in Postgres for flexible data structures (`annex_details`).

# 📝 CORE REQUIREMENTS
1. If `school_type === "with_annex"`, display a numeric input for "How many annexes?".
2. Dynamically generate $N$ input fields for Annex School IDs based on the count.
3. Automatically fetch the school name for each Annex ID via `/api/schools_iern/:id` when 6 digits are provided.
4. Persist the list of annexes (`{ id, name }[]`) to a new `annex_details` JSONB column in `ph_schools`.
5. Ensure the data is reflected in Review Mode and saved in offline drafts.

# 🚀 STEP-BY-STEP EXECUTION PLAN
Please implement the feature by following these steps in strict order:

**Step 1: Database Schema Expansion**
- **1a:** In `api/index.js`, add a logic gate inside the POST handler to ensure `annex_details` exists as a JSONB column in `ph_schools`.

**Step 2: Frontend State & Integration**
- **2a:** Add `annex_details: []` to the initial `formData` state in `Unit1SchoolIdentity.jsx`.
- **2b:** Update the `handleChange` and `handleSubmit` logic to include `annex_details`.

**Step 3: Dynamic UI Implementation (Step 6)**
- **3a:** Implement a "How many annexes?" input that updates the number of fields.
- **3b:** Render the list of inputs with Framer Motion animations.
- **3c:** Implement the auto-fetch logic for each individual annex input.

**Step 4: Review Mode & Polish**
- **4a:** Update the summary view to list all annexes if they exist.
- **4b:** Ensure `isStep6Valid` correctly validates the full list of annexes.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Add a `console.log` trace in the `handleSubmit` specifically for the `annex_details` payload to verify the array structure before it hits the API. Monitor the `annex_details` state updates in the `useEffect` used for draft saving.

# 🛑 CONSTRAINTS & GUARDRAILS
- Maintain the "Chunky" UI style (rounded-3xl, heavy font weights).
- DO NOT break the existing "Mother School" logic for schools that are "Annexes" (`extension`).
- Use the existing `chunkyInput` and `chunkySelect` constants for styling.
