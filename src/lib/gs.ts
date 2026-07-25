// Ghostscript (WASM) helper for PDF compression. The engine and worker are
// self-hosted under /gs/ and run entirely in the browser. Each run uses a
// fresh worker so memory is fully reclaimed afterwards.

export type GsSetting = '/screen' | '/ebook' | '/printer';

export function runGhostscript(
  data: ArrayBuffer,
  setting: GsSetting,
  onPage?: (page: number) => void,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/gs/gs-worker.js', { type: 'module' });
    const fail = (message: string) => { worker.terminate(); reject(new Error(message)); };
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'page') onPage?.(msg.page);
      else if (msg.type === 'done') { worker.terminate(); resolve(msg.out as Uint8Array); }
      else if (msg.type === 'error') fail(msg.message || 'Compression failed.');
    };
    worker.onerror = () => fail('The compression engine failed to load.');
    // Copy the buffer: the caller reuses it for multiple runs.
    const copy = data.slice(0);
    worker.postMessage({ data: copy, setting }, [copy]);
  });
}
