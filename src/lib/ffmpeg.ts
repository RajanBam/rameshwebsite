// Shared, lazily-loaded ffmpeg.wasm singleton for the video/audio tools.
// The single-threaded core is self-hosted under /ffmpeg/ so processing works
// offline and without cross-origin isolation headers (which keeps the site
// compatible with ad networks). First load fetches ~31 MB once, then the
// browser caches it.
// The client is imported at runtime from the self-hosted copy (see
// scripts/copy-ffmpeg.mjs) rather than bundled: bundlers relocate its
// internal worker file, which breaks worker start-up in production builds.
export interface FFmpeg {
  load(cfg: { coreURL: string; wasmURL: string }): Promise<boolean>;
  exec(args: string[]): Promise<number>;
  writeFile(name: string, data: Uint8Array): Promise<boolean>;
  readFile(name: string): Promise<Uint8Array | string>;
  deleteFile(name: string): Promise<boolean>;
  on(ev: 'progress', cb: (e: { progress: number }) => void): void;
  off(ev: 'progress', cb: (e: { progress: number }) => void): void;
}

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export function getFFmpeg(onLoadProgress?: (msg: string) => void): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  if (loading) return loading;
  loading = (async () => {
    onLoadProgress?.('Loading engine…');
    const mod = await import(/* @vite-ignore */ '/ffmpeg/esm/index.js');
    const ff: FFmpeg = new mod.FFmpeg();
    await ff.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
    });
    instance = ff;
    return ff;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

/** Read media duration (seconds) from a file using a media element. */
export function mediaDuration(file: File, kind: 'video' | 'audio'): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    el.preload = 'metadata';
    const url = URL.createObjectURL(file);
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(el.duration || 0); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    el.src = url;
  });
}

/** Expected output size for bitrate-targeted encoding, in bytes. */
export function estimateSize(durationSec: number, videoKbps: number, audioKbps: number): number {
  return Math.round(((videoKbps + audioKbps) * 1000 * durationSec) / 8);
}
