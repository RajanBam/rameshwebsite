import { useRef, useReducer, useEffect, useState, useMemo } from 'preact/hooks';
import { zip } from 'fflate';
import { WorkerPool } from '../../lib/worker-pool';
import { BatchQueue, type QueueItem } from '../../lib/batch-queue';
import { defaultPoolSize } from '../../lib/worker-pool';
import { formatBytes, downloadBlob } from '../../lib/format';

interface CompressResult { blob: Blob; width: number; height: number; }
type Fmt = 'image/jpeg' | 'image/webp' | 'image/png';

const EXT: Record<Fmt, string> = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/png': 'png',
};

/** Compress Image — batch, unlimited, off-main-thread via a worker pool. */
export default function ImageCompress() {
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const [format, setFormat] = useState<Fmt>('image/jpeg');
  const [quality, setQuality] = useState(0.72);
  const [drag, setDrag] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Pool + queue live for the lifetime of the island.
  const poolRef = useRef<WorkerPool<any, CompressResult> | null>(null);
  const queueRef = useRef<BatchQueue<CompressResult> | null>(null);

  if (!poolRef.current) {
    poolRef.current = new WorkerPool<any, CompressResult>(
      () => new Worker(new URL('../../workers/compress.worker.ts', import.meta.url), { type: 'module' }),
      defaultPoolSize(),
    );
  }
  if (!queueRef.current) {
    queueRef.current = new BatchQueue<CompressResult>(
      (item) => poolRef.current!.run({ file: item.file, format, quality, maxDimension: 4096 }),
      defaultPoolSize(),
    );
  }

  // Re-render on any queue change.
  useEffect(() => {
    const unsub = queueRef.current!.subscribe(forceRender);
    return () => { unsub(); poolRef.current?.terminate(); };
  }, []);

  const queue = queueRef.current!;
  const items = queue.getItems();
  const stats = queue.stats;

  const addFiles = (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length) queue.add(imgs);
  };

  const run = () => {
    // Rebuild the processor so current format/quality are captured.
    (queue as any).processor = (item: QueueItem<CompressResult>) =>
      poolRef.current!.run({ file: item.file, format, quality, maxDimension: 4096 });
    queue.run();
  };

  const nameFor = (item: QueueItem<CompressResult>) =>
    item.file.name.replace(/\.[^.]+$/, '') + '.' + EXT[format];

  const downloadOne = (item: QueueItem<CompressResult>) => {
    if (item.result) downloadBlob(item.result.blob, nameFor(item));
  };

  const downloadAll = async () => {
    const done = items.filter((it) => it.status === 'done' && it.result);
    if (done.length === 0) return;
    setZipping(true);
    const files: Record<string, Uint8Array> = {};
    for (const it of done) {
      const buf = new Uint8Array(await it.result!.blob.arrayBuffer());
      files[nameFor(it)] = buf;
    }
    zip(files, (err, data) => {
      setZipping(false);
      if (!err) downloadBlob(new Blob([data], { type: 'application/zip' }), 'compressed-images.zip');
    });
  };

  const totals = useMemo(() => {
    let before = 0, after = 0;
    for (const it of items) {
      if (it.status === 'done' && it.result) { before += it.file.size; after += it.result.blob.size; }
    }
    return { before, after, saved: before > 0 ? Math.round((1 - after / before) * 100) : 0 };
  }, [items, stats.done]);

  const progress = stats.total ? Math.round(((stats.done + stats.error) / stats.total) * 100) : 0;

  return (
    <div class="tool-card">
      <div
        class={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer?.files ?? []); }}
        onClick={() => document.getElementById('img-input')?.click()}
      >
        <div class="dz-title">Drop images here</div>
        <div class="dz-hint">or click to choose · one or five hundred · nothing uploaded</div>
        <input id="img-input" type="file" accept="image/*" multiple style="display:none"
          onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) addFiles(t.files); t.value = ''; }} />
      </div>

      <div class="stat-row" style="gap:1.25rem;align-items:flex-end">
        <div class="field" style="margin:0">
          <label class="field-label" for="fmt">Output</label>
          <select id="fmt" class="select-input" value={format} onChange={(e) => setFormat((e.target as HTMLSelectElement).value as Fmt)}>
            <option value="image/jpeg">JPG</option>
            <option value="image/webp">WebP</option>
            <option value="image/png">PNG (lossless)</option>
          </select>
        </div>
        {format !== 'image/png' && (
          <div class="field" style="margin:0;flex:1;min-width:180px">
            <label class="field-label" for="q">Quality · {Math.round(quality * 100)}%</label>
            <input id="q" type="range" min="0.1" max="1" step="0.02" value={quality} style="width:100%"
              onInput={(e) => setQuality(Number((e.target as HTMLInputElement).value))} />
          </div>
        )}
      </div>

      {items.length > 0 && (
        <>
          <div class="btn-row">
            <button class="btn btn-primary" onClick={run} disabled={queue.isRunning || stats.pending === 0}>
              {queue.isRunning ? `Compressing… ${progress}%` : `Compress ${stats.pending || items.length}`}
            </button>
            <button class="btn btn-ghost" onClick={downloadAll} disabled={stats.done === 0 || zipping}>
              {zipping ? 'Zipping…' : `Download all (${stats.done})`}
            </button>
            <button class="btn btn-ghost" onClick={() => queue.clear()} disabled={queue.isRunning}>Clear</button>
          </div>

          {queue.isRunning && <div class="progress"><i style={`width:${progress}%`} /></div>}

          {stats.done > 0 && (
            <div class="stat-row">
              <div class="stat"><div class="stat-val">{formatBytes(totals.before)}</div><div class="stat-label">before</div></div>
              <div class="stat"><div class="stat-val">{formatBytes(totals.after)}</div><div class="stat-label">after</div></div>
              <div class="stat">
                <div class="stat-val" style={totals.saved >= 0 ? 'color:var(--green)' : 'color:var(--dim)'}>
                  {totals.saved >= 0 ? `−${totals.saved}%` : `+${-totals.saved}%`}
                </div>
                <div class="stat-label">{totals.saved >= 0 ? 'saved' : 'larger'}</div>
              </div>
            </div>
          )}

          <ul class="file-list">
            {items.map((it) => (
              <li class="file-row" key={it.id}>
                <span class="fr-name">{it.file.name}</span>
                {it.status === 'done' && it.result && (
                  <span class="fr-meta">{formatBytes(it.file.size)} → {formatBytes(it.result.blob.size)}</span>
                )}
                {it.status === 'pending' && <span class="pill">queued</span>}
                {it.status === 'processing' && <span class="pill pill-processing">…</span>}
                {it.status === 'error' && <span class="pill pill-error" title={it.error}>error</span>}
                {it.status === 'done' && (
                  <button class="fr-remove" title="Download" onClick={() => downloadOne(it)}>↓</button>
                )}
                <button class="fr-remove" title="Remove" onClick={() => queue.remove(it.id)}>✕</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
