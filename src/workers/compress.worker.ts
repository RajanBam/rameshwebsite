/// <reference lib="webworker" />
// Image compression worker. Decodes, optionally downscales, and re-encodes
// an image entirely off the main thread.
// Encoding uses the same WASM codecs the leading image sites use
// (MozJPEG, libwebp, OxiPNG via jSquash), which produce meaningfully
// smaller files than the browser's built-in canvas encoder at the same
// visual quality. Canvas encoding remains as a fallback.
// Protocol matches WorkerPool: receive { id, payload }, reply { id, result } or { id, error }.

import { encode as encodeJpeg } from '@jsquash/jpeg';
import { encode as encodeWebp } from '@jsquash/webp';
import { optimise as optimisePng } from '@jsquash/oxipng';

interface CompressPayload {
  file: File;
  format: 'image/jpeg' | 'image/webp' | 'image/png';
  quality: number; // 0..1
  maxDimension?: number; // optional longest-edge cap
}

interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, payload } = e.data as { id: number; payload: CompressPayload };
  try {
    const result = await compress(payload);
    // Blob is cloneable; no explicit transfer needed.
    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: err instanceof Error ? err.message : 'Compression failed',
    });
  }
};

async function compress(p: CompressPayload): Promise<CompressResult> {
  const bitmap = await createImageBitmap(p.file);
  let { width, height } = bitmap;

  if (p.maxDimension && Math.max(width, height) > p.maxDimension) {
    const scale = p.maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available in this browser');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  try {
    const blob = await encodeWithCodecs(canvas, ctx, p);
    return { blob, width, height };
  } catch {
    // Codec failed to load or encode: fall back to the browser encoder.
    const blob = await canvas.convertToBlob({
      type: p.format,
      quality: p.format === 'image/png' ? undefined : p.quality,
    });
    return { blob, width, height };
  }
}

async function encodeWithCodecs(
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
  p: CompressPayload,
): Promise<Blob> {
  if (p.format === 'image/png') {
    // OxiPNG optimizes an already-encoded PNG losslessly.
    const raw = await canvas.convertToBlob({ type: 'image/png' });
    const optimized = await optimisePng(await raw.arrayBuffer(), { level: 2 });
    return new Blob([optimized], { type: 'image/png' });
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const q = Math.round(p.quality * 100);
  const buf = p.format === 'image/jpeg'
    ? await encodeJpeg(imageData, { quality: q })
    : await encodeWebp(imageData, { quality: q });
  return new Blob([buf], { type: p.format });
}
