# Implementation Plan - Claude CLI Environment Fix

Permanent Fix: 

$ export CLAUDE_CODE_GIT_BASH_PATH="C:\Users\SebastianCheng\AppData\Local\Programs\Git\usr\bin\bash.exe"

Address the "Claude Code on Windows requires git-bash" error by explicitly defining the path to the Git Bash executable.

## User Review Required
This change involves setting a user-level environment variable. I can do this via PowerShell in the current session, but for a permanent fix, you should add it to your Windows Environment Variables.

> [!IMPORTANT]
> The Git Bash path was identified at `C:\Users\SebastianCheng\AppData\Local\Programs\Git\bin\bash.exe`.

## Proposed Changes

### System Environment
- **Variable Name:** `CLAUDE_CODE_GIT_BASH_PATH`
- **Variable Value:** `C:\Users\SebastianCheng\AppData\Local\Programs\Git\bin\bash.exe`

### [MODIFY] [.bashrc](file:///C:/Users/SebastianCheng/.bashrc) (Optional)
If you prefer to have this available in all shells, we can add it to your `.bashrc`.
```bash
export CLAUDE_CODE_GIT_BASH_PATH="C:/Users/SebastianCheng/AppData/Local/Programs/Git/bin/bash.exe"
```

## Verification Plan

### Manual Verification
1. Run `setx CLAUDE_CODE_GIT_BASH_PATH "C:\Users\SebastianCheng\AppData\Local\Programs\Git\bin\bash.exe"` to set the variable permanently.
2. Restart the terminal.
3. Run `claude` and verify the CLI starts correctly.
