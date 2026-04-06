# SYSTEM ROLE
You are an expert full-stack developer operating in a React / Vite / React Router environment. Your goal is to write clean, modular, and highly performant code to optimize the user experience in the EFD Portal.

# 🌌 THE VIBE & AESTHETIC
The goal is a "lightning-fast, snap-back" experience. When a user navigates back from a project details page, they should see their previous list (correct page, filters, and search) instantly without a full-page loading spinner. It should feel like the app "remembers" exactly where they were.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React with Vite, React Router (HashRouter)
- **State management:** Local component state with persistence to `localStorage` and `sessionStorage`.
- **Key Pattern:** Stale-While-Revalidate (SWR) style loading—show cached data immediately, then update in the background.

# 📝 CORE REQUIREMENTS
1. Persist the `currentPage` of the EFD Monitoring project list in `localStorage`.
2. Cache the current page's `projects` and `pagination` meta-data in `sessionStorage`.
3. On mount, use the cached data to hydrate the UI immediately, bypassing the primary loading state.
4. Ensure the background fetch still triggers to keep the data fresh.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: State Initialization & Persistence**
- **1a:** Update `currentPage` state in `EFDMonitoring.jsx` to initialize from `localStorage.getItem('efd_currentPage')`.
- **1b:** Initialize `projects` and `pagination` from `sessionStorage.getItem('efd_cached_projects')` and `sessionStorage.getItem('efd_cached_pagination')`.
- **1c:** If cached data exists, set `loading` to `false` initially.

**Step 2: Logic Wiring**
- **2a:** Add `currentPage` to the `useEffect` that syncs state to `localStorage`.
- **2b:** Update `fetchProjectsPaged` to save the successful response data and pagination to `sessionStorage`.
- **2c:** Ensure `loading` and `isRefreshing` states correctly handle the transition from cached to fresh data without jarring UI jumps.

**Step 3: Refinement**
- **3a:** Verify that changing filters resets the `currentPage` (already there, but ensure it clears cache if needed or updates it).

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Add a simple telemetry log to monitor state hydration:
```javascript
const DEBUG_MODE = true;
useEffect(() => {
  if (DEBUG_MODE) {
    console.log("[EFD_CACHE] Hydrated projects count:", projects.length);
    console.log("[EFD_CACHE] Current Page:", currentPage);
  }
}, [projects, currentPage]);
```

# 🛑 CONSTRAINTS & GUARDRAILS
- Use `JSON.parse` and `JSON.stringify` safely for storage.
- Do not use `localStorage` for the projects list itself (avoid size limits and cross-tab pollution); use `sessionStorage`.
- Maintain existing filter persistence logic.
