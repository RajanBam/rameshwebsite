// Copies the self-hosted ffmpeg.wasm runtime into public/.
// The ESM client is served as-is (not bundled) because bundlers break its
// internal worker loading; the single-threaded core needs no COOP/COEP
// headers, which keeps the site compatible with ad networks.
import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('public/ffmpeg/esm', { recursive: true });
cpSync('node_modules/@ffmpeg/ffmpeg/dist/esm', 'public/ffmpeg/esm', { recursive: true });
cpSync('node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', 'public/ffmpeg/ffmpeg-core.js');
cpSync('node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm', 'public/ffmpeg/ffmpeg-core.wasm');
console.log('ffmpeg runtime copied to public/ffmpeg/');
