import { useRef, useReducer, useEffect, useState } from 'preact/hooks';
import { zip } from 'fflate';
import { WorkerPool, defaultPoolSize } from '../../lib/worker-pool';
import { BatchQueue, type QueueItem } from '../../lib/batch-queue';
import { formatBytes, downloadBlob } from '../../lib/format';

interface ConvResult { blob: Blob; width: number; height: number; }
type Fmt = 'image/jpeg' | 'image/webp' | 'image/png';
const EXT: Record<Fmt, string> = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' };
const LABEL: Record<Fmt, string> = { 'image/jpeg': 'JPG', 'image/webp': 'WebP', 'image/png': 'PNG' };

/** Convert Image — batch format conversion (PNG/JPG/WebP) via the worker pool. */
export default function ImageConvert() {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [format, setFormat] = useState<Fmt>('image/webp');
  const [quality, setQuality] = useState(0.85);
  const [drag, setDrag] = useState(false);
  const [zipping, setZipping] = useState(false);

  const poolRef = useRef<WorkerPool<any, ConvResult> | null>(null);
  const queueRef = useRef<BatchQueue<ConvResult> | null>(null);

  if (!poolRef.current) {
    poolRef.current = new WorkerPool<any, ConvResult>(
      () => new Worker(new URL('../../workers/compress.worker.ts', import.meta.url), { type: 'module' }),
      defaultPoolSize(),
    );
  }
  if (!queueRef.current) {
    queueRef.current = new BatchQueue<ConvResult>(
      (item) => poolRef.current!.run({ file: item.file, format, quality, maxDimension: 8192 }),
      defaultPoolSize(),
    );
  }

  useEffect(() => {
    const unsub = queueRef.current!.subscribe(rerender);
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
    (queue as any).processor = (item: QueueItem<ConvResult>) =>
      poolRef.current!.run({ file: item.file, format, quality, maxDimension: 8192 });
    queue.run();
  };

  const nameFor = (it: QueueItem<ConvResult>) => it.file.name.replace(/\.[^.]+$/, '') + '.' + EXT[format];
  const downloadOne = (it: QueueItem<ConvResult>) => { if (it.result) downloadBlob(it.result.blob, nameFor(it)); };

  const downloadAll = async () => {
    const done = items.filter((it) => it.status === 'done' && it.result);
    if (!done.length) return;
    setZipping(true);
    const files: Record<string, Uint8Array> = {};
    for (const it of done) files[nameFor(it)] = new Uint8Array(await it.result!.blob.arrayBuffer());
    zip(files, (err, data) => { setZipping(false); if (!err) downloadBlob(new Blob([data], { type: 'application/zip' }), `converted-${EXT[format]}.zip`); });
  };

  const progress = stats.total ? Math.round(((stats.done + stats.error) / stats.total) * 100) : 0;

  return (
    <div class="tool-card">
      <div class={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer?.files ?? []); }}
        onClick={() => document.getElementById('conv-input')?.click()}>
        <div class="dz-title">Drop images here</div>
        <div class="dz-hint">or click to choose · unlimited files · nothing uploaded</div>
        <input id="conv-input" type="file" accept="image/*" multiple style="display:none"
          onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) addFiles(t.files); t.value = ''; }} />
      </div>

      <div class="field" style="margin-top:1.25rem">
        <label class="field-label">Convert to</label>
        <div class="fmt-pills">
          {(['image/jpeg', 'image/webp', 'image/png'] as Fmt[]).map((f) => (
            <button class={`fmt-pill ${format === f ? 'on' : ''}`} onClick={() => setFormat(f)}>{LABEL[f]}</button>
          ))}
        </div>
      </div>
      {format !== 'image/png' && (
        <div class="field">
          <label class="field-label">Quality · {Math.round(quality * 100)}%</label>
          <input type="range" min="0.3" max="1" step="0.02" value={quality} style="width:100%;max-width:280px"
            onInput={(e) => setQuality(Number((e.target as HTMLInputElement).value))} />
        </div>
      )}

      {items.length > 0 && (
        <>
          <div class="btn-row">
            <button class="btn btn-primary" onClick={run} disabled={queue.isRunning || stats.pending === 0}>
              {queue.isRunning ? `Converting… ${progress}%` : `Convert ${stats.pending || items.length} to ${LABEL[format]}`}
            </button>
            <button class="btn btn-ghost" onClick={downloadAll} disabled={stats.done === 0 || zipping}>
              {zipping ? 'Zipping…' : `Download all (${stats.done})`}
            </button>
            <button class="btn btn-ghost" onClick={() => queue.clear()} disabled={queue.isRunning}>Clear</button>
          </div>
          {queue.isRunning && <div class="progress"><i style={`width:${progress}%`} /></div>}
          <ul class="file-list">
            {items.map((it) => (
              <li class="file-row" key={it.id}>
                <span class="fr-name">{it.file.name}</span>
                {it.status === 'done' && it.result && <span class="fr-meta">{formatBytes(it.result.blob.size)}</span>}
                {it.status === 'pending' && <span class="pill">queued</span>}
                {it.status === 'processing' && <span class="pill pill-processing">…</span>}
                {it.status === 'error' && <span class="pill pill-error" title={it.error}>error</span>}
                {it.status === 'done' && <button class="fr-remove" title="Download" onClick={() => downloadOne(it)}>↓</button>}
                <button class="fr-remove" title="Remove" onClick={() => queue.remove(it.id)}>✕</button>
              </li>
            ))}
          </ul>
        </>
      )}
      <style>{`
        .fmt-pills { display: flex; gap: 0.5rem; }
        .fmt-pill { border: 1px solid var(--hairline); background: #fff; color: var(--dim); border-radius: 999px; padding: 0.4rem 1.1rem; font-size: var(--t-small); font-weight: 500; }
        .fmt-pill.on { background: var(--blue); color: #fff; border-color: var(--blue); }
      `}</style>
    </div>
  );
}
