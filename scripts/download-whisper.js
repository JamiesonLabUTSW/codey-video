#!/usr/bin/env node

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = join(__dirname, '..', 'resources', 'models');

const MODELS = {
  'tiny.en': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    file: 'tiny.en.bin',
    size: '75 MB',
    description: 'Tiny English-only model (fastest, lowest accuracy)'
  },
  'tiny': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    file: 'tiny.bin',
    size: '75 MB',
    description: 'Tiny multilingual model'
  },
  'base.en': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    file: 'base.en.bin',
    size: '142 MB',
    description: 'Base English-only model (recommended for most use cases)'
  },
  'base': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    file: 'base.bin',
    size: '142 MB',
    description: 'Base multilingual model'
  },
  'small.en': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
    file: 'small.en.bin',
    size: '466 MB',
    description: 'Small English-only model (better accuracy, slower)'
  },
  'small': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    file: 'small.bin',
    size: '466 MB',
    description: 'Small multilingual model'
  }
};

async function downloadModel(modelName) {
  const model = MODELS[modelName];
  if (!model) {
    console.error(`Unknown model: ${modelName}`);
    console.log('\nAvailable models:');
    for (const [name, info] of Object.entries(MODELS)) {
      console.log(`  ${name.padEnd(10)} - ${info.description} (${info.size})`);
    }
    process.exit(1);
  }

  await fs.mkdir(MODELS_DIR, { recursive: true });

  const outputPath = join(MODELS_DIR, model.file);

  // Check if model already exists
  try {
    await fs.access(outputPath);
    console.log(`Model ${modelName} already exists at: ${outputPath}`);
    const answer = await question('Overwrite? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Download cancelled.');
      process.exit(0);
    }
  } catch {
    // File doesn't exist, proceed with download
  }

  console.log(`Downloading ${modelName} model (${model.size})...`);
  console.log(`URL: ${model.url}`);
  console.log(`Destination: ${outputPath}\n`);

  try {
    const response = await fetch(model.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
    let downloadedSize = 0;
    let lastPercent = 0;

    const fileStream = createWriteStream(outputPath);

    // Create a transform stream to track progress
    const progressStream = new Transform({
      transform(chunk, _encoding, callback) {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);

        if (percent !== lastPercent) {
          process.stdout.write(`\rProgress: ${percent}% (${Math.floor(downloadedSize / 1024 / 1024)}MB / ${Math.floor(totalSize / 1024 / 1024)}MB)`);
          lastPercent = percent;
        }

        callback(null, chunk);
      }
    });

    await pipeline(
      response.body,
      progressStream,
      fileStream
    );

    console.log('\n\nDownload complete!');
    console.log(`Model saved to: ${outputPath}`);
  } catch (error) {
    console.error('\nDownload failed:', error.message);
    // Clean up partial download
    try {
      await fs.unlink(outputPath);
    } catch {}
    process.exit(1);
  }
}

async function question(query) {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const modelName = process.argv[2];

  if (!modelName) {
    console.log('Whisper Model Downloader');
    console.log('========================\n');
    console.log('Available models:');
    for (const [name, info] of Object.entries(MODELS)) {
      console.log(`  ${name.padEnd(10)} - ${info.description} (${info.size})`);
    }
    console.log('\nUsage: npm run download-whisper <model-name>');
    console.log('Example: npm run download-whisper base.en');
    process.exit(0);
  }

  await downloadModel(modelName);
}

// Import Transform at the top level
import { Transform } from 'stream';

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
