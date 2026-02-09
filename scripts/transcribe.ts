#!/usr/bin/env ts-node

import { execa } from 'execa';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

interface Args {
  videoPath: string;
  startTime: number;
  endTime: number;
}

interface WhisperSegment {
  t0: number;
  t1: number;
  text: string;
}

interface WhisperResult {
  result?: string;
  segments: WhisperSegment[];
  language?: string;
  isAborted?: boolean;
}

function parseTimeToSeconds(timeStr: string): number {
  // Support both formats: "MM:SS" or just seconds as "123"
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  }
  return parseFloat(timeStr);
}

async function parseArgs(): Promise<Args> {
  const [videoPath, startTimeStr, endTimeStr] = process.argv.slice(2);

  if (!videoPath || !startTimeStr || !endTimeStr) {
    console.error('Usage: transcribe.ts <video-path> <start-time> <end-time>');
    console.error('Time can be in seconds (e.g., "120") or MM:SS format (e.g., "2:00")');
    process.exit(1);
  }

  return {
    videoPath,
    startTime: parseTimeToSeconds(startTimeStr),
    endTime: parseTimeToSeconds(endTimeStr),
  };
}

async function extractAudioSegment(
  videoPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<void> {
  const duration = endTime - startTime;

  try {
    await execa('ffmpeg', [
      '-ss', startTime.toString(),
      '-i', videoPath,
      '-t', duration.toString(),
      '-vn',  // no video
      '-f', 'wav',
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      outputPath,
      '-y'  // overwrite
    ]);

    // Verify the file was written and has content
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error('Audio file was created but is empty');
    }
  } catch (error: any) {
    if (error.stderr?.includes('Stream map') || error.stderr?.includes('does not contain any stream')) {
      throw new Error('NO_AUDIO_STREAM');
    }
    throw error;
  }
}

function formatTimestamp(milliseconds: number, offset: number): string {
  const totalSeconds = (milliseconds / 1000) + offset;
  const mins = Math.floor(totalSeconds / 60);
  const secs = (totalSeconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}`;
}

async function getModelPath(): Promise<string> {
  // Resolve the models directory relative to this script's location
  // Works for both transcribe.ts (in scripts/) and dist/transcribe.js (in scripts/dist/)
  const currentFilePath = new URL(import.meta.url).pathname;
  const currentDir = path.dirname(currentFilePath);

  // Determine the scripts directory (go up one level if we're in dist/)
  const scriptsDir = currentDir.endsWith('/dist')
    ? path.dirname(currentDir)
    : currentDir;

  // Navigate to skill root and then to resources/models
  const skillRootDir = path.dirname(scriptsDir);
  const modelsDir = path.join(skillRootDir, 'resources', 'models');

  // Try different model names in order of preference
  const modelNames = ['base.en.bin', 'base.bin', 'tiny.en.bin', 'tiny.bin', 'small.en.bin'];

  for (const modelName of modelNames) {
    const modelPath = path.join(modelsDir, modelName);
    try {
      await fs.access(modelPath);
      return modelPath;
    } catch {
      // Model not found, try next
    }
  }

  throw new Error(
    `No Whisper model found. Please download a model first:\n` +
    `  cd scripts && npm run download-whisper base.en\n\n` +
    `Expected model location: ${modelsDir}/<model-name>.bin`
  );
}

async function transcribeWithWhisper(
  audioPath: string,
  startTime: number
): Promise<string> {
  try {
    // Dynamic import since @fugood/whisper.node is ESM
    const { initWhisper } = await import('@fugood/whisper.node');

    const modelPath = await getModelPath();

    // Initialize Whisper with the model
    const context = await initWhisper(
      {
        filePath: modelPath,
        useGpu: false,  // Disable GPU to avoid Metal memory issues
      } as any,
      'default'  // Required: libVariant parameter ('default', 'vulkan', or 'cuda')
    );

    // Transcribe the audio file
    let promise, result;
    try {
      const transcribeResult = context.transcribeFile(audioPath, {
        language: 'en',
        temperature: 0.0,
      });
      promise = transcribeResult.promise;
      result = await promise as WhisperResult;
    } catch (error) {
      console.error('Error during transcription:', error);
      throw error;
    }

    // Release the context (if available)
    if (typeof context.release === 'function') {
      context.release();
    }

    if (!result.segments || result.segments.length === 0) {
      return 'No speech detected in this segment.';
    }

    // Format segments with adjusted timestamps
    const lines: string[] = [];

    for (const segment of result.segments) {
      const startTs = formatTimestamp(segment.t0, startTime);
      const endTs = formatTimestamp(segment.t1, startTime);
      const text = segment.text.trim();

      if (text) {
        lines.push(`[${startTs} → ${endTs}] ${text}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : 'No speech detected in this segment.';

  } catch (error: any) {
    if (error.message?.includes('No Whisper model found')) {
      throw error;
    }
    // Re-throw with original error message for debugging
    throw error;
  }
}

async function main() {
  try {
    const args = await parseArgs();

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-audio-'));
    const audioPath = path.join(tempDir, 'segment.wav');

    try {
      console.log('=== AUDIO TRANSCRIPT ===\n');

      await extractAudioSegment(
        args.videoPath,
        args.startTime,
        args.endTime,
        audioPath
      );

      const transcript = await transcribeWithWhisper(audioPath, args.startTime);

      console.log(transcript);
      console.log('\n========================\n');

    } catch (error: any) {
      if (error.message === 'NO_AUDIO_STREAM') {
        console.log('No audio stream found in video file.');
        console.log('\n========================\n');
      } else {
        throw error;
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }

  } catch (error) {
    console.error('Error transcribing audio:', error);
    process.exit(1);
  }
}

main();
