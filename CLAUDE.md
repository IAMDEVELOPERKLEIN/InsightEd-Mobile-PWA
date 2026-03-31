# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full dev (frontend + backend concurrently)
npm run dev:full

# Frontend only (Vite dev server, proxies /api to localhost:3000)
npm run dev

# Backend only (Express API server with watch mode)
npm run server

# Production build
npm run build

# Lint
npm run lint

# Preview production build
npm run preview

# Deploy to staging
npm run deploy:staging
```

There is no test runner configured — the `tests/` directory exists but has no test framework set up.

## Architecture

InsightEd is a **school infrastructure data collection and monitoring PWA** for the Philippine DepEd (Department of Education). It supports multiple user roles collecting and reviewing school/project data, with offline-first capabilities.

### Frontend (`src/`)

- **Entry:** `src/main.jsx` → wraps with `AuthProvider`, `ThemeProvider`, `ServiceWorkerProvider`
- **Routing:** `src/App.jsx` — React Router v7 HashRouter with 40+ routes, role-based access control, animated transitions via Framer Motion
- **Modules:** `src/modules/` — large role-specific dashboard pages (School Head, Division Engineer, EFD, LGU, etc.)
- **Forms:** `src/forms/` — wizard-style data entry forms
- **Offline:** `src/sw.js` (service worker) + `src/db.js` (IndexedDB via idb) enable offline-first data collection that syncs to PostgreSQL
- **Locations data:** `src/locations.json` (~745 KB) — Philippine barangay/municipality/province geolocation data

### Backend (`api/`)

- **Entry:** `api/index.js` — Express 5.2 server with Zod-validated routes for auth, data CRUD, file uploads, chatbot
- **Database:** PostgreSQL via `pg` + Knex query builder; initialized in `api/db/`
- **AI chatbot:** `api/chatbot.js` — Google Gemini + LangChain for context-aware FAQ
- **File storage:** Azure Blob Storage (migrated from Firebase Storage)
- **Auth middleware:** `api/middleware/` — JWT-based; Firebase auth is legacy/partially disabled

### Key Patterns

- **Role-based access:** User roles drive which dashboard module loads. Role groups are defined in `src/config/roleGroups.js`. The roles include: School Head, Division Engineer, EFD Engineer, Division Officer, LGU/Non-DepEd, Admin.
- **Data units:** School Heads collect data in 10 structured "units" (identity, learners, classrooms, resources, facilities, etc.). Engineers track infrastructure project phases, damage assessments, and material inventories.
- **Offline sync:** IndexedDB is the write-first store; background sync pushes drafts to the API. The service worker uses Workbox with `injectManifest` strategy (max 15 MB cache).
- **Dev proxy:** Vite proxies `/api/*` → `http://127.0.0.1:3000` so frontend and backend can run on separate ports.

### Tech Stack

| Layer | Tech |
|-------|------|
| UI | React 19, Tailwind CSS 3.4, Framer Motion |
| Routing | React Router v7 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Maps | Leaflet + React Leaflet |
| API | Express 5.2, Zod validation |
| Database | PostgreSQL + Knex |
| Offline | Workbox (injectManifest) + IndexedDB |
| AI | Google Gemini + LangChain |
| Storage | Azure Blob Storage |
| Auth | JWT (Firebase auth is legacy) |
| Build | Vite 7.2 + Vite PWA plugin |

### Environment

The app requires a `.env` file with credentials for PostgreSQL, Azure Blob, Google Gemini API, JWT secret, Firebase Admin, and email (Nodemailer). See the existing `.env` for required keys — never commit it.
