# Implementation Plan - "Division Engineer" Interface Alignment & Aesthetics

This plan refactors the Division Engineer module to improve information hierarchy, streamline variation workflows, and modernize the project overview aesthetic.

# SYSTEM ROLE
You are a senior UI/UX engineer and full-stack developer. Your goal is to create a premium, data-dense interface that mirrors the efficiency of the "Unit 1" pattern.

# 🌌 THE VIBE & AESTHETIC
The interface should feel **"Architectural"**. Information like the IPC and Accomplishment Percentage should be visually anchored to the top-level containers. The project cards in the overview should read like high-level data sheets: **Lineage (IPC) -> Title (Project Name) -> Identity (School Name/ID)**.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (EngineerProjects.jsx, DetailedProjInfo.jsx, ProjectEditModal.jsx)
- **Key Pattern:** **Visual Anchoring**. Moving mission-critical data (Percentage/Update status) to corners to free up the central vertical axis for project identity.

# 📝 CORE REQUIREMENTS
1. **Overview Card Refactor (EngineerProjects.jsx)**:
    - **IPC Position**: Move IPC label above the Project Name.
    - **Identity Grouping**: Render School Name followed by School ID in parentheses/brackets.
    - **Upper-Right Command Center**: Move the Percentage Badge and "Last Updated By" text to the extreme top-right of the card.
2. **Profile Tab Refactor (DetailedProjInfo.jsx)**:
    - **Move & Rename**: Replace "Edit Details" header button with a "Variation" button in the tab bar.
3. **Modal Cleanup (ProjectEditModal.jsx)**:
    - **Prune Tabs**: Remove the "Details" tab; retain only "V.O" and "Realign".

# 🚀 STEP-BY-STEP EXECUTION PLAN

### Step 1: EngineerProjects - card Layout Refactor
- **[MODIFY] EngineerProjects.jsx**:
    - **1a:** Reorganize the `ProjectCards` item layout.
    - **1b:** Create an `absolute top-6 right-6` (or similar) container for the Percentage Badge and `engineerName` info.
    - **1c:** Move the `{p.ipc}` block to precede `{p.projectName}`.
    - **1d:** Combine `{p.schoolName} - {p.schoolId}`.

### Step 2: DetailedProjInfo - Variation Button
- **[MODIFY] DetailedProjInfo.jsx**:
    - **2a:** Remove the `Edit Details` button block in the header.
    - **2b:** Add a "Variation" tab-styled button to the `TABS` row.

### Step 3: ProjectEditModal - Tab Cleanup
- **[MODIFY] ProjectEditModal.jsx**:
    - **3a:** Change default `activeTab` to 'vo'.
    - **3b:** Strip the 'details' tab and associated state logic.

### Step 4: Verification
- **Manual Test**: Confirm the "Projects Overview" cards look organized with Percentage in the top-right and IPC above the title. Confirm the "Variation" tab button works and opens the pruned modal.

# 🛑 CONSTRAINTS & GUARDRAILS
- **Responsive Handling**: Ensure the top-right "Command Center" doesn't overlap with location text on narrow mobile screens (use `flex-col` or `hidden` on tiny screens if needed).
- **Z-Index**: Ensure the absolute-positioned percentage badge doesn't interfere with card click events.
