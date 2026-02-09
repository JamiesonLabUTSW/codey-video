# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-09

### Changed
- **BREAKING**: Restructured as official Claude Code plugin with `codey-video:` namespace
- **BREAKING**: Skills now invoked as `/codey-video:query-video-segment` (was `/query-video-segment`)
- **BREAKING**: Installation now via `claude plugin install` or `--plugin-dir` (was `./install.sh`)
- Updated all skill definitions to use `${CLAUDE_PLUGIN_ROOT}` instead of `<base-path>`
- Created post-install script for dependency setup
- Deprecated custom install.sh/uninstall.sh scripts

### Added
- `.claude-plugin/plugin.json` - Plugin manifest
- `.claude-plugin/marketplace.json` - Marketplace entry
- `scripts/post-install.sh` - Automated setup script
- `CHANGELOG.md` - This file
- `LICENSE` - MIT license
- Migration guide in README.md

### Fixed
- Improved portability for marketplace distribution
- Better documentation for plugin-based installation

## [1.0.0] - 2026-02-08

### Added
- Initial release with three skills: query-video-segment, generate-video-outline, generate-transcript
- Custom install.sh/uninstall.sh scripts for skill installation
- Shared preprocessing scripts: extract-frames.ts, transcribe.ts, get-duration.ts
- Whisper model integration for local audio transcription
- ffmpeg-based frame extraction
