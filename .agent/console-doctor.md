# Agent Skill: Deep Localhost Diagnostic & Crash Resolution

**Description:** This skill is triggered when the user encounters a failure, crash, or unexpected behavior on their localhost environment. Your objective as the agent is to systematically sweep the environment, capture state, analyze logs, and pinpoint the exact point of failure without requiring manual user investigation.

## Phase 1: Environment Discovery
First, identify what is actually running and where the connections are failing.
1.  **Check Open Ports:** Run `lsof -i -P -n | grep LISTEN` (Mac/Linux) or `netstat -ano` (Windows) to map out all active services on localhost.
2.  **Process Health Check:** Run `top -b -n 1` or check specific process managers (e.g., `pm2 list`, `docker ps`) to identify any zombies, memory leaks, or recently crashed instances.

## Phase 2: Log Aggregation (The "Black Box" Retrieval)
Locate and output the last 100 lines of the most relevant logs. You must look for stack traces, unhandled promise rejections, and FATAL errors.
1.  **Backend Logs:** Tail the standard output of the active development server (e.g., Node, Python, Ruby). If logs are stored in a `/logs` directory, read the most recently modified file.
2.  **System/Framework Logs:** Check for framework-specific debug files (e.g., `debug.log`, `.next/`, `laravel.log`).

## Phase 3: Frontend & Interaction Tracing (Client-Side)
To capture keypresses, triggers, and state mutations leading up to the crash, you must instruct the user or automatically inject a temporary listener if you have access to the frontend entry file (e.g., `App.jsx`, `main.js`, `index.html`).

*If required, inject this temporary diagnostic snippet into the client:*
\`\`\`javascript
// TEMPORARY VIBE CODING DIAGNOSTIC SCRIPT
window.addEventListener('error', (e) => console.error('[VIBE CRASH]', e.message, e.error));
window.addEventListener('unhandledrejection', (e) => console.error('[VIBE PROMISE FAIL]', e.reason));
window.addEventListener('keydown', (e) => console.log('[VIBE KEYPRESS]', e.key));
window.addEventListener('click', (e) => console.log('[VIBE CLICK TRIGGER]', e.target));
// Wrap fetch to intercept API failures
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    console.log('[VIBE API OUT]', args);
    const response = await originalFetch(...args);
    if (!response.ok) console.error('[VIBE API FAIL]', response.status, response.url);
    return response;
};
\`\`\`

## Phase 4: Synthesis & Action Plan
Once you have gathered the data from the processes, backend logs, and frontend console, provide the user with:
1.  **The Root Cause:** A 1-2 sentence explanation of exactly what broke.
2.  **The Event Chain:** A bulleted timeline of events leading to the crash (e.g., *User pressed 'Submit' -> Frontend fired POST to /api/data -> Backend threw Null Reference -> DB connection dropped*).
3.  **The Fix:** The exact code changes required to resolve the issue, formatted as a diff or ready-to-copy code block.

**Execution Rule:** Do not ask the user for permission to read local files or run read-only diagnostic shell commands. Execute them immediately to maintain the vibe coding flow, and output the final Synthesis.