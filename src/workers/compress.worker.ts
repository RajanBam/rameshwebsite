/// <reference lib="webworker" />
// Image compression worker. Decodes, optionally downscales, and re-encodes
// an image entirely off the main thread using OffscreenCanvas.
// Protocol matches WorkerPool: receive { id, payload }, reply { id, result } or { id, error }.

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

  const blob = await canvas.convertToBlob({
    type: p.format,
    quality: p.format === 'image/png' ? undefined : p.quality,
  });
  return { blob, width, height };
}
