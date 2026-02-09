#!/usr/bin/env ts-node

import { execa } from 'execa';

async function main() {
  const videoPath = process.argv[2];

  if (!videoPath) {
    console.error('Usage: get-duration.ts <video-path>');
    process.exit(1);
  }

  try {
    const { stdout } = await execa('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath
    ]);

    const duration = parseFloat(stdout);
    console.log(duration.toFixed(1));
  } catch (error: any) {
    console.error('Error getting video duration:', error.message);
    process.exit(1);
  }
}

main();
