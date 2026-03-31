# engineer_reflection_fix_plan.md

> **SYSTEMATIC RESILIENCE ACTIVE**

## Phase 1: High-Fidelity Diagnostics
* **Symptom:** Division Engineer logs in, but project list is empty or stale.
* **Root Cause 1 (Cache):** `IndexedDB` (`projects_cache`) is not cleared on logout, causing new users to see old data or empty cache from a previous failed fetch.
* **Root Cause 2 (Jurisdiction):** Backend `GET /api/projects` uses strict `ILIKE` on `division` name, which fails if `users` table has "SDO Benguet" while `engineer_form` has "Benguet".

## Phase 2: The Hardened Fix

### 1. Client-Side Cache Purge
I will update `src/context/AuthContext.jsx` to clear the projects cache on logout.

### 2. Backend Jurisdiction Resilience
I will update `api/index.js` to normalize division names before comparison.

```javascript
// Example normalization
const normalizedDivision = division.replace(/^(SDO|Division of)\s+/i, '').trim();
```

### 3. Frontend Fetch Prioritization
Force a "Fetching fresh data..." state if the cache is empty or if it's the first mount after login.

## Phase 3: Verification Plan
1. **Cross-User Test**: Log in as User A, view projects, log out, log in as User B. Verify projects update correctly.
2. **Partial Name Test**: Assign a user to "Benguet" and projects to "SDO Benguet". Verify they match.
