# Code Review Guide: Plugin Restructuring (v1.0 → v2.0)

This guide helps reviewers understand and validate the changes made to restructure codey-video as an official Claude Code plugin.

## Overview of Changes

This is a **BREAKING** restructuring that transforms the project from a collection of individual skills (installed via `install.sh`) into a proper Claude Code plugin with namespaced skills.

**Migration:** Users must switch from `./install.sh` → `claude plugin install` or `--plugin-dir`

## What to Review

### 1. Plugin Architecture Compliance

**Files to examine:**
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

**Validation checklist:**
- [ ] `plugin.json` contains required fields: `name`, `version`, `description`
- [ ] Plugin name is `codey-video` (matches directory structure)
- [ ] Version is `2.0.0` (matches CHANGELOG.md)
- [ ] License field is present and set to `MIT`
- [ ] Homepage and repository URLs point to correct locations
- [ ] Keywords are relevant and searchable
- [ ] `marketplace.json` source points to `./` (relative to plugin root)

**Expected structure:**
```json
{
  "name": "codey-video",
  "version": "2.0.0",
  "description": "...",
  "author": { "name": "Michael" },
  "license": "MIT"
}
```

---

### 2. Skill Definitions (SKILL.md Updates)

**Files to examine:**
- `skills/query-video-segment/SKILL.md`
- `skills/generate-video-outline/SKILL.md`
- `skills/generate-transcript/SKILL.md`

**Validation checklist:**
- [ ] All instances of `<base-path>` are replaced with `${CLAUDE_PLUGIN_ROOT}`
- [ ] Prerequisites section now points to `${CLAUDE_PLUGIN_ROOT}/scripts/post-install.sh`
- [ ] All script invocations use format: `npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/<script>.ts`
- [ ] Old prerequisites about individual npm/model setup are removed
- [ ] No hardcoded paths remain (search for `/Users/`, `~`, or relative `./scripts`)

**Sample checks:**
```bash
# Verify CLAUDE_PLUGIN_ROOT is used everywhere
grep -r "<base-path>" skills/
# Should return 0 results - all should be replaced

# Verify no hardcoded paths
grep -r "~/\|/Users/\|\.\/scripts" skills/*.md
# Should return 0 results
```

**Expected pattern in scripts:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/extract-frames.ts $0 $1 $2
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/transcribe.ts $0 $1 $2
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/get-duration.ts $0
```

---

### 3. Post-Install Script

**File to examine:**
- `scripts/post-install.sh`

**Validation checklist:**
- [ ] Script is executable: `ls -la scripts/post-install.sh` shows `-rwx------`
- [ ] Script properly detects `${CLAUDE_PLUGIN_ROOT}` environment variable
- [ ] Falls back to `dirname $0/..` when `CLAUDE_PLUGIN_ROOT` is not set
- [ ] npm dependencies installation is conditional (checks for `node_modules`)
- [ ] Whisper model check looks in correct directory: `resources/models/*.bin`
- [ ] Output messages are clear and user-friendly
- [ ] Available models list matches project documentation
- [ ] Script exits cleanly with no errors

**Key sections to verify:**
```bash
# Correct plugin root detection
if [ -n "${CLAUDE_PLUGIN_ROOT}" ]; then
    PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
else
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
fi

# Conditional npm install
if [ ! -d "$PLUGIN_ROOT/scripts/node_modules" ]; then
    (cd "$PLUGIN_ROOT/scripts" && npm install)
fi

# Model detection
if ! ls "$PLUGIN_ROOT/resources/models/"*.bin &>/dev/null; then
    # Show warning and download instructions
fi
```

**Test execution:**
```bash
cd /path/to/codey-video
./scripts/post-install.sh
# Should output:
# ✓ Dependencies already installed (or install them)
# ✓ Found X Whisper model(s) (or warning)
# ✅ Setup complete!
```

---

### 4. Documentation Updates

#### README.md

**Sections to review:**
- [ ] Skills table uses `codey-video:` namespace in all examples
- [ ] Installation section completely rewritten for plugin approach
- [ ] Method 1 (`--plugin-dir`) is clearly explained as fastest path
- [ ] Method 2 (marketplace) explains persistent installation
- [ ] Old `./install.sh` references removed
- [ ] Usage examples all reference `/codey-video:skill-name`
- [ ] Uninstall section covers both installation methods
- [ ] Migration guide from v1.x is present

**Content verification:**
```bash
# Verify no old-style invocations remain
grep "/query-video-segment\|/generate-" README.md | grep -v "codey-video:"
# Should return 0 results

# Verify new installation instructions are present
grep -A 10 "Direct Plugin Directory" README.md
# Should contain --plugin-dir and post-install.sh
```

#### CLAUDE.md

**Sections to review:**
- [ ] Overview mentions "Claude Code plugin" instead of "portable skill collection"
- [ ] Plugin metadata section is added with namespace info
- [ ] Repository Structure shows `.claude-plugin/` directory
- [ ] Design Pattern section updated to reflect plugin architecture
- [ ] Skill Execution Flow uses `${CLAUDE_PLUGIN_ROOT}` in examples
- [ ] Testing section updated to show `--plugin-dir` and marketplace approaches
- [ ] All file references match actual repository structure

**Content verification:**
```bash
# Verify architecture description is accurate
grep -A 5 "Design Pattern" CLAUDE.md
# Should mention plugin system and marketplace

# Verify testing instructions match current method
grep -A 10 "Testing the Plugin Locally" CLAUDE.md
# Should have --plugin-dir and marketplace options
```

#### CHANGELOG.md

**Validation checklist:**
- [ ] Version 2.0.0 is documented
- [ ] BREAKING changes are clearly marked
- [ ] All major changes are listed:
  - Namespace change (skills now have `codey-video:` prefix)
  - Installation method change (plugin system)
  - Path variable change (`${CLAUDE_PLUGIN_ROOT}` vs `<base-path>`)
- [ ] Migration notes reference README.md
- [ ] Version 1.0.0 baseline is documented

---

### 5. Deprecation Notices

**Files to examine:**
- `install.sh`
- `uninstall.sh`

**Validation checklist:**
- [ ] Deprecation warning appears at script start
- [ ] Warning explains the new method (plugin system)
- [ ] References README.md for instructions
- [ ] Requires user confirmation before proceeding
- [ ] Scripts still function if user chooses to continue
- [ ] No silent failures - if deprecated, make it obvious

**Expected flow:**
```bash
./install.sh
# Output:
# ⚠️  DEPRECATED: This installation method is deprecated
# Continue with legacy installation? [y/N]
```

---

### 6. License and Legal

**Files to verify:**
- [ ] `LICENSE` file exists and contains MIT license text
- [ ] `LICENSE` has current year (2026) and correct attribution
- [ ] All project metadata references MIT license
- [ ] `plugin.json` has `"license": "MIT"`

---

### 7. Git Configuration

**Files to examine:**
- `.gitignore`

**Validation checklist:**
- [ ] Ignores `scripts/node_modules/`
- [ ] Ignores `resources/models/*.bin` (Whisper models)
- [ ] Ignores `.claude-plugin/.cache/`
- [ ] Ignores OS-specific files (`.DS_Store`)
- [ ] Pattern doesn't accidentally ignore important files

---

## How to Test the Changes

### Test 1: Structure Validation

```bash
cd /path/to/codey-video

# Verify plugin manifest exists
ls -la .claude-plugin/plugin.json
# Should exist and be readable

# Verify symlinks are intact
ls -la skills/query-video-segment/scripts
# Should show: scripts -> ../../scripts

ls -la skills/query-video-segment/resources
# Should show: resources -> ../../resources

# Verify all 3 skills have symlinks
for skill in skills/*/; do
  echo "=== $(basename $skill) ==="
  ls -la "$skill"scripts "$skill"resources 2>&1 | head -2
done
```

**Expected result:** No broken symlinks, all point to shared resources

---

### Test 2: Post-Install Script

```bash
cd /path/to/codey-video

# Make sure script is executable
test -x scripts/post-install.sh && echo "✓ Executable"

# Test execution (dry run, no actual installation)
./scripts/post-install.sh

# Expected output:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# codey-video Plugin Setup
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ✓ Dependencies already installed
# ✓ Found X Whisper model(s)
# ✅ Setup complete!
```

---

### Test 3: Plugin Directory Mode

```bash
cd /path/to/codey-video

# Test with --plugin-dir (requires Claude Code installed)
claude code --plugin-dir $(pwd)

# In the Claude Code conversation:
# Type: /help
# Look for: codey-video:query-video-segment, codey-video:generate-video-outline, codey-video:generate-transcript
# Should show all three skills with codey-video: namespace
```

---

### Test 4: Variable Resolution

```bash
# Test CLAUDE_PLUGIN_ROOT resolution
export CLAUDE_PLUGIN_ROOT=/test/path
bash -c 'source scripts/post-install.sh' 2>&1 | grep "codey-video Plugin Setup"
# Should work without errors

# Test fallback (when CLAUDE_PLUGIN_ROOT not set)
unset CLAUDE_PLUGIN_ROOT
./scripts/post-install.sh 2>&1 | head -5
# Should detect plugin root from script location
```

---

### Test 5: Documentation Cross-Reference

```bash
# Verify README.md installation instructions match CLAUDE.md
diff <(grep -A 20 "Installation" README.md) \
     <(grep -A 20 "Testing the Plugin" CLAUDE.md)
# Should have similar commands and approaches

# Verify all commands in README are correct
grep "claude plugin\|--plugin-dir\|npm run download" README.md
# Should all be valid commands
```

---

### Test 6: Breaking Changes Validation

```bash
# Verify old installation no longer works correctly as described
# (This is expected - it should show deprecation warning)
./install.sh | head -10
# Should show deprecation warning

# Verify old symlinks would break
# Search for any references to ~/.claude/skills/query-video-segment
grep -r "~/.claude/skills" README.md CLAUDE.md
# Should return 0 results (no old installation paths referenced)
```

---

## Architectural Decisions to Validate

### 1. Environment Variable Choice: `${CLAUDE_PLUGIN_ROOT}`

**Decision:** Use `${CLAUDE_PLUGIN_ROOT}` instead of `<base-path>`

**Why this matters:**
- `<base-path>` was a placeholder; `${CLAUDE_PLUGIN_ROOT}` is Claude Code's standard
- Ensures skills work regardless of installation method
- Consistent with other Claude Code plugins

**Validation:** Verify this variable works in both contexts:
- Direct plugin directory: `--plugin-dir /path/to/repo`
- Marketplace installation: `~/.claude/cache/plugins/codey-video/`

---

### 2. Post-Install Script vs. Built-in Setup

**Decision:** Use shell script for post-install instead of npm hooks

**Why this matters:**
- Claude Code plugins support post-install hooks
- Shell script is platform-independent (works on macOS, Linux, Windows with Git Bash)
- User can inspect and understand what the script does
- Can handle conditional installation (check if deps already exist)

**Validation:** Verify the script handles all necessary setup without external tools

---

### 3. Deprecation Strategy

**Decision:** Keep `install.sh`/`uninstall.sh` with warnings, don't delete them

**Why this matters:**
- Smooth migration path for existing users
- Shows respect for legacy workflows
- User can still use old method if needed (with explicit confirmation)
- Provides time for widespread plugin discovery

**Validation:** Verify warnings are clear and helpful

---

### 4. Marketplace Readiness

**Decision:** Create both `plugin.json` and `marketplace.json` now

**Why this matters:**
- Prepares for future marketplace distribution
- Clear separation of plugin metadata vs. marketplace metadata
- Ready to submit when desired

**Validation:** Files follow Claude Code plugin specification

---

## Potential Issues to Watch For

### ❌ Critical Issues

1. **Broken Symlinks**
   - Verify: `find skills -type l -exec test ! -e {} \; -print`
   - Should return empty list

2. **Missing Variable Resolution**
   - Search: `grep -r "<base-path>" skills/`
   - Should return empty (all replaced with `${CLAUDE_PLUGIN_ROOT}`)

3. **Hardcoded Paths**
   - Search: `grep -r "/Users/michael\|~/" skills/`
   - Should return empty

4. **Broken Deprecation**
   - Verify: `./install.sh` and `./uninstall.sh` still function (can be interrupted)

### ⚠️ Warnings

5. **Documentation Consistency**
   - All skill invocations should use `codey-video:` prefix
   - Installation instructions should be identical in README and CLAUDE

6. **Plugin Manifest Completeness**
   - Should have all required fields for marketplace submission
   - URLs should be valid and point to real resources

---

## Sign-Off Checklist

Use this checklist to confirm the restructuring is complete and correct:

### Structure ✓
- [ ] `.claude-plugin/plugin.json` exists with valid metadata
- [ ] `.claude-plugin/marketplace.json` exists
- [ ] `scripts/post-install.sh` is executable
- [ ] `LICENSE` file exists with MIT text
- [ ] `CHANGELOG.md` documents v2.0.0 changes
- [ ] `.gitignore` includes plugin cache and models
- [ ] All symlinks in `skills/` directories are intact

### Code ✓
- [ ] All SKILL.md files use `${CLAUDE_PLUGIN_ROOT}`
- [ ] No `<base-path>` references remain in skills
- [ ] Post-install script properly detects plugin root
- [ ] Post-install script handles missing dependencies gracefully
- [ ] install.sh and uninstall.sh have deprecation warnings

### Documentation ✓
- [ ] README.md has plugin installation instructions (both methods)
- [ ] README.md uses `codey-video:` namespace in all examples
- [ ] README.md has uninstall instructions for both methods
- [ ] README.md has migration guide from v1.x
- [ ] CLAUDE.md describes plugin architecture correctly
- [ ] CLAUDE.md testing section uses `--plugin-dir` approach
- [ ] CHANGELOG.md documents breaking changes

### Testing ✓
- [ ] Post-install script runs successfully
- [ ] `--plugin-dir` approach works (or can be tested when Claude Code available)
- [ ] No hardcoded paths in documentation
- [ ] All commands in README are valid
- [ ] Old installation method shows clear deprecation warning

### Ready for Release ✓
- [ ] Version is 2.0.0 in plugin.json and CHANGELOG.md
- [ ] Author information is correct
- [ ] License is MIT
- [ ] No breaking changes beyond documented ones

---

## Questions for the Author

If any issues are found, ask:

1. **About Plugin Manifest:**
   - Are the homepage and repository URLs correct?
   - Should any additional fields be added (e.g., `documentation`, `bugs`)?

2. **About Path Resolution:**
   - How will `${CLAUDE_PLUGIN_ROOT}` be set in different installation contexts?
   - Is the fallback logic sufficient?

3. **About Deprecation:**
   - How long should we keep the deprecated scripts?
   - Should we add more aggressive warnings?

4. **About Testing:**
   - Has this been tested with actual Claude Code plugin installation?
   - Were all three skills tested with the new namespace?

5. **About Marketplace:**
   - Are we planning to submit to official Claude Code marketplace?
   - Should marketplace.json be in a different format?

---

## Approval Criteria

✅ **Approve if:**
- All structure elements are present and correct
- All SKILL.md files properly updated
- Documentation is clear and consistent
- Deprecation path is reasonable
- Tests pass and functionality is preserved
- No hardcoded paths or broken symlinks

❌ **Request changes if:**
- Any `<base-path>` references remain in code
- Documentation is inconsistent or outdated
- Plugin manifest has missing required fields
- Symlinks are broken
- Critical issues are unfixed

---

## Additional Resources

- [Claude Code Plugin Documentation](https://claude.ai/code) (when available)
- [CHANGELOG.md](CHANGELOG.md) - Version history and breaking changes
- [README.md](README.md) - User-facing installation guide
- [CLAUDE.md](CLAUDE.md) - Developer documentation
