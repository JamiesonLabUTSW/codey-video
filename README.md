# codey-video

A Claude Code plugin providing powerful video analysis skills that combine visual frame extraction and audio transcription to enable comprehensive multimodal video understanding.

## Skills Included

| Skill | Description | Usage |
|-------|-------------|-------|
| **query-video-segment** | Analyze video segments with multimodal AI (frames + audio) | `/codey-video:query-video-segment <path> <start> <end> <query>` |
| **generate-video-outline** | Create timestamped chapter outline of full video | `/codey-video:generate-video-outline <path>` |
| **generate-transcript** | Generate complete timestamped audio transcript | `/codey-video:generate-transcript <path>` |

## Features

- **100% Local Processing** - All video processing and AI analysis happens on your machine. No data sent to external services.
- **Multimodal Analysis** - Combines visual frames (1fps) with Whisper audio transcription for comprehensive understanding
- **Fast Haiku Subagent** - Uses Claude Haiku with native vision for cost-effective analysis
- **Pure Node.js** - No Python dependencies. Uses TypeScript + npm for all preprocessing
- **Parallel Processing** - Frame extraction and transcription run simultaneously for speed
- **Flexible** - Analyze short segments or process hours of video

## Installation

### Prerequisites

**System requirements:**
- **macOS:** `brew install ffmpeg`
- **Linux (Ubuntu/Debian):** `sudo apt install build-essential ffmpeg`
- **Windows:** Install [MinGW-w64](https://www.mingw-w64.org/) or [MSYS2](https://www.msys2.org/), then `choco install ffmpeg`
- **Node.js:** Version 18+ (for ESM support)

### Install Plugin

```bash
# Clone the repository
git clone https://github.com/yourusername/codey-video.git
cd codey-video

# Install dependencies and download Whisper model
./scripts/post-install.sh

# Use with Claude Code
claude code --plugin-dir $(pwd)
```

Skills are available with the `codey-video:` namespace.

**Note:** You'll need to use `--plugin-dir $(pwd)` each time you start Claude Code from this directory. Consider creating a shell alias:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias codey='claude code --plugin-dir ~/path/to/codey-video'
```

### Download Whisper Model

The `post-install.sh` script installs dependencies. To download a Whisper model for transcription:

```bash
cd scripts
npm run download-whisper base.en
```

**Recommended model:** `base.en` (142 MB) - Best balance of speed and accuracy for English

## Usage Examples

### Analyze a Video Segment

Analyze what happens in a specific time range:

```
/codey-video:query-video-segment ~/Videos/presentation.mp4 60 120 "What is being discussed in this segment?"
```

Arguments:
- `path` - Path to video file
- `start` - Start time in seconds
- `end` - End time in seconds
- `query` - What you want to know about the segment

### Generate Full Video Outline

Create a timestamped chapter outline with visual and audio descriptions:

```
/codey-video:generate-video-outline ~/Videos/tutorial.mp4
```

Output includes:
- Chapter titles and time ranges
- Visual descriptions of what's shown
- Key points from the audio
- Scene transitions and topic changes

### Transcribe Video Audio

Get a complete timestamped transcript:

```
/codey-video:generate-transcript ~/Videos/interview.mp4
```

Returns segment-level timestamps in format:
```
[MM:SS.S → MM:SS.S] Transcribed text
```

## Whisper Models

Download models with:

```bash
cd scripts
npm run download-whisper <model-name>
```

Available models (English-only `.en` models are faster):

| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| `tiny.en` | 75 MB | Fastest | Lowest | Quick drafts, low-resource systems |
| `base.en` | 142 MB | Fast | Good | **Recommended - Best balance** |
| `small.en` | 466 MB | Slow | Better | When accuracy is critical |
| `tiny` | 75 MB | Fast | Low | Multilingual (100+ languages) |
| `base` | 142 MB | Medium | Good | Multilingual |
| `small` | 466 MB | Slow | Better | Multilingual, high accuracy |

Models are stored in `resources/models/` and auto-detected in preference order: `base.en`, `base`, `tiny.en`, `tiny`, `small.en`.

## How It Works

### Architecture

1. **Preprocessing Scripts** (TypeScript/Node.js)
   - `extract-frames.ts` - Uses ffmpeg (via execa) + sharp to extract frames at 1fps, converts to WebP
   - `transcribe.ts` - Uses ffmpeg + @fugood/whisper.node for local CPU transcription
   - `get-duration.ts` - Uses ffprobe to query video duration

2. **Haiku Subagent** (Forked Context)
   - Runs preprocessing scripts in parallel via Bash tool
   - Reads extracted frame images via Read tool
   - Synthesizes visual and audio information to answer queries
   - Uses native multimodal vision (no extra API calls)

3. **Skill Definitions** (SKILL.md)
   - Define prompt templates that instruct the subagent
   - Specify allowed tools (Bash, Read)
   - Map arguments to script parameters

### Why This Design?

- **Deterministic Preprocessing** - Expensive ffmpeg/Whisper operations run once, results are cached
- **No Auth Issues** - Subagent inherits Claude Code authentication automatically
- **Clean Separation** - Scripts do data processing, AI does reasoning
- **Cost-Effective** - Only sends relevant frames/transcript to fast Haiku model
- **Privacy-First** - All processing local, no external API calls

## Troubleshooting

### "Whisper model not found"

Download a model:
```bash
cd scripts
npm run download-whisper base.en
```

### "ffmpeg not found"

Install ffmpeg via your system package manager (see System Requirements above).

### No frames extracted

- Verify video file path is correct
- Check start/end times are within video duration
- Test with ffprobe: `ffprobe <video-file>`

### No audio transcript

- Check if video has audio stream: `ffprobe <video-file>`
- Some screen recordings lack audio tracks
- Video files without audio will show "No audio stream found"

### Transcription quality issues

Try a larger model:
```bash
cd scripts
npm run download-whisper small.en
```

The transcription script auto-detects and uses the best available model.

## Uninstall

Simply stop using the `--plugin-dir` flag. To remove models and dependencies:

```bash
cd /path/to/codey-video
rm -rf resources/models/*.bin scripts/node_modules
```

## Advanced Usage

### Custom Frame Rate

Edit `scripts/extract-frames.ts`, line 42:
```typescript
'-vf', 'fps=2'  // Change from fps=1 to fps=2
```

### Custom Frame Count

The `extract-frames.ts` script supports extracting exactly N frames:
```bash
npx tsx scripts/extract-frames.ts video.mp4 0 120 --count 50
```

This extracts exactly 50 frames uniformly distributed across the time range.

### Different Time Ranges

The `transcribe.ts` script supports multiple time formats:
- Seconds: `120`
- MM:SS: `2:00`
- HH:MM:SS: `1:30:00`

### Analyze Long Videos

For videos longer than a few minutes, consider:
- Using `/generate-video-outline` first to understand structure
- Then using `/query-video-segment` to deep-dive into specific segments
- Breaking analysis into multiple queries

## Roadmap

Future skill ideas (contributions welcome):

- `/extract-frames` - Just extract frames without AI analysis (for screenshots)
- `/video-search <path> <query>` - Search for when something specific happens
- `/video-to-slides <path>` - Extract unique slides from presentation recordings (deduplicate similar frames)
- `/video-chapters <path>` - Output YouTube-style chapter markers

## Technical Stack

Built with:
- [ffmpeg](https://ffmpeg.org/) - Video/audio processing
- [execa](https://github.com/sindresorhus/execa) - Process execution
- [sharp](https://github.com/lovell/sharp) - High-performance image processing
- [@fugood/whisper.node](https://github.com/nicepkg/whisper.node) - Fast Whisper bindings for Node.js
- [Claude Code](https://claude.ai/code) - AI-powered CLI and skill system

## Contributing

Contributions welcome! Please see [CLAUDE.md](CLAUDE.md) for developer documentation.

## License

MIT
