---
name: generate-transcript
description: Generate a full timestamped transcript of a video's audio. Use when user asks to transcribe a video, get subtitles, or extract what is being said.
context: fork
agent: haiku
allowed-tools: Bash
---

# Generate Video Transcript

This skill creates a complete timestamped transcript of a video's audio track.

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

Save this duration value for the next step.

## Step 2: Transcribe Audio

Run the transcription script using the Bash tool:

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/transcribe.ts $0 0 <duration>
```

Replace `<duration>` with the value from Step 1.

## Step 3: Format and Output

The transcription output will show timestamped segments in the format:

```
[MM:SS.S → MM:SS.S] Transcribed text
```

Present the full transcript to the user in a clear, readable format. If the user requests specific formatting (SRT, VTT, plain text), format the transcript accordingly.

**Note:** If the video has no audio stream, inform the user that transcription is not possible.
