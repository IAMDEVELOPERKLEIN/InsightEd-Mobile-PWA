# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js / Azure Postgres environment. Your goal is to perform a surgical cleanup of the database by removing legacy Firebase-hashed user accounts while maintaining data integrity across related tables.

# 🌌 THE VIBE & AESTHETIC
High-precision, mission-critical database maintenance. This needs to feel like a "Forensic Healing" operation—clean, documented, and zero-impact on system stability.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express)
- **Database:** Azure PostgreSQL
- **Key Patterns:** Transactional DML, Reference Auditing, Orphan Remediation

# 📝 CORE REQUIREMENTS
1. **Surgical Deletion:** Remove exactly 166 users where `hash_version = 'firebase'`.
2. **Integrity Preservation:** Handle orphaned references in `notifications`, `activity_logs`, `user_device_tokens`, `school_profiles`, and `pending_schools`.
3. **Audit Trail:** Maintain a record of what was deleted and why.
4. **Zero Downtime:** Ensure queries are optimized and transactional to avoid locking issues.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Pre-Flight Audit & Verification**
- **1a:** Re-verify the count of users with `hash_version = 'firebase'`.
- **1b:** Identify the specific UIDs that will be affected.

**Step 2: Reference Remediation (Orphan Handling)**
- **2a:** Clean up `user_device_tokens` for affected UIDs (these can be safely deleted as they are session-specific).
- **2b:** Clean up `notifications` for affected UIDs (delete alerts sent to/from these users).
- **2c:** Nullify `submitted_by` in `school_profiles` and `pending_schools` for these UIDs to prevent JOIN failures while keeping the record history.
- **2d:** Keep `activity_logs` as-is (forensic history), but ensure UI handling is robust for missing users.

**Step 3: Transactional Deletion**
- **3a:** Execute `DELETE FROM users WHERE hash_version = 'firebase'` within a BEGIN/COMMIT block.
- **3b:** Log the result of the operation.

**Step 4: Post-Execution Verification**
- **4a:** Run a final count to ensure 0 Firebase users remain.
- **4b:** Check for any residual data or locking issues.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
A script `tmp/verify_cleanup.js` will be created to:
- Check for any remaining users with `hash_version = 'firebase'`.
- Check if any `user_device_tokens` or `notifications` still point to deleted UIDs.
- Confirm that `submitted_by` links are nulled/handled.

# 🛑 CONSTRAINTS & GUARDRAILS
- ALWAYS use transactions for the deletion.
- DO NOT delete records from `activity_logs` or `school_profiles` themselves; only remediate the UIDs.
- SHUT DOWN pool connections after execution to avoid leakage.
