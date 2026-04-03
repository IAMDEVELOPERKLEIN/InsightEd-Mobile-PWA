# Antigravity Technical Logs

This repository contains the persistent history of architectural decisions, performance optimizations, and infrastructure hardening performed by **Antigravity** in collaboration with the engineering team.

## 📂 Repository Structure
- [Architectural Decision Records (ADRs)](./adr/) - Rationale behind critical system changes.
- [Session Summaries](./sessions/) - Chronological logs of session goals and outcomes.

## 🚀 Key Milestones

- **2026-03-28**: [Performance Hardening & v6.0 Resilience](./sessions/2026-03-28_Performance_Hardening.md)
  - Repaired `engineer_form` PostgreSQL attribute limit (1600 col fix).
  - Implemented `ph_migrations` state-aware tracking.
  - Deployed Zod schema validation layer.

- **2026-04-04**: [Permanent VM Hardening & Alignment](./sessions/2026-04-04_Permanent_VM_Hardening.md)
  - Established `ecosystem.config.cjs` as the permanent PM2 source of truth.
  - Hardened Production Nginx blocks with 600s timeouts and disabled buffering in `tmp_stride.conf`.
  - Refactored `forensic_heal.sh` for multi-site autonomy.
  - Implemented `heal:production` unified deployment workflow.

## 📋 Architecture Decision Records

| ADR | Title | Date |
|-----|-------|------|
| [ADR-0001](./adr/ADR-0001-Migration-Tracking-System.md) | Migration Tracking System | 2026-03-28 |
| [ADR-0002](./adr/ADR-0002-Zod-Validation-Layer.md) | Zod Validation Layer | 2026-03-28 |
| [ADR-0003](./adr/ADR-0003-Engineer-Form-Schema-Repair.md) | Engineer Form Schema Repair (1600 Column Limit) | 2026-03-28 |
| [ADR-0004](./adr/ADR-0004-Server-Lifecycle-Management.md) | Server Lifecycle Management | 2026-03-28 |
| [ADR-0005](./adr/ADR-0005-Frontend-State-Derivation-Patterns.md) | Frontend State Derivation Patterns | 2026-03-28 |
| [ADR-0006](./adr/ADR-0006-Legacy-Firebase-Decoupling.md) | Legacy Firebase Decoupling | 2026-03-28 |
| [ADR-0007](./adr/ADR-0007-PDF-Pipeline-Scratch-Directory.md) | PDF Pipeline Scratch Directory | 2026-04-04 |
| [ADR-0008](./adr/ADR-0008-Engineer-Upload-Postgres-Binary-Alignment.md) | Division Engineer Upload Postgres Binary Alignment | 2026-04-04 |
| [ADR-0009](./adr/ADR-0009-Permanent-Self-Healing-Infrastructure.md) | Permanent Self-Healing Infrastructure | 2026-04-04 |

---
*Maintained by Antigravity — InsightEd PWA Engineering Log*
