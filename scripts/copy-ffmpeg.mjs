// Copies the self-hosted ffmpeg.wasm runtime into public/.
// The ESM client is served as-is (not bundled) because bundlers break its
// internal worker loading; the single-threaded core needs no COOP/COEP
// headers, which keeps the site compatible with ad networks.
// Runs on postinstall, predev and prebuild so public/ffmpeg/ always exists.
import { cpSync, mkdirSync, existsSync } from 'node:fs';

const src = {
  esm: 'node_modules/@ffmpeg/ffmpeg/dist/esm',
  coreJs: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js',
  coreWasm: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm',
};

if (!existsSync(src.esm) || !existsSync(src.coreWasm)) {
  console.warn('ffmpeg packages not installed yet; skipping runtime copy.');
  process.exit(0);
}

mkdirSync('public/ffmpeg/esm', { recursive: true });
cpSync(src.esm, 'public/ffmpeg/esm', { recursive: true });
cpSync(src.coreJs, 'public/ffmpeg/ffmpeg-core.js');
cpSync(src.coreWasm, 'public/ffmpeg/ffmpeg-core.wasm');
console.log('ffmpeg runtime copied to public/ffmpeg/');

// Ghostscript runtime for the PDF compressor (gs-worker.js is authored, not copied).
const gs = 'node_modules/@jspawn/ghostscript-wasm';
if (existsSync(gs + '/gs.wasm')) {
  mkdirSync('public/gs', { recursive: true });
  for (const f of ['gs.mjs', 'gs.js', 'browser.js', 'gs.wasm', 'LICENSE']) {
    cpSync(`${gs}/${f}`, `public/gs/${f}`);
  }
  console.log('ghostscript runtime copied to public/gs/');
}
