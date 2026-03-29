# Walkthrough - School Head Guide Updates

I have successfully made the School Head Quick Start guide more visible and improved its display scaling.

## Changes Made

### 1. Navigation Visibility (`BottomNav.jsx`)
- Changed the label from **"Guide"** to **"Quick Start"**.
- Updated the icon to `TbSchool` for a more academic/instructional feel.
- Added a `highlight` property that:
  - Gives the button a subtle light-blue background (`bg-blue-50/50`).
  - Makes the icon and text a vibrant blue (`text-blue-600`).
  - Added a subtle pulse animation to the icon when it's not the active tab.

### 2. Guide Display Scaling (`schoolheadquickstart.html`)
- Reduced the base font size to **75%**.
- Added `width: 100%`, `max-width: 100vw`, and `overflow-x: hidden` to ensure the content stays perfectly within the screen bounds without horizontal scrolling.

### 3. Agent Instructions Update (`.agent/`)
- Updated `.agent/systematic-debugger.md` and `.agent/senior-dev.md` to strictly mandate that all agents save implementation plans and tasks in the `claude/` folder within the workspace.

## Verification Results

### Visual Verification
- The "Quick Start" button in the bottom navigation is now highly prominent and easily identifiable for School Heads.
- The Quick Start guide content is now sized more compactly, allowing for more information to be visible at once while fitting the screen perfectly.

### Path Compliance
- Implementation plan: `claude/guide_visibility_plan.md`
- Task list: `claude/task.md`
- Instructions updated in: `.agent/systematic-debugger.md` and `.agent/senior-dev.md`
