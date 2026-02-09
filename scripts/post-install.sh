#!/usr/bin/env bash
set -e

# Determine plugin root
if [ -n "${CLAUDE_PLUGIN_ROOT}" ]; then
    PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
else
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "codey-video Plugin Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install npm dependencies
if [ ! -d "$PLUGIN_ROOT/scripts/node_modules" ]; then
    echo "Installing npm dependencies..."
    (cd "$PLUGIN_ROOT/scripts" && npm install)
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

echo ""

# Check for Whisper model
if ! ls "$PLUGIN_ROOT/resources/models/"*.bin &>/dev/null; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  No Whisper model found"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Download a model to enable transcription:"
    echo "  cd $PLUGIN_ROOT/scripts"
    echo "  npm run download-whisper base.en"
    echo ""
    echo "Available models:"
    echo "  tiny.en   - Fastest, lowest accuracy (75 MB)"
    echo "  base.en   - Recommended balance (142 MB)"
    echo "  small.en  - Better accuracy, slower (466 MB)"
    echo ""
else
    model_count=$(ls "$PLUGIN_ROOT/resources/models/"*.bin 2>/dev/null | wc -l | tr -d ' ')
    echo "✓ Found $model_count Whisper model(s)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Available skills (use with codey-video: namespace):"
echo "  /codey-video:query-video-segment      - Analyze video segments"
echo "  /codey-video:generate-video-outline   - Generate timestamped outline"
echo "  /codey-video:generate-transcript      - Transcribe video audio"
echo ""
