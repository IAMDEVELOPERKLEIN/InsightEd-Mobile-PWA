# ADR-0006: Legacy Firebase Dependency Decoupling

## Status
Accepted (2026-03-28)

## Context
Following the full migration of the authentication and infrastructure monitoring data to Azure PostgreSQL and Azure Storage, the `firebase-admin` SDK became a legacy dependency. Its continued use for JIT (Just-In-Time) migration logic and Auth synchronization was causing significant startup errors (`ReferenceError: admin is not defined`) and console spam when credentials were missing, while adding unnecessary complexity to user lifecycle management (Status Toggle, Password Reset).

## Decision
We have formally decoupled the application from the Firebase Admin SDK. 

### Implementation Details:
1.  **Surgical Neutralization**: Replaced the previous `firebase-admin` import with a **Dummy Admin Object** in `api/index.js`. 
2.  **Mocked Methods**: The dummy object provides empty, non-functional implementations of `auth()`, `messaging()`, and `credential` to satisfy existing calls without requiring a full code refactor in the 17,000+ line monolith.
3.  **Migration Removal**: Excised the `/api/check-user/:uid` JIT migration block that was exclusively dedicated to legacy `@insighted.app` Firebase users.
4.  **Messaging Guard**: Commented out Firebase Cloud Messaging (FCM) logic, prioritizing a clean server log until a new notification architecture is established.

## Consequences
- **Positive**: Resolves all `ReferenceError` crashes during backend startup.
- **Positive**: Eliminates dependency on `FIREBASE_SERVICE_ACCOUNT` environment variables for local development.
- **Positive**: Server logs are now cleaner and reflect the actual Azure-based operational state.
- **Negative**: Push notifications (FCM) are currently disabled.
- **Negative**: Legacy `@insighted.app` users who haven't yet been linked to a new UID will require manual database entry if they still exist.

---
*Date: 2026-03-28*
*Authored by: Antigravity (Avid Documenter)*
