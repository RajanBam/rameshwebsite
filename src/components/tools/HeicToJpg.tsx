import { useRef, useReducer, useEffect, useState } from 'preact/hooks';
import { zip } from 'fflate';
import { BatchQueue, type QueueItem } from '../../lib/batch-queue';
import { formatBytes, downloadBlob } from '../../lib/format';

type Fmt = 'image/jpeg' | 'image/png';
const EXT: Record<Fmt, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' };

/** HEIC to JPG/PNG — converts iPhone photos in the browser via libheif (wasm). */
export default function HeicToJpg() {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [format, setFormat] = useState<Fmt>('image/jpeg');
  const [quality, setQuality] = useState(0.9);
  const [drag, setDrag] = useState(false);
  const [zipping, setZipping] = useState(false);

  const queueRef = useRef<BatchQueue<Blob> | null>(null);
  if (!queueRef.current) {
    // heic2any is main-thread + heavy; keep concurrency low. Lazy-imported so
    // the ~1MB wasm decoder only loads when this tool is actually used.
    queueRef.current = new BatchQueue<Blob>(async (item) => {
      const heic2any = (await import('heic2any')).default;
      const out = await heic2any({ blob: item.file, toType: format, quality });
      return Array.isArray(out) ? out[0] : out;
    }, 2);
  }

  useEffect(() => queueRef.current!.subscribe(rerender), []);
  const queue = queueRef.current!;
  const items = queue.getItems();
  const stats = queue.stats;

  const addFiles = (files: FileList | File[]) => {
    const heics = Array.from(files).filter(
      (f) => /image\/hei[cf]/.test(f.type) || /\.hei[cf]$/i.test(f.name),
    );
    if (heics.length) queue.add(heics);
  };

  const run = () => {
    (queue as any).processor = async (item: QueueItem<Blob>) => {
      const heic2any = (await import('heic2any')).default;
      const out = await heic2any({ blob: item.file, toType: format, quality });
      return Array.isArray(out) ? out[0] : out;
    };
    queue.run();
  };

  const nameFor = (it: QueueItem<Blob>) => it.file.name.replace(/\.[^.]+$/, '') + '.' + EXT[format];
  const downloadOne = (it: QueueItem<Blob>) => { if (it.result) downloadBlob(it.result, nameFor(it)); };
  const downloadAll = async () => {
    const done = items.filter((it) => it.status === 'done' && it.result);
    if (!done.length) return;
    setZipping(true);
    const files: Record<string, Uint8Array> = {};
    for (const it of done) files[nameFor(it)] = new Uint8Array(await it.result!.arrayBuffer());
    zip(files, (err, data) => { setZipping(false); if (!err) downloadBlob(new Blob([data], { type: 'application/zip' }), `heic-converted.zip`); });
  };

  const progress = stats.total ? Math.round(((stats.done + stats.error) / stats.total) * 100) : 0;

  return (
    <div class="tool-card">
      <div class={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer?.files ?? []); }}
        onClick={() => document.getElementById('heic-input')?.click()}>
        <div class="dz-title">Drop HEIC photos here</div>
        <div class="dz-hint">or click to choose · unlimited files · nothing uploaded</div>
        <input id="heic-input" type="file" accept=".heic,.heif,image/heic,image/heif" multiple style="display:none"
          onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) addFiles(t.files); t.value = ''; }} />
      </div>

      <div class="stat-row" style="gap:1.25rem;align-items:flex-end;margin-top:1.25rem">
        <div class="field" style="margin:0">
          <label class="field-label">Output</label>
          <select class="select-input" value={format} onChange={(e) => setFormat((e.target as HTMLSelectElement).value as Fmt)}>
            <option value="image/jpeg">JPG</option>
            <option value="image/png">PNG</option>
          </select>
        </div>
        {format === 'image/jpeg' && (
          <div class="field" style="margin:0;flex:1;min-width:180px">
            <label class="field-label">Quality · {Math.round(quality * 100)}%</label>
            <input type="range" min="0.4" max="1" step="0.02" value={quality} style="width:100%"
              onInput={(e) => setQuality(Number((e.target as HTMLInputElement).value))} />
          </div>
        )}
      </div>

      {items.length > 0 && (
        <>
          <div class="btn-row">
            <button class="btn btn-primary" onClick={run} disabled={queue.isRunning || stats.pending === 0}>
              {queue.isRunning ? `Converting… ${progress}%` : `Convert ${stats.pending || items.length}`}
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
                {it.status === 'done' && it.result && <span class="fr-meta">{formatBytes(it.result.size)}</span>}
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
    </div>
  );
}
