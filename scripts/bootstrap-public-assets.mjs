import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

const BREAK_TYPES = ['breathing', 'posture', 'eye', 'hydration', 'stretch'];
const MOODS = ['neutral', 'happy', 'tired'];

const PNG_16 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVR42mNk+M9Qz0AEYBxVSFUBqBpUDapG1aBqUDUAAAD//wMAHf8Nh3EAAAAASUVORK5CYII=',
  'base64',
);

const PNG_48 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAOklEQVR42u3OMQEAAAjDMMC/52ECvhBI0q1bt27du3bt2rVr165du3bt2rVr1/4BDKgAAfijJAAAAABJRU5ErkJggg==',
  'base64',
);

const PNG_128 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAPklEQVR42u3OMQEAAAjDMMC/52ECvhBI0q1bt27du3bt2rVr165du3bt2rVr1/4BDKgAAfijJAAAAABJRU5ErkJggg==',
  'base64',
);

const PLACEHOLDER_WEBM = Buffer.from(
  'GkXfowEAAAAAAAAfQoaBAUL3gQFC8oEEQvOBCEKFiAECQvOBAELzgaDjBwAA6h+o/wEAAAAAAAD+AAACcNGCgAAAAA==',
  'base64',
);

const PLACEHOLDER_MP3 = Buffer.from(
  '//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAAA8TGF2YzU4LjEyAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/yg4CAAAAAAD/+1DEAAAHAAGf/qBEYAAADSAAAAAAAAAAAA',
  'base64',
);

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeIfMissing(filePath, data) {
  if (existsSync(filePath)) {
    try {
      if (statSync(filePath).size > 64) return;
    } catch {
      return;
    }
  }
  ensureDir(dirname(filePath));
  writeFileSync(filePath, data);
}

export function bootstrapPublicAssets() {
  ensureDir(publicDir);
  ensureDir(join(publicDir, 'clips', 'audio'));

  writeIfMissing(join(publicDir, 'icon-16.png'), PNG_16);
  writeIfMissing(join(publicDir, 'icon-48.png'), PNG_48);
  writeIfMissing(join(publicDir, 'icon-128.png'), PNG_128);

  for (const breakType of BREAK_TYPES) {
    for (const mood of MOODS) {
      writeIfMissing(
        join(publicDir, 'clips', `${breakType}-${mood}.webm`),
        PLACEHOLDER_WEBM,
      );
    }
    writeIfMissing(join(publicDir, 'clips', 'audio', `${breakType}.mp3`), PLACEHOLDER_MP3);
  }
}

bootstrapPublicAssets();
