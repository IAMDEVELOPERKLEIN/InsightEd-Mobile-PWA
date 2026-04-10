# 🚀 Senior SDE "Antigravity" Skills Package
**Focus:** Correctness, Robustness, Execution, and Structural Integrity

This document outlines the core competencies and methodologies required for a Senior Software Development Engineer to evaluate, adjust, and elevate an implementation plan. The goal is to build systems that are resilient, scalable, and elegantly structured—essentially making the complex feel effortless.

## 1. Correctness: Defying Logic Bugs
*Ensuring the code does exactly what it is supposed to do, under all expected conditions.*

* **Advanced Testing Strategies:**
    * **Test-Driven & Behavior-Driven Development (TDD/BDD):** Guiding architectural design through testability.
    * **Mutation Testing:** Evaluating the quality of existing tests by introducing small bugs (mutants) and ensuring the test suite catches them.
    * **Property-Based Testing:** Testing code against a wide range of generated inputs rather than hardcoded edge cases (e.g., using libraries like FastCheck or Hypothesis) to find obscure edge cases.
* **Static Code Analysis & Tooling:**
    * Integrating strict linting, type-checking (e.g., advanced TypeScript configurations, static analyzers), and vulnerability scanning directly into the IDE and pre-commit hooks.
* **Formal Verification Concepts:** * Applying state-machine logic to ensure complex UI or backend states cannot enter impossible or unhandled conditions.

## 2. Robustness: Gravitational Pull Resistance
*Ensuring the system survives and gracefully degrades when the unexpected happens (network failures, bad data, traffic spikes).*

* **Resiliency Patterns:**
    * **Circuit Breakers:** Preventing cascading failures by stopping requests to a failing downstream service.
    * **Retry Mechanisms with Exponential Backoff:** Handling transient network glitches without overwhelming recovering services.
    * **Bulkheading:** Isolating critical system components so a failure in one area doesn't sink the entire application.
* **Chaos Engineering Principles:**
    * Designing systems with the assumption that components *will* fail, and periodically injecting faults to test the system's automated recovery.
* **Defensive Programming:**
    * Rigorous input validation, boundary checking, and avoiding silent failures. Implementing "fail fast, recover gracefully" paradigms.

## 3. Execution of Implementation Plan: Orbit Insertion
*Taking a design from a whiteboard to a live production environment safely and efficiently.*

* **Progressive Delivery:**
    * **Feature Flags/Toggles:** Decoupling deployment from release, allowing code to be pushed to production but kept dormant until ready.
    * **Canary Releases & Blue-Green Deployments:** Routing a small percentage of traffic to new infrastructure to verify stability before a full rollout.
* **Observability & Telemetry:**
    * Implementing comprehensive logging (structured logs), metrics (latency, error rates, throughput), and distributed tracing. 
    * You can't fix what you can't see; execution requires setting up alerts that trigger *before* the user notices an issue.
* **CI/CD Pipeline Mastery:**
    * Designing automated, idempotent, and highly reliable build and deployment pipelines that act as the ultimate gatekeeper for code quality.

## 4. Structural Adjustments & Integrity: Refactoring the Hull
*Continuously improving the codebase to prevent "software rot" and technical debt accumulation.*

* **Architectural Smells & Refactoring:**
    * Identifying tight coupling, leaky abstractions, and god objects, and proactively refactoring them using SOLID principles and Domain-Driven Design (DDD).
* **The Boy Scout Rule:**
    * Leaving the codebase cleaner than you found it with every PR, making incremental, low-risk structural improvements alongside feature work.
* **Code Review Leadership:**
    * Conducting reviews that go beyond syntax. Checking for architectural alignment, thread safety, performance bottlenecks, and long-term maintainability.
* **Technical Debt Management:**
    * Accurately quantifying technical debt and advocating for its resolution during sprint planning by demonstrating its impact on future velocity and system stability.

## 5. Database Concurrency & Performance: Slipstream Scaling
*Ensuring the database remains responsive under high load by avoiding blocking operations and connection starvation.*

* **Strict DDL/DML Separation:**
    * **No DDL on Hot Paths:** Never execute `ALTER TABLE` or other structural changes within request handlers. DDL operations acquire `AccessExclusiveLock`, which bricks the system by stalling all other queries.
    * **Boot-Level Migrations:** Schema changes must be encapsulated in idempotent, boot-level initialization scripts (e.g., `initUnit7Schema`).
    * **Advisory Locking:** Use `pg_try_advisory_lock` during boot to ensure only one cluster worker manages migrations, preventing race conditions.
* **Connection Management & Decoupling:**
    * **Asynchronous Analytics:** Transition non-critical secondary operations (e.g., `updateSchoolTotalCompletion`) to fire-and-forget or background workers. Free the database socket instantly.
    * **Pool Starvation Prevention:** prioritize "Fail-Fast" timeouts over large queues. Fix root cause locks rather than masking them with larger connection pools.

## 6. Agent Workflow & Compliance
*Ensuring all AI agents maintain consistency and transparency within the workspace.*

* **Mandatory Architectural Alignment:** Agents **MUST** create an implementation plan in `/claude/[feature_name]_plan.md` before executing any structural or logic changes.
* **Mandatory Progress Tracking:** Agents **MUST** maintain a separate checklist in `/claude/task.md` for the current task.
* **Path Strictness:** Always use absolute paths or relative paths from the root, and ensure all planning artifacts are indexed in the `claude` folder.