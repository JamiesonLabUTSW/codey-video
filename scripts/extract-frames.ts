#!/usr/bin/env ts-node

import { execa } from 'execa';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

interface Args {
  videoPath: string;
  startTime: number;
  endTime: number;
  count?: number;
}

async function parseArgs(): Promise<Args> {
  const args = process.argv.slice(2);
  const [videoPath, startTimeStr, endTimeStr] = args;

  if (!videoPath || !startTimeStr || !endTimeStr) {
    console.error('Usage: extract-frames.ts <video-path> <start-time> <end-time> [--count N]');
    process.exit(1);
  }

  // Parse optional --count flag
  let count: number | undefined;
  const countIndex = args.indexOf('--count');
  if (countIndex !== -1 && args[countIndex + 1]) {
    count = parseInt(args[countIndex + 1], 10);
    if (isNaN(count) || count <= 0) {
      console.error('Error: --count must be a positive integer');
      process.exit(1);
    }
  }

  return {
    videoPath,
    startTime: parseFloat(startTimeStr),
    endTime: parseFloat(endTimeStr),
    count,
  };
}

async function extractFrames(
  videoPath: string,
  startTime: number,
  endTime: number,
  outputDir: string,
  count?: number
): Promise<string[]> {
  const duration = endTime - startTime;

  // Calculate fps based on count or use default 1fps
  let fpsValue: string;
  if (count) {
    // Extract exactly N frames uniformly distributed
    const fps = count / duration;
    fpsValue = `fps=${fps}`;
  } else {
    fpsValue = 'fps=1';
  }

  await execa('ffmpeg', [
    '-ss', startTime.toString(),
    '-i', videoPath,
    '-t', duration.toString(),
    '-vf', fpsValue,
    path.join(outputDir, 'frame-%03d.png')
  ]);

  let files = await fs.readdir(outputDir);
  let framePaths = files
    .filter(f => f.startsWith('frame-'))
    .sort()
    .map(f => path.join(outputDir, f));

  // If count is specified, truncate to exactly that many frames
  if (count && framePaths.length > count) {
    // Remove extra frames
    for (let i = count; i < framePaths.length; i++) {
      await fs.unlink(framePaths[i]);
    }
    framePaths = framePaths.slice(0, count);
  }

  return framePaths;
}

async function convertToWebP(framePath: string, outputPath: string): Promise<void> {
  await sharp(framePath)
    .resize(1568, null, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 80 })
    .toFile(outputPath);
}

async function main() {
  try {
    const args = await parseArgs();
    
    // Create temp directory for frames
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-frames-'));
    
    try {
      // Extract frames
      const framePaths = await extractFrames(
        args.videoPath,
        args.startTime,
        args.endTime,
        tempDir,
        args.count
      );
      
      if (framePaths.length === 0) {
        console.error('No frames extracted. Check video path and time range.');
        process.exit(1);
      }

      // Convert to WebP and collect paths
      const webpPaths: string[] = [];
      const duration = args.endTime - args.startTime;

      for (let i = 0; i < framePaths.length; i++) {
        // Calculate timestamp based on uniform distribution when using --count
        const timestamp = args.count
          ? args.startTime + (i * duration) / (args.count - 1 || 1)
          : args.startTime + i;

        const webpPath = path.join(tempDir, `frame-${String(i + 1).padStart(3, '0')}.webp`);

        await convertToWebP(framePaths[i], webpPath);
        webpPaths.push(webpPath);

        // Clean up original PNG
        await fs.unlink(framePaths[i]);
      }

      // Output frame paths and metadata
      console.log('=== EXTRACTED FRAMES ===\n');
      console.log(`Extracted ${webpPaths.length} frames from ${args.startTime}s to ${args.endTime}s:\n`);

      for (let i = 0; i < webpPaths.length; i++) {
        const timestamp = args.count
          ? args.startTime + (i * duration) / (args.count - 1 || 1)
          : args.startTime + i;
        console.log(`Frame ${i + 1} (${timestamp.toFixed(1)}s): ${webpPaths[i]}`);
      }
      
      console.log('\n========================\n');
      
    } catch (error) {
      // Don't clean up temp dir on error so user can inspect
      throw error;
    }
    
  } catch (error) {
    console.error('Error extracting frames:', error);
    process.exit(1);
  }
}

main();

