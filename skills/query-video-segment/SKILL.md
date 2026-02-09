---
name: query-video-segment
description: Analyze a specific video segment by extracting frames and transcribing audio. Use when user asks to analyze a video segment, understand video content in a time range, or answer questions about what happens in part of a video.
context: fork
agent: haiku
allowed-tools: Bash, Read
---

# Query Video Segment

This skill analyzes a specific video segment by extracting frames at 1fps and transcribing audio using Whisper.

**Prerequisites:**
If this is your first time using video analysis skills, ensure dependencies are installed:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/post-install.sh
```

## Step 1: Run Preprocessing

Before analyzing, you MUST run both of these commands using the Bash tool. Run them in parallel if possible.

**Frame extraction:**
```
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/extract-frames.ts $0 $1 $2
```

**Audio transcription:**
```
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/transcribe.ts $0 $1 $2
```

## Step 2: Analyze

Using the output from both commands:
1. Use the Read tool to examine each extracted frame image file
2. Review the transcript timestamps

**Analysis Query:** $3

Synthesize the visual and audio information to answer the query. Consider:
- What is shown visually in the frames
- What is being said in the audio
- How the visual and audio content relate
- Sequential progression and narrative flow
- Key moments where visual and audio align or diverge

Provide your analysis in a clear, structured response that integrates both modalities.

