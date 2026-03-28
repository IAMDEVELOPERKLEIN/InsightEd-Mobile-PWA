# Skill: Git Synchronization & Intelligent Conflict Resolution Master (Small Team)

## Trigger Conditions
- When the user asks for Git workflow advice for a small team.
- When the user encounters merge conflicts, diverged branches, or asks how to synchronize work.
- When the user pastes code containing Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
- When the user asks about using `git rebase` versus `git merge`.
- When the user runs `git status`, `git pull`, `git push`, or related remote synchronization commands.

## Step-by-Step Workflows

### 1. Pre-Work Alignment (`status` & `fetch`)
**Goal:** Ensure the local workspace is clean and aware of remote changes before taking action.
- **Execute `git status`**: Always start by checking the state of the working directory. Ensure there are no uncommitted changes before pulling or rebasing.
- **Execute `git fetch origin`**: Fetch remote updates without altering the local working state. This allows the developer to see exactly what the team has pushed before attempting an integration.

### 2. The Pull Rebase Workflow (`pull --rebase`)
**Goal:** Integrate teammates' work without creating messy, non-linear merge commits.
- **Execute `git pull --rebase origin main`**: Instead of a standard `git pull` (which creates a cluttered merge commit), use `--rebase`. This takes the developer's unique local commits and applies them cleanly *on top* of the newly fetched commits from the remote branch.

### 3. Intelligent Conflict Resolution Protocol
**Goal:** When a rebase or merge pauses due to a conflict, intelligently analyze the diverging code, propose the most robust solution, and format it for the user to approve.
**When the user provides a file with conflict markers, the agent MUST follow these steps:**
1. **Isolate:** Identify the code in `HEAD` (current branch) versus the incoming code.
2. **Analyze Intent:** Deduce what each developer was trying to achieve based on the code changes (e.g., "HEAD added error handling, while incoming added a new API parameter").
3. **Evaluate Robustness:** Compare the two blocks based on:
   - **Performance:** Does one approach scale better?
   - **Maintainability:** Is one approach cleaner or closer to standard design patterns?
   - **Completeness:** Did one developer miss an edge case that the other caught?
4. **Draft the Solution:** Do not just pick one side. Synthesize the *best elements* of both into a single, cohesive block of code. For example, apply the incoming API parameter inside the error-handling structure from HEAD.
5. **Present for Approval:** Present the proposed code clearly and explain *why* it is the best structural choice. 
6. **Next Steps:** Remind the user of the manual resolution steps:
   - `git add <resolved-file>`
   - `git rebase --continue`

### 4. The Commit and Push Workflow (`push`)
**Goal:** Share work effectively without breaking the remote history for the team.
- **Verify with `git status`**: Double-check the exact commits and files being pushed.
- **Execute `git push origin <branch-name>`**: Push the rebased, clean commits to the remote repository.
- **Force Pushing**: If working on a strictly personal feature branch and a rebase was just performed against `main`, `git push --force-with-lease` is required to update the remote.

### 5. Branch Management for Small Teams
- **The Source of Truth**: Treat the `main` (or `develop`) branch as the absolute source of truth.
- **Isolation**: Every developer must work on their own isolated feature branch (e.g., `feature/login-auth`).
- **Frequent Syncs**: Developers should pull from `main` (using `--rebase`) daily to prevent massive, unresolvable conflicts.

## Constraints & Rules
- **NO AUTONOMOUS COMMITS**: The agent must NEVER instruct a script to automatically resolve and commit a conflict without human verification. Business logic takes precedence over code aesthetics.
- **No Force Pushing to `main`**: `git push --force` or `--force-with-lease` is strictly prohibited on the main integration branch.
- **Rebase Local, Merge Remote**: Use `rebase` to update personal feature branches with `main`. Use Pull Requests (PRs) to `merge` those feature branches back into `main`.
- **Do Not Rebase Shared Branches**: If a branch is being actively worked on by more than one developer, avoid rebasing it entirely. Rebasing rewrites history and will cause severe synchronization issues for collaborators.

## Supporting Resources
- `git status` - The diagnostic tool to understand the current branch state.
- `git pull --rebase` - The golden rule for keeping small team histories linear.
- `git log --graph --oneline --all` - To visualize the linear history created by the rebase workflow.

---

# Skill: GitHub Pull Request Automation (Fork Workflow)

## Trigger Conditions
- When the user asks to create a pull request from a forked repository.
- When the user finishes a feature on their fork and wants to merge it back to the original upstream repository.
- When the user asks to automate the PR submission process using the command line.

## Step-by-Step Workflows

### 1. Pre-Requisites & Verification
**Goal:** Ensure the GitHub CLI (`gh`) is installed, authenticated, and the repository is configured correctly.
- **Verify GitHub CLI:** Run `gh auth status` to ensure the agent/user has the necessary permissions to interface with GitHub.
- **Verify Remotes:** Run `git remote -v`. Ensure `origin` points to the user's fork and `upstream` points to the original target repository.

### 2. Push to Fork (`origin`)
**Goal:** Ensure the latest local commits are available on the remote fork before generating the PR.
- **Execute `git push origin <branch-name>`**: Push the completed feature branch up to the user's fork.

### 3. Automated Pull Request Creation (`gh pr create`)
**Goal:** Generate and submit the pull request to the upstream repository automatically.
- **Draft the PR Content:** Formulate a clear, concise title and body summarizing the changes, the problem solved, and any architectural adjustments made.
- **Execute PR Command:** Run `gh pr create --repo <upstream-owner>/<repo-name> --base main --head <your-github-username>:<branch-name> --title "<Drafted Title>" --body "<Drafted Body>"`
  *(Note: If the repository is cloned directly from the fork and upstream is set properly, a simpler `gh pr create --base main --title "..." --body "..."` will often suffice. Specifying `--repo` ensures exact targeting if ambiguity exists).*

## Constraints & Rules
- **Review Before Submission:** The agent should draft the PR Title and Body and present it to the user for a quick visual confirmation before executing the `gh pr create` command.
- **Target Branch Verification:** Double-check the target `--base` branch (usually `main`, `master`, or `develop`) on the upstream repository before creating the PR to avoid targeting the wrong environment.
- **Do Not Push to Upstream Directly:** Never attempt to `git push upstream` directly. Forks typically lack write access to the original repository. Always use the PR workflow.

## Supporting Resources
- `gh pr create --help` - For advanced GitHub CLI PR creation flags and options.
- `git remote -v` - To confirm the origin (fork) and upstream (original) URLs.