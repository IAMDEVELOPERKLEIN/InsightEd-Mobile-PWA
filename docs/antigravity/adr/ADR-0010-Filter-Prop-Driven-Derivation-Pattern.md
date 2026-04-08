# ADR-0010: Filter Prop-Driven Derivation Pattern

## Status
Accepted

## Context
`FilterDrawer.jsx` is a generic multi-purpose filter panel used across multiple dashboard views. Internally it derives filter options (`categories`, `years`, `batches`) by scanning the `sourceData` prop — either the `locations` array or the `projects` array passed in by the parent.

This worked acceptably on small datasets, but broke down in the EFD Dashboard (`EFDHome.jsx`) because:

1. **Pagination**: `projects` contains only the current page (up to 50 rows). Deriving `years` and `batches` from 50 rows produces an incomplete option list — the user can only filter by years visible in the current page.
2. **Static canonical categories**: The `allCategories` list in `EFDHome.jsx` is a hand-authored, exhaustive enumeration of all valid project categories (12 entries). Deriving categories from page data produces a subset and loses canonical casing/spelling.
3. **Location derivation is correct as-is**: Division, Province, Municipality chains are correctly derived from the `efdLocations` array (fetched separately, not paginated), so the existing derivation logic remains correct for those fields.

The bug was compounded by the fact that `EFDHome.jsx` was already passing `yearOptions` and `batchOptions` as props to `FilterDrawer`, but `FilterDrawer` was silently ignoring them — the prop signatures didn't exist.

## Decision
Implement a **"prop-driven derivation"** pattern: when explicit option props are provided, prefer them over derived options. When absent, fall back to derivation from `sourceData`.

```jsx
// FilterDrawer.jsx — useMemo pattern
const derivedYears = [...new Set(sourceData.map(p => p.funding_year || p.fundingYear)...)];
const years = yearOptions.length > 0 ? yearOptions.map(String) : derivedYears;

const derivedCategories = [...new Set(sourceData.map(p => p.project_category || p.projectCategory)...)];
const categories = categoryOptions.length > 0 ? categoryOptions : derivedCategories;
```

New props added: `categoryOptions = []`, `yearOptions = []`, `batchOptions = []`  
All three added to the `useMemo` dependency array.

`EFDHome.jsx` now passes all three:
```jsx
<FilterDrawer
  categoryOptions={allCategories}   // static canonical list
  yearOptions={allYears}            // useMemo from full fundingYears state
  batchOptions={allBatches}         // state populated from server on load
/>
```

## Alternatives Considered

**Option A — Server-side options endpoint**: A dedicated `/api/filter-options` route would return all distinct values from the DB. Rejected because (a) it adds a round-trip latency on drawer open, (b) the canonical categories list is intentionally curated, not DB-derived, and (c) `allYears` and `allBatches` are already fetched as part of the dashboard initialization query.

**Option B — Always fetch all projects**: Remove pagination and load all matching projects upfront. Rejected — the EFD dashboard can have thousands of projects, and this would severely impact initial load time and memory.

**Option C — Separate options store**: Maintain a separate `optionsCache` in context. Rejected as over-engineering for the current use case; the parent already has the correct data.

## Consequences
- **Pros**: `FilterDrawer` remains a dumb presentational component. Any consumer can pass pre-computed options without coupling to the internal derivation logic. The location hierarchy derivation (division → province → municipality cascade) is unchanged.
- **Cons**: The parent is now responsible for providing complete option arrays. A parent that doesn't pass these props falls back silently to potentially-incomplete derived options — this is intentional progressive enhancement, but should be noted when adding new FilterDrawer consumers.
- **Rule**: Whenever `FilterDrawer` is used in a paginated context, the parent **must** pass `categoryOptions`, `yearOptions`, and `batchOptions`. The component does not warn when these are absent.

## Files Changed
- `src/components/FilterDrawer.jsx` — new props, prop-driven derivation, updated useMemo deps
- `src/modules/EFDHome.jsx` — added `categoryOptions={allCategories}` to FilterDrawer render
