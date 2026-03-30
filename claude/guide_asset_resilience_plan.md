# [ROBUST SOLUTION] Standalone Guide Asset Resilience

## Objective
To resolve 404 errors for GIF/PNG assets in the standalone operational guides by eliminateing cross-path dependencies and leveraging Nginx `root` directive for predictable path resolution.

## Systematic Audit (Phase 1)
- **Environment:** Production Linux VM (stride.deped.gov.ph)
- **Problem:** Assets (GIFs/PNGs) fail to load when guides are served via new `/School-Head/` etc. routes.
- **Likely Root Cause:** `alias` + `try_files` in Nginx is failing to resolve URI-encoded filenames (with spaces) or cross-referencing files from the SPA's `dist` root.

## Scientific Hypotheses (Phase 2)
1. **Hypothesis A:** Nginx URI-encoding mismatch. `unit2%20final.gif` is not mapping correctly to `unit2 final.gif` via the `alias` directive. [Likelihood: High]
2. **Hypothesis B:** File permissions or deployment lag. Assets are not being copied to the expected `dist` location during build. [Likelihood: Medium]

## Proposed Changes (Phase 3)

### 1. Asset Silo-ing (The "Robust" Way)
Instead of sharing assets with the main PWA at `/insighted/`, we will make each guide truly standalone.

#### [COPY] Assets from `public/` to `public/[Guide-Name]/`
- Copy all required GIFs and PNGs to `public/School-Head/`
- Copy all required GIFs and PNGs to `public/Division-Engineer/`
- Copy all required GIFs and PNGs to `public/EFD-Engineer/`

#### [MODIFY] [School-Head/index.html](file:///e:/InsightEd-Mobile-PWA/public/School-Head/index.html)
#### [MODIFY] [Division-Engineer/index.html](file:///e:/InsightEd-Mobile-PWA/public/Division-Engineer/index.html)
#### [MODIFY] [EFD-Engineer/index.html](file:///e:/InsightEd-Mobile-PWA/public/EFD-Engineer/index.html)
Update all `src` attributes to use **relative** paths (e.g., `src="unit2 final.gif"`).

### 2. Nginx Verification
Ensure the `root` directive is used (which we already applied) as it is more stable for static file mapping than `alias`.

## Verification Plan

### Manual Verification
1. Verify that all 20+ GIFs are present in the `public/School-Head/` directory.
2. Run a local build: `npm run build`.
3. Check `dist/School-Head/` to ensure assets are copied.
4. Verify the HTML references no longer use `/insighted/` or `public/` prefixes.
