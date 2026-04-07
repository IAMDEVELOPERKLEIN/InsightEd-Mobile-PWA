# SYSTEM ROLE
You are an expert full-stack developer operating in a React / Vite / Tailwind environment. Your goal is to write clean, modular, and highly performant code to fix specific validation and UI bugs in the modular survey units.

# 🌌 THE VIBE & AESTHETIC
The app is a premium PWA for school monitoring. It needs to feel professional, trustworthy, and bulletproof. Validation errors should be clear but not jarring, and the flow through the wizard should be frictionless once data is correctly entered.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** Vite, React, TailwindCSS, Framer Motion, React Icons (Fi)
- **Key Patterns:** Modular wizard steps, local draft persistence, centralized outbox for offline sync.

# 📝 CORE REQUIREMENTS
1. **Unit 1 Hard-Block Validation**: Prevent abbreviations (ES, NHS, etc.) in the school name. It should be an official full name.
2. **Unit 1 Icon Fix**: Ensure `FiList` is available for annex selection inputs.
3. **Unit 2 SNED Flow**: Fix the validation logic for Step 5 to allow users to proceed when mainstreamed/self-contained data is provided, replacing the outdated `snedProgramType` check.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Unit 1 Refinement**
- **1a:** Add `FiList` to imports in `Unit1SchoolIdentity.jsx`.
- **1b:** Correct the abbreviation check `useEffect` (fix the logic inversion).
- **1c:** Update `handleNext` to block if `schoolNameWarning` is present on the school name step.

**Step 2: Unit 2 SNED Logic Overhaul**
- **2a:** Update `validateStep` logic for Step 5 in `Unit2Learners.jsx`.
- **2b:** Implement checks for `sned_mainstreamed` and `sned_self_contained` gender maps.
- **2c:** Ensure `snedOrganizedClassCount` is validated only when self-contained learners exist.

**Step 3: Polish & Verification**
- **3a:** Verify that the `FiList` icon renders correctly during annex selection.
- **3b:** Test the hard block on "ES" in Unit 1.
- **3c:** Test the end-to-end flow of Unit 2 Step 5.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// Diagnostic tool for Unit 1 & 2 fixes
const DEBUG_MODE = true;

const runDiagnostics = () => {
    if (!DEBUG_MODE) return;
    
    console.group("🔍 InsightEd Diagnostics");
    
    // Check Unit 1 School Name Abbreviation Regex
    const abbrList = ["ES", "NHS", "PS", "CS", "CES", "HS", "IS", "SHS", "ELEM", "MNHS"];
    const regex = new RegExp(`\\b(${abbrList.join('|')})\\b`, 'i');
    const testNames = ["National High School", "National HS", "Elementary School", "Mabitac ES"];
    
    testNames.forEach(name => {
        const match = name.match(regex);
        console.log(`[Unit 1] Name: "${name}" | Match: ${match ? match[1] : 'NONE'}`);
    });

    // Check Unit 2 SNED Gender Map Keys
    console.log("[Unit 2] Expected SNED keys: 'sned_mainstreamed', 'sned_self_contained'");
    
    console.groupEnd();
};

if (typeof window !== 'undefined') {
    window.runInsightEdDiagnostics = runDiagnostics;
}
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT use generic variable names.
- ENSURE all manual inputs for counts are sanitized and numeric.
- MAINTAIN compatibility with the offline outbox payload structure.
