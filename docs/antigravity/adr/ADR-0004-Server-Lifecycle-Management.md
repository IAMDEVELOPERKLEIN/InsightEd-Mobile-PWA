# ADR-0004: Server Lifecycle Management

## Status
Accepted

## Context
During the expansion of the InsightEd monolith, we observed multiple instances where the Node.js server process would terminate with a `Completed running 'api/index.js'` message without throwing an error. This occurred because the event loop became idle during complex, long-running database migrations or before the port listener was fully established, causing Node.js to exit the process cleanly. Additionally, silent unhandled promise rejections during parallel migrations were making debugging difficult.

## Decision
We have implemented a hardened server lifecycle management pattern in `api/index.js`:
1.  **Keep-Alive Handle**: Introduced a `setInterval(() => {}, 60000)` handle to ensure the Node.js event loop remains active indefinitely after the server successfully starts.
2.  **Global Crash Listeners**: Added `process.on('unhandledRejection', ...)` and `process.on('uncaughtException', ...)` to log and exit the process with detailed diagnostics in the event of a fatal error, rather than failing silently.
3.  **Top-Level Await**: Standardized the `startServer()` call to use top-level await, guaranteeing that the server initialization sequence is fully governed.

## Consequences
- **Positive**: Eliminates premature process exits, ensuring Port 3000 remains bound. Provides granular logs for silent crashes.
- **Negative**: Adds a negligible overhead to the event loop.
- **Neutral**: Requires manual termination of legacy Node processes (zombies) during major deployment shifts to ensure Port 3000 is clean.

---
*Date: 2026-03-28*
*Authored by: Antigravity (Avid Documenter)*
