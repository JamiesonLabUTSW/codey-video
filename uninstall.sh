#!/usr/bin/env bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  DEPRECATED: This uninstallation method is deprecated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "codey-video is now a Claude Code plugin."
echo "Please use the plugin uninstallation method instead."
echo ""
echo "See README.md for updated uninstallation instructions."
echo ""
read -p "Continue with legacy uninstallation? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi
echo ""

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="${HOME}/.claude/skills"

echo "Uninstalling codey-video skills..."
echo ""

removed_count=0
skipped_count=0

# Remove each skill symlink
for skill_dir in "$REPO_DIR/skills"/*/; do
    skill_name=$(basename "$skill_dir")
    target="$SKILLS_DIR/$skill_name"

    if [ -L "$target" ]; then
        # Check if it points to our repo
        link_target=$(readlink "$target")
        if [ "$link_target" = "$skill_dir" ]; then
            rm "$target"
            echo "✓ Removed $skill_name"
            ((removed_count++))
        else
            echo "⚠ Skipping $skill_name (points to different location: $link_target)"
            ((skipped_count++))
        fi
    elif [ -e "$target" ]; then
        echo "⚠ Skipping $skill_name (not a symlink, manual removal required)"
        ((skipped_count++))
    else
        echo "- $skill_name (not installed)"
    fi
done

echo ""

if [ $removed_count -gt 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Uninstalled $removed_count skill(s)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "No skills were uninstalled"
fi

if [ $skipped_count -gt 0 ]; then
    echo ""
    echo "Note: $skipped_count skill(s) were skipped (see warnings above)"
fi

echo ""
echo "To remove downloaded models and dependencies, run:"
echo "  rm -rf $REPO_DIR/scripts/node_modules"
echo "  rm -rf $REPO_DIR/resources/models/*.bin"
echo ""
