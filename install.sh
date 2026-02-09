#!/usr/bin/env bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  DEPRECATED: This installation method is deprecated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "codey-video is now a Claude Code plugin."
echo "Please use the plugin installation method instead."
echo ""
echo "See README.md for updated installation instructions."
echo ""
read -p "Continue with legacy installation? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi
echo ""

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="${HOME}/.claude/skills"

echo "Installing codey-video skills..."
echo ""

# Create skills directory if it doesn't exist
mkdir -p "$SKILLS_DIR"

# Install each skill
for skill_dir in "$REPO_DIR/skills"/*/; do
    skill_name=$(basename "$skill_dir")
    target="$SKILLS_DIR/$skill_name"

    if [ -e "$target" ]; then
        if [ -L "$target" ]; then
            # Check if it points to our repo
            link_target=$(readlink "$target")
            if [ "$link_target" = "$skill_dir" ]; then
                echo "✓ $skill_name (already installed)"
            else
                echo "⚠ Skipping $skill_name (symlink exists but points elsewhere: $link_target)"
            fi
        else
            echo "⚠ Skipping $skill_name (directory/file already exists at $target)"
        fi
    else
        ln -s "$skill_dir" "$target"
        echo "✓ Installed $skill_name"
    fi
done

echo ""

# Install npm deps if needed
if [ ! -d "$REPO_DIR/scripts/node_modules" ]; then
    echo "Installing npm dependencies..."
    (cd "$REPO_DIR/scripts" && npm install)
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

echo ""

# Check for Whisper model
if ! ls "$REPO_DIR/resources/models/"*.bin &>/dev/null; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  No Whisper model found"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Download a model to enable transcription:"
    echo "  cd $REPO_DIR/scripts"
    echo "  npm run download-whisper base.en"
    echo ""
    echo "Available models:"
    echo "  tiny.en   - Fastest, lowest accuracy (75 MB)"
    echo "  base.en   - Recommended balance (142 MB)"
    echo "  small.en  - Better accuracy, slower (466 MB)"
    echo ""
else
    model_count=$(ls "$REPO_DIR/resources/models/"*.bin 2>/dev/null | wc -l | tr -d ' ')
    echo "✓ Found $model_count Whisper model(s)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Installation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Available skills:"
echo "  /query-video-segment      - Analyze video segments"
echo "  /generate-video-outline   - Generate timestamped outline"
echo "  /generate-transcript      - Transcribe video audio"
echo ""
echo "Try: claude code"
echo ""
