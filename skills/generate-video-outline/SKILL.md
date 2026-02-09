---
name: generate-video-outline
description: Generate a timestamped outline of a video with key events and descriptions. Use when user asks for a video outline, summary, table of contents, or chapter markers.
context: fork
agent: haiku
allowed-tools: Bash, Read
---

# Generate Video Outline

This skill creates a comprehensive timestamped outline of a video by analyzing frames and audio.

**Prerequisites:**
If this is your first time using video analysis skills, ensure dependencies are installed:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/post-install.sh
```

## Step 1: Get Video Duration

First, get the total video duration:

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/get-duration.ts $0
```

Save this duration value for the next steps.

## Step 2: Run Preprocessing

Run both preprocessing scripts **in parallel** using the Bash tool:

**Extract exactly 100 frames uniformly distributed:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/extract-frames.ts $0 0 <duration> --count 100
```

**Transcribe full audio:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/transcribe.ts $0 0 <duration>
```

Replace `<duration>` with the value from Step 1.

## Step 3: Analyze and Generate Outline

Using the output from both commands:

1. Use the Read tool to examine each of the 100 extracted frame images
2. Review the complete transcript with timestamps
3. Generate a timestamped outline that includes:
   - Chapter titles and time ranges
   - Descriptions of what's happening visually
   - Key points from what's being said
   - Important visual elements (slides, demonstrations, scene changes)
   - Major topic transitions

Format the outline as:

```
# Video Outline

## [00:00 - MM:SS] Chapter Title
- Visual: Description of what's shown
- Audio: Key points being discussed
- Notable: Any significant moments or transitions

## [MM:SS - MM:SS] Next Chapter
...
```

Provide a comprehensive outline that captures the full structure and content flow of the video.
