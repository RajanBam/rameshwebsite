import { useState, useRef } from 'preact/hooks';
import { zip } from 'fflate';
import { downloadBlob, formatBytes } from '../../lib/format';
import ProgressRing from '../ui/ProgressRing';

/** Image resizer — resize by width/percentage, keep aspect ratio. Batch,
 *  sequential, with the green progress ring. Fully in-browser. */
interface Done { name: string; blob: Blob; w: number; h: number; }

async function resizeOne(file: File, targetW: number): Promise<Done> {
  const bitmap = await createImageBitmap(file);
  const scale = targetW / bitmap.width;
  const w = targetW, h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), type, 0.92));
  return { name: file.name.replace(/\.[^.]+$/, '') + (type === 'image/png' ? '.png' : '.jpg'), blob, w, h };
}

export default function ImageResize() {
  const [files, setFiles] = useState<File[]>([]);
  const [width, setWidth] = useState(1280);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [results, setResults] = useState<Done[]>([]);
  const cancel = useRef(false);

  const add = (list: FileList | File[]) => {
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (imgs.length) { setFiles((p) => [...p, ...imgs]); setResults([]); }
  };

  const run = async () => {
    if (!files.length) return;
    cancel.current = false;
    setResults([]);
    setProgress(0);
    const out: Done[] = [];
    for (let i = 0; i < files.length; i++) {
      if (cancel.current) break;
      out.push(await resizeOne(files[i], width));
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setResults(out);
    setTimeout(() => setProgress(-1), 900);
  };

  const downloadAll = async () => {
    if (results.length === 1) return downloadBlob(results[0].blob, results[0].name);
    const bag: Record<string, Uint8Array> = {};
    for (const r of results) bag[r.name] = new Uint8Array(await r.blob.arrayBuffer());
    zip(bag, (err, data) => { if (!err) downloadBlob(new Blob([data], { type: 'application/zip' }), 'resized-images.zip'); });
  };

  const busy = progress >= 0 && progress < 100;

  return (
    <div class="tool-card">
      {busy ? (
        <ProgressRing value={progress} sublabel={`${Math.round((progress / 100) * files.length)} of ${files.length} images`} />
      ) : (
        <>
          <div class={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
            onClick={() => document.getElementById('rz-in')?.click()}>
            <div class="dz-title">Drop images here</div>
            <div class="dz-hint">or click to choose · nothing uploaded</div>
            <input id="rz-in" type="file" accept="image/*" multiple style="display:none"
              onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
          </div>

          <div class="field" style="margin-top:1.25rem">
            <label class="field-label" for="rw">Target width · {width}px</label>
            <input id="rw" type="range" min="100" max="4000" step="20" value={width} style="width:100%"
              onInput={(e) => setWidth(Number((e.target as HTMLInputElement).value))} />
          </div>

          {files.length > 0 && (
            <div class="btn-row">
              <button class="btn btn-primary" onClick={run}>Resize {files.length} image{files.length > 1 ? 's' : ''}</button>
              <button class="btn btn-ghost" onClick={() => { setFiles([]); setResults([]); }}>Clear</button>
            </div>
          )}

          {results.length > 0 && (
            <>
              <p class="ring-label is-done" style="margin-top:1.25rem">Done · {results.length} resized</p>
              <div class="btn-row">
                <button class="btn btn-primary" onClick={downloadAll}>
                  {results.length > 1 ? 'Download all (zip)' : 'Download'}
                </button>
              </div>
              <ul class="file-list">
                {results.map((r, k) => (
                  <li class="file-row" key={k}>
                    <span class="fr-name">{r.name}</span>
                    <span class="fr-meta">{r.w}×{r.h} · {formatBytes(r.blob.size)}</span>
                    <button class="fr-remove" title="Download" onClick={() => downloadBlob(r.blob, r.name)}>↓</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
