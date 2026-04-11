# Session Summary: Unit 8 Submission Failures & Error Diagnostics Overhaul
**Date:** 2026-04-11  
**Engineer:** Antigravity / Claude Code (claude-sonnet-4-6)  
**Session Duration:** Single focused session  
**Severity:** High (certain devices could not submit Unit 8 at all)

---

## 1. Presenting Symptom

Some users on certain devices were unable to submit their completed **Unit 8 (School Terrain & Location Profile)** form. The hypothesis going into the session was a JSONB vs TEXT data type error in the database. The investigation confirmed that hypothesis was partially correct but revealed three additional root causes that were silently blocking submission before any data ever reached the database.

---

## 2. Investigation — Layer by Layer

### 2.1 Frontend: `isStep3Valid()` — The Primary Blocker

**File:** `src/forms/SchoolLocation.jsx`  
**Function:** `isStep3Valid()` and `nextStep()`

The submit button (`currentStep === 5`) and the "Next" button at step 3 were both gated on `isStep3Valid()`. The implementation was:

```js
// BEFORE (broken)
const isStep3Valid = () => {
    return !watchedRefPoints.some(val => {
        return val === "" || val === null || parseFloat(val) === 0 || isNaN(parseFloat(val));
    });
};
```

This used `.some()` which returns `true` if **any** of the 14 reference-point fields (`emergency_response_mins`, `proximity_hospital_km`, etc.) was `0`, null, or empty. Since **all 14 fields default to `0`**, the function returned `false` (invalid) unless every single field was filled with a non-zero value.

A school located directly adjacent to the barangay hall would have `proximity_brgy_hall_km = 0` — a legitimate zero. The old check treated this as invalid, permanently disabling the button.

`nextStep()` had the same guard duplicated independently with an `alert()`, meaning even after `isStep3Valid()` was fixed, clicking "Next" would still fire the alert and abort navigation.

**Fix:** Replaced both with a `SUM > 0` check, matching the server-side `sumRefPoints > 0` logic already in `onSubmit`.

```js
// AFTER (fixed)
const isStep3Valid = () => {
    const sum = watchedRefPoints.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    return sum > 0;
};
```

---

### 2.2 Frontend: Range Slider NaN on Older Android WebViews

**File:** `src/forms/SchoolLocation.jsx`  
**useEffect:** `road_paved_pct` → `road_unpaved_pct` sync

On certain older Android WebViews, `<input type="range">` does not fire reliably and can yield `undefined` or `NaN`. The useEffect was:

```js
// BEFORE
useEffect(() => {
    setValue('road_unpaved_pct', 100 - watchPaved);
}, [watchPaved, setValue]);
```

If `watchPaved` was `NaN`, then `100 - NaN = NaN`. `road_unpaved_pct` would be set to `NaN`, which `safeNumeric` converts to `null` on the server. The Zod refine (`paved + unpaved === 100`) would then evaluate `0 + 0 = 0 ≠ 100` and return a 400 error.

**Fix:**
```js
// AFTER
useEffect(() => {
    const paved = Number(watchPaved);
    if (!isNaN(paved)) {
        setValue('road_unpaved_pct', 100 - paved);
    }
}, [watchPaved, setValue]);
```

---

### 2.3 Backend: Zod `z.boolean()` Rejects String Values

**File:** `api/index.js`  
**Schema:** `schoolLocationSchema`

Five fields (`near_cliff_ravine`, `near_water`, `has_insurgency_threats`, `river_crossing_on_foot`, `weather_isolation`) used `z.boolean().optional()`. Zod's strict boolean parser rejects string values like `"true"` / `"false"`. On some browsers and in certain offline-sync flows, checkbox values can arrive as strings, causing a Zod 400 error with no visible feedback to the user.

**Fix:** Added a `safeBoolean` preprocessor (same pattern as the existing `safeNumeric`):

```js
const safeBoolean = z.preprocess(val => {
  if (val === 'true'  || val === '1' || val === 1) return true;
  if (val === 'false' || val === '0' || val === 0) return false;
  return val; // native true/false falls through, accepted by z.boolean()
}, z.boolean().optional());
```

Applied to all five boolean fields in `schoolLocationSchema`.

---

### 2.4 Backend: Zod Refine `=== 100` — Strict Equality Fails on Null

**File:** `api/index.js`  
**Schema:** `schoolLocationSchema` refine

The schema had a `.refine()` that checked:
```js
(Number(data.road_paved_pct) || 0) + (Number(data.road_unpaved_pct) || 0) === 100
```

When `safeNumeric` converted NaN inputs to `null`, this became `0 + 0 = 0 ≠ 100`, causing an unexpected 400. The refine was also unreachable for devices where the slider simply didn't fire.

**Fix:** Added a `.transform()` before the refine that auto-corrects `road_unpaved_pct` so it always sums to 100. The refine is then a safety net with ±1 floating-point tolerance:

```js
}).transform(data => {
  const paved = Number(data.road_paved_pct) || 0;
  return { ...data, road_unpaved_pct: 100 - paved };
}).refine(data => {
  const sum = (Number(data.road_paved_pct) || 0) + (Number(data.road_unpaved_pct) || 0);
  return Math.abs(sum - 100) <= 1;
}, { message: "Paved and unpaved percentages must sum to 100", path: ["road_paved_pct"] });
```

---

### 2.5 Backend: Auto-Migration JSONB Coerce — Wrong USING Clause

**File:** `api/index.js`  
**Function:** `autoMigrate()` — boot-level only, not a hot path

The startup migration attempted to coerce `TEXT` and `TEXT[]` columns to `JSONB` for `transportation_modes`, `hazards_experienced`, `water_proximity`, `natural_calamities`, and `anthropogenic_threats`. The original USING clause was:

```sql
ALTER TABLE school_location_profiles
  ALTER COLUMN col TYPE JSONB USING to_jsonb(col);
```

**The bug:** `to_jsonb()` applied to a `TEXT` column containing a JSON string literal (e.g., `'["Bus","Jeep"]'`) produces a doubly-encoded JSON string scalar: `"\"[\\\"Bus\\\",\\\"Jeep\\\"]\"`. This is a JSON string, not an array. Subsequent reads would return this malformed value to the frontend.

`to_jsonb()` is only correct for `TEXT[]` (PostgreSQL native array) columns — it correctly serialises a PG array into a JSON array.

**Fix:** The migration now branches on the `data_type` from `information_schema`:

```sql
IF col_type = 'ARRAY' THEN
  -- TEXT[] → correct to use to_jsonb()
  ALTER TABLE ... ALTER COLUMN col TYPE JSONB USING to_jsonb(col);
ELSE
  -- TEXT containing JSON string → cast directly
  ALTER TABLE ... ALTER COLUMN col TYPE JSONB USING
    CASE WHEN col IS NULL OR col = '' THEN '[]'::jsonb
         ELSE col::jsonb
    END;
END IF;
```

---

### 2.6 Error Handling: `alert()` Replaced with Inline Diagnostic Panel

**File:** `src/forms/SchoolLocation.jsx`

The original error path called `alert()` which:
- Blocks the JS thread
- Cannot be scrolled or copied
- Disappears on dismiss with no way to recover
- Used `console.groupCollapsed` (hidden by default in DevTools)
- Dropped PostgreSQL error fields (`code`, `detail`, `constraint`, `table`) that the server was already sending back
- Produced `": message"` for schema-level Zod errors (empty `path` array)

**Fix:** Replaced with a stateful `submitError` object driving a `motion.div` panel rendered just above the bottom action bar:

- **Amber panel** — Zod validation errors, each showing `field [zod_code]: message`. Schema-level errors (empty `path`) labelled as `(schema rule)` instead of blank.
- **Rose panel** — Server/DB errors, surfacing `PG Code`, `PG Detail`, `Constraint`, `Table`.
- **Slate panel** — Network/fetch errors with actionable guidance (`pm2 logs`).
- Panel cleared automatically on successful resubmit.
- `console.error` + `console.table` replace `console.groupCollapsed` — errors visible immediately in DevTools.

---

## 3. Files Changed

| File | Change Type |
|---|---|
| `src/forms/SchoolLocation.jsx` | Bug fix + UX improvement |
| `api/index.js` | Bug fix (Zod schema + boot migration) |
| `src/Login.jsx` | Separate bugfix (see below) |

---

## 4. Bonus Fix: Login Identifier & Role-Mismatch

**File:** `src/Login.jsx`  
**Committed separately as `5cbb363`**

Two pre-existing issues were also committed:

1. **Email vs school_id field routing:** If the identifier contained `@`, it was sometimes sent to the `school_id` field when the school-head toggle was active. Fixed with `const isEmail = identifier.includes('@')` — email addresses are always routed to the `email` field regardless of toggle state.

2. **Silent role-mismatch failure:** When a user logged into a portal incompatible with their role, the app stayed on the login page with no feedback. Added a clear `alert()` explaining which role was detected and which portal requires a different account.

---

## 5. Commits

| Hash | Message |
|---|---|
| `9f93006` | `fix: resolve Unit 8 submission failures and improve error diagnostics` |
| `5cbb363` | `fix: correct login role-mismatch alert and email identifier detection` |

---

## 6. Pre-Existing Gap Noted (Not Fixed)

The `autoMigrate()` function does not use `pg_try_advisory_lock`. In PM2 cluster mode with multiple worker processes, two workers could race to run the migration simultaneously on startup. The idempotent `col_type != 'jsonb'` check partially mitigates this (the second ALTER would be a no-op), but there is a narrow race window. Recommend adding advisory locking in a future session per `senior-dev.md §5`.

---

*Generated by Antigravity Documenter v1.0 — Session 2026-04-11*
