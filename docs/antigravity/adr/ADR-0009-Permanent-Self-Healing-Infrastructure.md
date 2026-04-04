# ADR 0009: Permanent Self-Healing VM Infrastructure

## Status
Accepted

## Context
The InsightEd staging and production environments on the VM (`20.24.58.49`) were prone to configuration drift, specifically regarding Nginx timeouts, PM2 environment variables (`UPLOAD_DIR`), and temporary directory availability. Manual "healing" scripts existed but were not integrated into the standard deployment lifecycle, leading to "Manager Fatigue" and recurring environment-specific failures.

## Decision
We decided to implement a **Persistent Self-Healing Infrastructure** by locking core environment parameters into the repository and ensuring that every standard deployment automatically audits and repairs the remote state.

### Technical Details:
1.  **Unified PM2 Ecosystem (`ecosystem.config.cjs`)**: 
    - Moved away from manual `pm2 start api/index.js --name x` commands.
    - Centralized all environment variables (`PORT`, `UPLOAD_DIR`, `NODE_ENV`) for both Staging and Production in a single, version-controlled file.
    - Used `--only <app-name>` and `--update-env` flags during deploy to ensure consistent state.
2.  **Idempotent Forensic Healing**:
    - Refactored `forensic_heal.sh` to handle multiple environments via variable overrides (`STAGING_DIR`, `PM2_NAME`).
    - Integrated the healing protocol (Nginx sync, Python header checks, process hygiene) into the **standard** `deploy-local.sh` and `deploy-staging.sh` scripts.
3.  **Authoritative Nginx State**:
    - Established `tmp_stride.conf` as the single source of truth for the entire VM Nginx configuration.
    - Automated the synchronization of this file to `/etc/nginx/sites-enabled/stride.conf` during every "heal" cycle.

## Alternatives Considered
1.  **Dockerization**: Containerizing the application would solve environment drift. Rejected for immediate implementation due to existing VM footprint constraints and the complexity of managing Docker volumes for Postgres binary storage on this specific host.
2.  **Ansible/Terraform**: Using IAC tools. Rejected as "overkill" for a single-node VM; a self-healing shell script integrated into the deployment pipeline achieved the same goal with zero new dependencies.

## Consequences
-   **Pros**:
    -   **Zero Configuration Drift**: Every deployment resets the VM to the authoritative repository state.
    -   **Reduced Maintenance**: Hardened settings (600s timeouts, buffering-off) are now permanent.
    -   **Parity**: Production and Staging are structurally identical (only ports and paths differ).
-   **Cons**:
    -   Deployments take slightly longer (~2-3s) due to the health audit phase.
    -   The `ecosystem.config.cjs` must be carefully maintained as the source of truth for ports.

---
*Verified by Antigravity (Architect & Documenter) - 2026-04-04*
