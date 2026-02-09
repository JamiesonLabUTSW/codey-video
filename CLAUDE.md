# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository is a **Claude Code plugin** containing three video analysis skills that share common preprocessing infrastructure:

- **query-video-segment** - Multimodal video segment analysis (frames + audio)
- **generate-video-outline** - Generate timestamped chapter outline of full video
- **generate-transcript** - Transcribe video audio with timestamps

**Plugin Name:** `codey-video`
**Namespace:** Skills are invoked as `/codey-video:skill-name`
**Installation:** See README.md for plugin installation methods

## Architecture

### Repository Structure

```
codey-video/
├── .claude-plugin/
│   ├── plugin.json                     # Plugin manifest
│   └── marketplace.json                # Marketplace entry (optional)
├── install.sh                          # DEPRECATED: Legacy installation
├── uninstall.sh                        # DEPRECATED: Legacy uninstallation
├── README.md                           # User-facing install + usage docs
├── CLAUDE.md                           # This file - developer docs
├── LICENSE                             # UT Southwestern Academic Research License
├── CHANGELOG.md                        # Version history
├── scripts/                            # Shared preprocessing scripts
│   ├── package.json
│   ├── tsconfig.json
│   ├── extract-frames.ts              # Frame extraction with optional --count N flag
│   ├── transcribe.ts                  # Whisper audio transcription
│   ├── get-duration.ts                # ffprobe duration query
│   ├── download-whisper.js            # Whisper model downloader
│   ├── post-install.sh                # Post-plugin-install setup
│   └── whisper.node.d.ts              # Type definitions
├── resources/                          # Shared Whisper models
│   ├── .gitignore
│   └── models/                         # *.bin files (gitignored, downloaded separately)
└── skills/                             # Each subdir = one skill
    ├── query-video-segment/
    │   ├── SKILL.md
    │   ├── scripts -> ../../scripts    # Symlink to shared
    │   └── resources -> ../../resources
    ├── generate-video-outline/
    │   ├── SKILL.md
    │   ├── scripts -> ../../scripts
    │   └── resources -> ../../resources
    └── generate-transcript/
        ├── SKILL.md
        ├── scripts -> ../../scripts
        └── resources -> ../../resources
```

### Design Pattern: Plugin with Shared Resources

This plugin uses Claude Code's official plugin system with a **symlink-based sharing pattern**:

1. **Plugin manifest** (`.claude-plugin/plugin.json`) declares plugin metadata
2. **Skills directory** contains individual skill definitions
3. **Each skill** symlinks to shared `scripts/` and `resources/`
4. **Installation** via `claude plugin install` or `--plugin-dir`
5. **Resolution**: Skills use `${CLAUDE_PLUGIN_ROOT}` to access shared resources

This design allows:
- Multiple skills to share preprocessing code and models
- Standard Claude Code plugin installation
- Easy marketplace distribution
- Simple updates via `git pull` + `claude plugin update`

### Skill Execution Flow

Each skill uses the **subagent pattern with inline Bash commands**:

1. **SKILL.md** defines prompt template with instructions
2. **Haiku subagent** is forked with the prompt (via `context: fork`, `agent: haiku`)
3. **Subagent runs preprocessing** via Bash tool:
   - Invokes TypeScript scripts using `npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/<script>.ts`
   - Scripts use execa to run ffmpeg for video processing
   - Scripts output structured data (file paths, timestamps, text)
4. **Subagent analyzes results**:
   - Uses Read tool to examine extracted frame images (WebP format)
   - Reviews transcript timestamps
   - Synthesizes visual and audio information to answer queries

### Preprocessing Scripts

All scripts located in `scripts/` directory:

| Script | Purpose | Key Details |
|--------|---------|-------------|
| **extract-frames.ts** | Extract video frames | - Default: 1fps<br>- Optional `--count N` for exact frame count<br>- Uses ffmpeg (via execa) + sharp<br>- Outputs WebP at 1568px width |
| **transcribe.ts** | Transcribe audio | - Uses @fugood/whisper.node (CPU-based)<br>- Supports MM:SS or seconds format<br>- Auto-detects best available model<br>- Outputs segment-level timestamps |
| **get-duration.ts** | Get video duration | - Uses ffprobe<br>- Outputs duration in seconds |
| **download-whisper.js** | Download models | - Downloads from HuggingFace<br>- Stores in `resources/models/` |

## Development Commands

### Installing Dependencies

```bash
cd scripts
npm install
```

### Downloading Whisper Models

```bash
cd scripts
npm run download-whisper base.en
# Options: tiny.en, tiny, base.en, base, small.en, small
```

### Building TypeScript

```bash
cd scripts
npm run build
```

### Testing Scripts Individually

**Frame extraction (default 1fps):**
```bash
cd scripts
npx tsx extract-frames.ts ~/Videos/test.mp4 0 10
```

**Frame extraction (exact count):**
```bash
cd scripts
npx tsx extract-frames.ts ~/Videos/test.mp4 0 60 --count 100
```

**Audio transcription:**
```bash
cd scripts
npx tsx transcribe.ts ~/Videos/test.mp4 0 10
# Time supports seconds ("120") or MM:SS format ("2:00")
```

**Get video duration:**
```bash
cd scripts
npx tsx get-duration.ts ~/Videos/test.mp4
```

### Testing the Plugin Locally

**Option 1: Direct plugin directory (fastest)**

```bash
cd /path/to/codey-video
./scripts/post-install.sh
claude code --plugin-dir $(pwd)
```

**Option 2: Local marketplace installation**

```bash
# Create local marketplace (one-time)
mkdir -p ~/.claude/marketplaces
cat > ~/.claude/marketplaces/dev.json << EOF
{
  "name": "dev-plugins",
  "version": "1.0.0",
  "owner": {"name": "Developer"},
  "plugins": [{"name": "codey-video", "source": "$(pwd)"}]
}
EOF

# Install and test
claude plugin install codey-video@dev-plugins
~/.claude/cache/plugins/codey-video/scripts/post-install.sh
```

Then test:
- `/codey-video:query-video-segment ~/Videos/test.mp4 0 10 "What happens?"`
- `/codey-video:generate-video-outline ~/Videos/test.mp4`
- `/codey-video:generate-transcript ~/Videos/test.mp4`

## Key Technical Details

### Frame Extraction Pipeline

- Extracts frames using ffmpeg (invoked via execa)
- **Default mode**: 1fps (`-vf fps=1`)
- **Count mode**: Calculates fps as `count/duration`, truncates to exactly N frames
- Resizes to max width 1568px (Claude's optimal vision input size)
- Converts PNG to WebP (quality: 80) for efficient transmission
- Stores in temporary directory (`/tmp/video-frames-*`)
- Outputs timestamped file paths for subagent to read

### Audio Transcription Pipeline

- Extracts audio segment using ffmpeg (invoked via execa)
- Converts to 16kHz mono WAV (Whisper's preferred format)
- Uses @fugood/whisper.node (`initWhisper` API, CPU-based, runs locally)
- Outputs segment-level timestamps adjusted to original video timeline
- Handles videos without audio gracefully ("No audio stream found")
- Supports time input in seconds or MM:SS format
- **Default model**: `base.en` (good speed/accuracy balance)
- **Model storage**: `resources/models/` directory (resolved relative to script location)
- **Model auto-detection**: Searches in preference order: base.en, base, tiny.en, tiny, small.en

### Model Path Resolution

The `getModelPath()` function in `transcribe.ts` resolves models relative to the script's location:

```typescript
// Works for both:
// - transcribe.ts in scripts/
// - dist/transcribe.js in scripts/dist/
const scriptsDir = currentDir.endsWith('/dist')
  ? path.dirname(currentDir)
  : currentDir;
const skillRootDir = path.dirname(scriptsDir);
const modelsDir = path.join(skillRootDir, 'resources', 'models');
```

This ensures models are found correctly whether running from source or compiled output, and works with the symlink structure.

## System Requirements

### macOS
- `brew install ffmpeg`
- Node.js 18+ (for native ESM support)

### Linux (Ubuntu/Debian)
- `sudo apt install build-essential ffmpeg`
- Node.js 18+

### Windows
- Install MinGW-w64 or MSYS2 (for make tools needed by whisper.node)
- Install ffmpeg via chocolatey: `choco install ffmpeg`
- Node.js 18+

## Modifying the Skills

### Adding a New Skill

1. Create new skill directory: `mkdir skills/new-skill-name`
2. Create symlinks: `cd skills/new-skill-name && ln -s ../../scripts scripts && ln -s ../../resources resources`
3. Create `skills/new-skill-name/SKILL.md` with frontmatter:
   ```yaml
   ---
   name: new-skill-name
   description: What this skill does
   context: fork
   agent: haiku
   allowed-tools: Bash, Read
   ---
   ```
4. Write prompt template using `<base-path>/scripts/` to reference scripts
5. Test locally with `./install.sh` then `/new-skill-name` in Claude Code

### Modifying Frame Extraction

**Change default frame rate:**
Edit `scripts/extract-frames.ts`, line ~42:
```typescript
'-vf', 'fps=2'  // Change from fps=1 to fps=2
```

**Change WebP quality:**
Edit `scripts/extract-frames.ts`, the `convertToWebP` function:
```typescript
.webp({ quality: 90 })  // Increase from 80 to 90
```

**Change frame resolution:**
Edit `scripts/extract-frames.ts`, the `convertToWebP` function:
```typescript
.resize(1280, null, {  // Change from 1568 to 1280
```

### Modifying Transcription

**Use different default model:**
Download the desired model, and it will be auto-detected by `getModelPath()` based on preference order:
```bash
cd scripts
npm run download-whisper small.en
```

Preference order: `base.en` → `base` → `tiny.en` → `tiny` → `small.en`

**Change language:**
Edit `scripts/transcribe.ts`, the `transcribeWithWhisper` function:
```typescript
language: 'es',  // Change from 'en' to 'es' for Spanish
```

### Modifying SKILL.md Prompts

Each skill's behavior is primarily defined by its SKILL.md prompt template. To change what the skill does:

1. Edit `skills/<skill-name>/SKILL.md`
2. Modify the instructions (everything after the frontmatter `---`)
3. Changes take effect immediately (no reinstall needed)

The prompt should:
- Instruct the subagent to run preprocessing scripts via Bash tool
- Use `<base-path>` placeholder to reference the skill's base directory
- Reference `$0`, `$1`, etc. for skill arguments
- Describe how to analyze the results (Read frames, review transcript, synthesize)

## Common Issues

### "Whisper model not found"
```bash
cd scripts
npm run download-whisper base.en
```

### "ffmpeg not found"
Install ffmpeg via system package manager (see System Requirements)

### No frames extracted
- Verify video file path is correct
- Check start/end times are within video duration
- Ensure ffmpeg can read the video format: `ffprobe <video-file>`

### No audio transcript
- Check if video has audio: `ffprobe <video-file>`
- Some screen recordings lack audio tracks

### Symlinks not working on Windows
- Ensure you have symlink privileges (run as Administrator or enable Developer Mode)
- Git for Windows should handle symlinks correctly with `core.symlinks=true`

### Skills not appearing in Claude Code
- Verify installation: `ls -la ~/.claude/skills/`
- Check symlinks point to correct location: `readlink ~/.claude/skills/query-video-segment`
- Restart Claude Code if skills were just installed

## Privacy & Performance

- **100% local processing** - No data sent to external services
- **Deterministic preprocessing** - Expensive ffmpeg/Whisper operations run once, results cached in temp directories
- **Efficient subagent** - Only sends relevant frames/transcript to Haiku (not the full video)
- **Cost-effective** - Uses fast Haiku model ($0.25 per million input tokens) with native multimodal vision
- **Memory-conscious** - Temporary files cleaned up after analysis; Whisper runs CPU-only to avoid GPU memory issues

## Contributing

When contributing to this repository:

1. **Test all three skills** after changes to shared scripts
2. **Verify symlinks** are committed correctly (Git should track them)
3. **Update README.md** for user-facing changes
4. **Update CLAUDE.md** for architectural or development workflow changes
5. **Test install/uninstall** scripts on a clean system if possible
6. **Document new skills** in both README and this file

### Code Style

- TypeScript: Use strict mode, prefer explicit types
- Scripts: Include usage error messages for incorrect arguments
- Output: Use clear formatting with `===` delimiters for structured sections
- Error handling: Handle missing files, no audio, invalid times gracefully

## Architecture Notes

### Why Subagent Pattern?

Using forked Haiku subagents (instead of having the main agent do everything) provides:

1. **Isolation** - Preprocessing output doesn't clutter main conversation
2. **Tool access** - Subagent has limited tools (Bash, Read), reducing surface area
3. **Authentication** - Subagent inherits Claude Code auth automatically
4. **Cost optimization** - Use cheaper Haiku for video analysis, reserve Sonnet for main tasks
5. **Parallelization** - Multiple skills can run simultaneously

### Why Bash + TypeScript (not Python)?

- **Pure npm** - No Python dependency management or venv setup
- **Faster startup** - Node.js starts faster than Python for short-lived scripts
- **Better ffmpeg integration** - execa provides excellent subprocess handling
- **Native async** - TypeScript's async/await is cleaner than Python's subprocess management
- **Type safety** - Catch errors at compile time

### Why Symlinks in Repo?

Symlinks are committed to the repository (not just created during install) because:

1. **Path resolution** - Each skill's `<base-path>` correctly resolves to skill root
2. **Relative imports** - Scripts can use `import.meta.url` to find models/resources
3. **Single source of truth** - One copy of scripts/resources shared by all skills
4. **Easy updates** - `git pull` updates scripts for all skills simultaneously

The symlinks work across platforms (macOS, Linux, Windows with Git) and are tracked by Git.
