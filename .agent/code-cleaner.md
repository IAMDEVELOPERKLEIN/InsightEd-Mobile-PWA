---
name: antigravity
description: "Make any codebase lean by detecting and removing unused files, dead code, orphan dependencies, and unreferenced assets. Use this skill whenever the user says 'clean up my project', 'find unused files', 'remove dead code', 'slim down the repo', 'what files can I delete', 'find orphan files', 'project diet', 'codebase audit', 'reduce bundle size', 'tech debt cleanup', or anything related to identifying files, exports, imports, dependencies, or assets that are not used when running the main application. Also trigger when the user uploads a project zip/tarball and asks to 'make it lighter', 'trim the fat', or 'strip unused stuff'. Works across Python, JavaScript/TypeScript, React, Go, Rust, Java, Ruby, PHP, and generic multi-language projects."
compatibility: "Claude Code, Claude.ai, Cowork — any surface with bash and filesystem access"
---

# 🪂 Antigravity

> *"I wrote 20 lines of code and my mass decreased. Antigravity." — inspired by [xkcd #353](https://xkcd.com/353/)*

**Make your codebase fly by removing the weight it doesn't need.**

Antigravity scans a project for unused files, dead code, orphan dependencies, and unreferenced assets — then gives the user a clear, categorized report of what can safely be removed. Think of it as `import antigravity` for your entire repo: after running it, your project is lighter and faster.

---

## Philosophy

The best code is no code. The second best code is code that earns its place. Everything else is gravity — weighing your project down with longer build times, harder onboarding, bigger bundles, and false grep hits that waste your time.

Antigravity follows the principle of **progressive confidence**:
1. **Scan** — build a map of what exists
2. **Trace** — follow imports, requires, and entry points to find what's actually used
3. **Classify** — sort findings by confidence level (certain, likely, investigate)
4. **Report** — present results clearly before anything is deleted
5. **Prune** — only remove what the user approves

**Never auto-delete without user confirmation.** Always generate the report first.

---

## Step 0 — Identify the Project

Before scanning, understand what you're working with.

```bash
# Get the lay of the land
find . -maxdepth 1 -type f | head -20
ls -la

# Detect project type by marker files
detect_markers=(
  "package.json:javascript/typescript"
  "tsconfig.json:typescript"
  "requirements.txt:python"
  "pyproject.toml:python"
  "setup.py:python"
  "Pipfile:python"
  "go.mod:go"
  "Cargo.toml:rust"
  "pom.xml:java/maven"
  "build.gradle:java/gradle"
  "Gemfile:ruby"
  "composer.json:php"
  "pubspec.yaml:dart/flutter"
  "mix.exs:elixir"
  "CMakeLists.txt:c/cpp"
  "Makefile:generic"
)

for marker in "${detect_markers[@]}"; do
  file="${marker%%:*}"
  lang="${marker##*:}"
  [ -f "$file" ] && echo "Detected: $lang ($file)"
done
```

Also check for:
- **Entry points**: `main.py`, `index.js`, `main.go`, `src/main.rs`, `App.tsx`, etc.
- **Config files**: `.env`, `docker-compose.yml`, CI configs (`.github/`, `.gitlab-ci.yml`)
- **Build outputs**: `dist/`, `build/`, `__pycache__/`, `node_modules/`, `target/`

---

## Step 1 — Scan: Build the File Inventory

Create a full inventory of every file in the project, excluding known noise.

```bash
# Full inventory, excluding build artifacts and VCS
find . \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './__pycache__/*' \
  -not -path './venv/*' \
  -not -path './.venv/*' \
  -not -path './env/*' \
  -not -path './.env/*' \
  -not -path './dist/*' \
  -not -path './build/*' \
  -not -path './target/*' \
  -not -path './.next/*' \
  -not -path './.nuxt/*' \
  -not -path './vendor/*' \
  -not -path './.tox/*' \
  -not -path './coverage/*' \
  -not -path './.cache/*' \
  -not -name '*.pyc' \
  -not -name '*.pyo' \
  -not -name '.DS_Store' \
  -not -name 'Thumbs.db' \
  -type f \
  | sort > /tmp/antigravity_all_files.txt

echo "Total files: $(wc -l < /tmp/antigravity_all_files.txt)"

# Categorize by extension
awk -F. '{print $NF}' /tmp/antigravity_all_files.txt \
  | sort | uniq -c | sort -rn | head -20
```

### Size audit — find the heaviest files

```bash
# Top 20 largest files (these are the biggest gravity sources)
find . \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './vendor/*' \
  -type f \
  -exec du -h {} + 2>/dev/null \
  | sort -rh | head -20
```

---

## Step 2 — Trace: Follow the Import Graph

This is language-specific. Use the right strategy for the detected ecosystem.

### JavaScript / TypeScript (Node, React, Next.js, Vue, Svelte)

**Best-in-class tool: [Knip](https://knip.dev)**

Knip finds unused files, exports, dependencies, and types. It understands frameworks like Next.js, Remix, Astro, Svelte, Angular, and more.

```bash
# Install and run Knip
npx knip 2>&1 | tee /tmp/antigravity_knip.txt

# If Knip isn't available or fails, fall back to manual tracing
npx knip --reporter compact  # Shorter output
```

**Manual fallback — grep-based import tracing:**

```bash
# Find all source files
find ./src -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' -o -name '*.vue' -o -name '*.svelte' \) > /tmp/ag_src_files.txt

# For each source file, check if it's imported anywhere
while IFS= read -r file; do
  basename_no_ext=$(basename "$file" | sed 's/\.[^.]*$//')
  # Check for import/require references
  if ! grep -rl --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' \
    -e "from.*['\"].*${basename_no_ext}['\"]" \
    -e "require.*['\"].*${basename_no_ext}['\"]" \
    -e "import.*['\"].*${basename_no_ext}['\"]" \
    ./src/ > /dev/null 2>&1; then
    echo "POTENTIALLY UNUSED: $file"
  fi
done < /tmp/ag_src_files.txt
```

**Unused npm dependencies:**

```bash
# Check which declared dependencies are never imported
if [ -f package.json ]; then
  # Extract dependency names
  node -e "
    const pkg = require('./package.json');
    const deps = Object.keys(pkg.dependencies || {});
    const devDeps = Object.keys(pkg.devDependencies || {});
    console.log('=== DEPENDENCIES ===');
    deps.forEach(d => console.log(d));
    console.log('=== DEV DEPENDENCIES ===');
    devDeps.forEach(d => console.log(d));
  " > /tmp/ag_declared_deps.txt

  # Check each dependency for usage in source
  while IFS= read -r dep; do
    [[ "$dep" == "==="* ]] && continue
    if ! grep -rl --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' --include='*.json' \
      -e "\"$dep\"" -e "'$dep'" -e "from '$dep'" -e "from \"$dep\"" \
      ./src/ ./lib/ ./app/ ./pages/ ./components/ 2>/dev/null | grep -q .; then
      echo "UNUSED DEP: $dep"
    fi
  done < /tmp/ag_declared_deps.txt
fi
```

---

### Python

**Best-in-class tools: [Vulture](https://github.com/jendrikseipp/vulture) and [deadcode](https://github.com/albertas/deadcode)**

```bash
# Vulture — finds dead code with confidence scores
pip install vulture --break-system-packages 2>/dev/null
vulture . --min-confidence 80 2>&1 | tee /tmp/antigravity_vulture.txt

# deadcode — alternative with auto-fix capability
pip install deadcode --break-system-packages 2>/dev/null
deadcode . 2>&1 | tee /tmp/antigravity_deadcode.txt
```

**Manual fallback — unused Python files:**

```bash
# Find all .py files
find . -name '*.py' -not -path './venv/*' -not -path './.venv/*' \
  -not -path './__pycache__/*' -not -name 'setup.py' -not -name 'conftest.py' \
  -not -name '__init__.py' -not -name 'manage.py' -not -name 'wsgi.py' \
  -not -name 'asgi.py' > /tmp/ag_py_files.txt

# Check each file for import references
while IFS= read -r file; do
  module=$(basename "$file" .py)
  dir_module=$(dirname "$file" | tr '/' '.' | sed 's/^\.//')
  if ! grep -rl --include='*.py' \
    -e "import ${module}" \
    -e "from.*${module}" \
    -e "from ${dir_module}" \
    . 2>/dev/null | grep -v "$file" | grep -q .; then
    echo "POTENTIALLY UNUSED: $file"
  fi
done < /tmp/ag_py_files.txt
```

**Unused pip dependencies:**

```bash
# Compare installed/declared packages vs actual imports
if [ -f requirements.txt ]; then
  echo "=== Declared in requirements.txt ==="
  grep -v '^#' requirements.txt | grep -v '^$' | sed 's/[>=<].*//' | while read pkg; do
    pkg_import=$(echo "$pkg" | tr '-' '_' | tr '[:upper:]' '[:lower:]')
    if ! grep -rl --include='*.py' -e "import ${pkg_import}" -e "from ${pkg_import}" . 2>/dev/null | grep -q .; then
      echo "UNUSED: $pkg"
    fi
  done
fi
```

---

### Go

```bash
# Go has excellent built-in dead code detection
# The compiler itself rejects unused imports and variables

# Find unused files (not referenced by any package)
go vet ./... 2>&1 | tee /tmp/antigravity_govet.txt

# Check for files not part of build
find . -name '*.go' -not -name '*_test.go' | while read f; do
  pkg=$(head -1 "$f" | awk '{print $2}')
  dir=$(dirname "$f")
  # Files whose package doesn't match directory convention
  expected_pkg=$(basename "$dir")
  if [ "$pkg" != "$expected_pkg" ] && [ "$pkg" != "main" ]; then
    echo "SUSPICIOUS: $f (package '$pkg' in dir '$expected_pkg')"
  fi
done
```

---

### Rust

```bash
# Rust compiler warns about dead code by default
cargo build 2>&1 | grep "warning.*dead_code\|warning.*unused" | tee /tmp/antigravity_rust.txt

# Check for .rs files not included in mod tree
find ./src -name '*.rs' | while read f; do
  modname=$(basename "$f" .rs)
  [ "$modname" = "mod" ] && continue
  [ "$modname" = "lib" ] && continue
  [ "$modname" = "main" ] && continue
  if ! grep -rl "mod ${modname}" ./src/ 2>/dev/null | grep -q .; then
    echo "POTENTIALLY ORPHANED: $f"
  fi
done
```

---

### Generic / Multi-Language

For projects that don't fit neatly into one ecosystem, or for catching cross-cutting waste:

```bash
# === ORPHAN ASSETS ===
# Find images, fonts, and media not referenced anywhere in source
for asset in $(find . -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \
  -o -name '*.gif' -o -name '*.svg' -o -name '*.ico' -o -name '*.webp' \
  -o -name '*.woff' -o -name '*.woff2' -o -name '*.ttf' -o -name '*.eot' \
  -o -name '*.mp4' -o -name '*.mp3' -o -name '*.wav' \) \
  -not -path './.git/*' -not -path './node_modules/*'); do
  asset_name=$(basename "$asset")
  if ! grep -rl "$asset_name" . \
    --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' \
    --include='*.html' --include='*.css' --include='*.scss' --include='*.less' \
    --include='*.py' --include='*.go' --include='*.rs' --include='*.java' \
    --include='*.rb' --include='*.php' --include='*.vue' --include='*.svelte' \
    --include='*.md' --include='*.json' --include='*.yaml' --include='*.yml' \
    2>/dev/null | grep -q .; then
    echo "ORPHAN ASSET: $asset ($(du -h "$asset" | cut -f1))"
  fi
done

# === DUPLICATE FILES ===
# Find exact duplicates by checksum
find . -type f -not -path './.git/*' -not -path './node_modules/*' \
  -exec md5sum {} + 2>/dev/null \
  | sort | awk 'seen[$1]++ { print "DUPLICATE:", $2, "(hash:", $1, ")" }'

# === EMPTY FILES ===
find . -type f -empty \
  -not -path './.git/*' -not -path './node_modules/*' \
  -exec echo "EMPTY: {}" \;

# === LARGE FILES THAT MIGHT BE ARTIFACTS ===
find . -type f -size +1M \
  -not -path './.git/*' -not -path './node_modules/*' \
  -not -path './vendor/*' -not -path './target/*' \
  | while read f; do
    echo "LARGE ($(du -h "$f" | cut -f1)): $f"
  done

# === CONFIG/DOT FILES ===
# Check for tool configs where the tool isn't used
declare -A config_tool_map=(
  [".eslintrc.js"]="eslint"
  [".eslintrc.json"]="eslint"
  [".prettierrc"]="prettier"
  [".stylelintrc"]="stylelint"
  [".babelrc"]="babel"
  ["babel.config.js"]="babel"
  [".flowconfig"]="flow"
  ["jest.config.js"]="jest"
  ["karma.conf.js"]="karma"
  [".mocharc.yml"]="mocha"
  ["webpack.config.js"]="webpack"
  ["rollup.config.js"]="rollup"
  ["gulpfile.js"]="gulp"
  ["Gruntfile.js"]="grunt"
  [".travis.yml"]="travis-ci"
  ["tslint.json"]="tslint"
)

for config_file in "${!config_tool_map[@]}"; do
  if [ -f "$config_file" ]; then
    tool="${config_tool_map[$config_file]}"
    # Check if tool is in dependencies
    if [ -f package.json ] && ! grep -q "\"$tool\"" package.json 2>/dev/null; then
      echo "ORPHAN CONFIG: $config_file (tool '$tool' not in dependencies)"
    fi
  fi
done
```

---

## Step 3 — Classify: Confidence Levels

After scanning, organize results into three tiers:

| Level | Meaning | Action |
|---|---|---|
| **🔴 Certain** | File is unreachable from any entry point, zero references anywhere, or is a known build artifact checked into source | Safe to remove |
| **🟡 Likely** | File has no obvious imports but might be dynamically loaded, referenced in configs, or used by a framework convention | Investigate before removing |
| **🟢 Investigate** | File has low reference count, is very old (check git log), or is suspiciously large for what it does | Worth a look |

### Framework-Aware Exceptions (DO NOT flag these as unused)

Some files are used by convention, not by explicit import. **Never flag these as unused:**

- **Next.js**: `pages/**`, `app/**`, `middleware.ts`, `next.config.*`
- **Nuxt**: `pages/**`, `layouts/**`, `middleware/**`, `plugins/**`
- **Django**: `migrations/**`, `admin.py`, `apps.py`, `models.py`, `urls.py`
- **Rails**: `db/migrate/**`, `config/**`, `app/views/**`
- **Flask**: templates and static directories referenced by convention
- **Spring**: `@Component`, `@Service`, `@Controller` annotated classes
- **Any framework**: test files (`*_test.*`, `*.test.*`, `*.spec.*`, `test_*.*`)
- **CI/CD**: `.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile`, `Dockerfile`
- **Config roots**: `package.json`, `tsconfig.json`, `pyproject.toml`, `Cargo.toml`, etc.
- **Documentation**: `README.*`, `LICENSE*`, `CHANGELOG*`, `CONTRIBUTING*`, `docs/**`

---

## Step 4 — Report

Generate a clear, actionable report. **Always present this before any deletion.**

Structure the report as:

```
🪂 ANTIGRAVITY REPORT — {project_name}
══════════════════════════════════════════

📊 PROJECT SUMMARY
   Total files scanned:    {N}
   Total project size:     {size}
   Files flagged:          {N} ({percentage}%)
   Potential size savings: {size}

🔴 CERTAIN — Safe to Remove ({N} files, {size})
   ├── {file_path} ({size}) — {reason}
   ├── {file_path} ({size}) — {reason}
   └── ...

🟡 LIKELY UNUSED — Verify Before Removing ({N} files, {size})
   ├── {file_path} ({size}) — {reason}
   └── ...

🟢 INVESTIGATE — Worth a Look ({N} files, {size})
   ├── {file_path} ({size}) — {reason}
   └── ...

📦 UNUSED DEPENDENCIES ({N} packages)
   ├── {package_name} — not imported in source
   └── ...

🖼️  ORPHAN ASSETS ({N} files, {size})
   ├── {file_path} ({size}) — not referenced in code or config
   └── ...

🔁 DUPLICATES ({N} sets)
   ├── {file_a} ↔ {file_b} ({size} each)
   └── ...
```

---

## Step 5 — Prune (User-Approved Only)

**Only after the user reviews the report and confirms which items to remove.**

```bash
# Create a backup manifest before deleting anything
mkdir -p /tmp/antigravity_backup
echo "Antigravity cleanup — $(date)" > /tmp/antigravity_backup/manifest.txt

# For each approved file
remove_file() {
  local file="$1"
  local reason="$2"
  # Record in manifest
  echo "REMOVED: $file — $reason" >> /tmp/antigravity_backup/manifest.txt
  # Copy to backup (preserving directory structure)
  mkdir -p "/tmp/antigravity_backup/$(dirname "$file")"
  cp "$file" "/tmp/antigravity_backup/$file" 2>/dev/null
  # Remove
  rm "$file"
  echo "✂️  Removed: $file"
}

# Remove unused dependencies (JS)
# npm prune              # Removes packages not in package.json
# npm dedupe             # Reduces duplication in node_modules

# Remove unused dependencies (Python)
# pip-autoremove         # pip install pip-autoremove --break-system-packages

# After removal, run a quick sanity check
echo ""
echo "🧪 POST-CLEANUP VERIFICATION"
echo "Run your test suite and build to confirm nothing broke."
```

---

## Safety Checklist

Before deleting anything, Claude should verify:

- [ ] The project has version control (`git status` succeeds)
- [ ] There are no uncommitted changes (`git diff --stat` is clean-ish)
- [ ] Entry points have been correctly identified
- [ ] Framework conventions have been accounted for
- [ ] Dynamic imports / lazy loading patterns have been checked
- [ ] Test files are excluded from "unused" analysis
- [ ] CI/CD and deployment configs are excluded
- [ ] The user has seen and approved the report

---

## Quick Reference — Tools by Ecosystem

| Ecosystem | Tool | What It Finds |
|---|---|---|
| JS/TS | [Knip](https://knip.dev) | Files, exports, deps, types |
| JS/TS | [depcheck](https://github.com/nicedoc/depcheck) | Unused npm dependencies |
| Python | [Vulture](https://github.com/jendrikseipp/vulture) | Dead code, unreachable code |
| Python | [deadcode](https://github.com/albertas/deadcode) | Unused code with auto-fix |
| Python | [autoflake](https://github.com/PyCQA/autoflake) | Unused imports and variables |
| Ruby | [debride](https://github.com/seattlerb/debride) | Uncalled methods |
| PHP | [phpstan-deadcode](https://github.com/shipmonk-rnd/dead-code-detector) | Dead code via PHPStan |
| Go | `go vet` / `staticcheck` | Unused vars, imports, funcs |
| Rust | `cargo build` warnings | Dead code, unused imports |
| Java | [UCDetector](https://marketplace.eclipse.org/content/unnecessary-code-detector) | Unnecessary code |
| Generic | [remnants](https://github.com/MatthieuLemoine/remnants) | Unused files in bundled projects |
| Generic | `git log -S` | When code was last referenced |
| C/C++ | `-ffunction-sections -Wl,--gc-sections` | Linker-level dead code removal |

---

## Anti-Patterns to Flag

Beyond unused files, also flag these gravity-inducing patterns:

1. **Commented-out code blocks** — if it's in git, it's recoverable; delete the comments
2. **TODO/FIXME/HACK comments older than 6 months** — check with `git blame`
3. **Vendored copies of packages that are also in package manager** — e.g., a `vendor/jquery.js` when jQuery is in `package.json`
4. **Multiple lockfiles** — `package-lock.json` AND `yarn.lock` AND `pnpm-lock.yaml` (pick one)
5. **Leftover scaffolding** — default READMEs, sample configs, boilerplate files from `create-react-app` / `django-admin startproject` that were never customized
6. **Unreferenced migrations** — database migrations that are older than the current schema and have been squashed
7. **Stale environment files** — `.env.example` that doesn't match actual `.env` structure
8. **Dead CI steps** — workflow jobs that reference deleted scripts or deprecated actions

---

## Example Usage

**User says:** *"Clean up my React project, it's gotten bloated"*

Claude should:
1. Read this SKILL.md
2. Run Step 0 to identify the project (React/Next.js/Vite/CRA)
3. Run Step 1 to scan all files
4. Run Step 2 with Knip or manual JS/TS tracing
5. Run Step 3 to classify findings with framework awareness
6. Present the Step 4 report and wait for user confirmation
7. Only after approval, run Step 5 to prune

**User says:** *"What files can I safely delete from this Python repo?"*

Claude should:
1. Read this SKILL.md
2. Detect Python project markers
3. Run Vulture and manual import tracing
4. Check for Django/Flask/FastAPI conventions
5. Present categorized report
6. Wait for user to choose what to remove

---

*Less code. Fewer dependencies. Faster builds. Easier onboarding. That's antigravity.* 🪂
