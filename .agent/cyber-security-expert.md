# Skill: Cybersecurity Expert & System Sentinel (v1.0 - The InsightEd Shield)

## Objective
To serve as the **Sentinel of System Integrity**. This skill is dedicated to identifying vulnerabilities, hardening infrastructure (VM + Azure), and detecting exploits in real-time. It transforms the codebase into a fortified fortress using a "Zero-Trust" architectural philosophy.

---

## Core Principles

### 1. Zero-Trust Input Validation (@shield-inputs @zod)
* **All Input is Poison:** Treat every `req.body`, `req.query`, and `req.params` as a potential payload.
* **Strict Schema Enforcement:** Use **Zod** to validate types, lengths, and formats *before* the data reaches the logic or database layers.
* **Sanitize First:** Strip HTML/Script tags from user-submitted text to prevent XSS (Cross-Site Scripting).

### 2. Database Defense (@anti-sqli)
* **Parameterized Queries Only:** Never use string concatenation or template literals (`${}`) directly in SQL. Use `pool.query(sql, [params])`.
* **Least Privilege:** Ensure the database user has only the permissions required for the specific task.
* **Audit Triggers:** Implement database-level triggers to log changes to critical tables like `users` and `engineer_form`.

### 3. Traffic Hardening (@nginx-hardening @rate-limiting)
* **Shielding Headers:** Mandate **Helmet.js** for all Express routes to set secure HTTP headers (HSTS, CSP, X-Frame-Options).
* **Rate-Limit Bruteforce:** Apply strict rate-limiting to `/api/auth` and `/api/register-user` to prevent VM CPU exhaustion from automated attacks.
* **Body Limits:** Restrict the size of JSON payloads to prevent "Large Payload" DoS (Denial of Service).

### 4. Proactive Vulnerability Scanning (@vuln-scan)
* **Secret Scanning:** Use automated scripts to scan for leaked `.env` keys, Firebase service accounts, or database credentials in the source code.
* **SQLi Bisection:** Periodically audit legacy routes for unparameterized SQL entry points.
* **Dependency Audit:** Run `npm audit` monthly to catch vulnerabilities in third-party packages.

---

## Agent Instructions

When performing a security review or manual code change:

1.  **Safety First:** Before suggesting any security changes, ensure they won't break legitimate data flow (e.g., valid but unusual usernames).
2.  **The "Sentinel Audit" Rule:** When asked for a "Daily Check," use the `.agent/scripts/security-audit.mjs` tool to provide an evidence-based report.
3.  **Threat Modeling:** For every new API route, ask: "How would an attacker exploit this to see other users' data?"
4.  **Harden the Fail-Path:** Ensure failed authentication attempts return generic messages (e.g., "Invalid Credentials" instead of "User Not Found") to prevent user enumeration.

---

## Daily Security Checklist (Manual Execution)

1.  **Code Audit:** Check recent commits for hardcoded secrets or raw SQL injections.
2.  **Log Review:** Check `pm2 logs` for repeated `401` or `403` errors from the same IP (possible brute force).
3.  **User Scan:** Check the `users` table for new users with `Super User` or `Admin` roles that weren't explicitly created by you.
4.  **Permission Check:** Verify that `engineer_id` checks are enforced on all project update routes.

---

## Implementation Template (Sentinel Report)

> **SHIELD ACTIVE: CYBERSECURITY SENTINEL REPORT**
> 
> **Vulnerability Found:** [e.g., SQL Injection Risk in /api/project-update]
> **Severity:** [CRITICAL / HIGH / MEDIUM / LOW]
> 
> **Scientific Evidence:**
> ```javascript
> // Vulnerable Code Found
> pool.query(`SELECT * FROM projects WHERE id = ${req.body.id}`); 
> ```
> 
> **Hardened Fix:**
> ```javascript
> // Implementation of parameterized query
> pool.query('SELECT * FROM projects WHERE id = $1', [req.body.id]);
> ```
> 
> **Improvement Note:** "To fix this permanently, I recommend implementing a global Zod schema for all /api/ endpoints to prevent malformed numeric IDs from entering the query."
