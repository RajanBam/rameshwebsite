import { useState, useRef } from 'preact/hooks';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob, formatBytes } from '../../lib/format';
import ProgressRing from '../ui/ProgressRing';

/** PDF Compress. Re-renders each page at a chosen resolution and JPEG
 *  quality, then rebuilds a smaller PDF. As soon as a file is dropped, a few
 *  sample pages are rendered at every level so the expected output size is
 *  shown on each option BEFORE compressing. Runs entirely in the browser. */
/** Text legibility depends on render resolution far more than JPEG quality,
 *  so every level keeps the scale at or above 1.3 (about 120 DPI) and the
 *  size reduction comes from the JPEG quality instead. */
const LEVELS = {
  extreme: { label: 'Extreme', hint: 'smallest file', scale: 1.3, quality: 0.3 },
  strong: { label: 'Strong', hint: 'small, readable', scale: 1.5, quality: 0.5 },
  balanced: { label: 'Balanced', hint: 'good quality', scale: 1.8, quality: 0.65 },
  light: { label: 'Light', hint: 'near original', scale: 2.2, quality: 0.8 },
} as const;
type Level = keyof typeof LEVELS;
const LEVEL_KEYS = Object.keys(LEVELS) as Level[];

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  return pdfjs;
}

async function renderPageJpeg(page: any, scale: number, quality: number): Promise<Blob> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality));
}

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>('strong');
  const [drag, setDrag] = useState(false);
  const [pages, setPages] = useState(0);
  const [estimates, setEstimates] = useState<Partial<Record<Level, number>> | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; before: number } | null>(null);
  const docRef = useRef<any>(null);
  const bufRef = useRef<ArrayBuffer | null>(null);

  const add = async (list: FileList | File[]) => {
    const pdf = Array.from(list).find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (!pdf) return;
    setFile(pdf); setResult(null); setError(''); setEstimates(null); setPages(0);
    setEstimating(true);
    try {
      const pdfjs = await loadPdfjs();
      bufRef.current = await pdf.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(bufRef.current.slice(0)) }).promise;
      docRef.current = doc;
      setPages(doc.numPages);

      // Sample up to 3 spread-out pages and project each level's total size.
      const n = doc.numPages;
      const sampleIdx = [...new Set([1, Math.max(1, Math.ceil(n / 2)), n])].slice(0, 3);
      const samples = await Promise.all(sampleIdx.map((i) => doc.getPage(i)));
      const est: Partial<Record<Level, number>> = {};
      for (const key of LEVEL_KEYS) {
        const { scale, quality } = LEVELS[key];
        let bytes = 0;
        for (const page of samples) bytes += (await renderPageJpeg(page, scale, quality)).size;
        // avg page size × pages, plus a little per-page PDF structure overhead
        est[key] = Math.round((bytes / samples.length) * n + n * 800 + 4000);
        setEstimates({ ...est });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this PDF.');
    } finally {
      setEstimating(false);
    }
  };

  const run = async () => {
    if (!file || !docRef.current) return;
    setError(''); setResult(null); setProgress(0);
    try {
      const { scale, quality } = LEVELS[level];
      const src = docRef.current;
      const out = await PDFDocument.create();
      for (let i = 1; i <= src.numPages; i++) {
        const page = await src.getPage(i);
        const jpg = await renderPageJpeg(page, scale, quality);
        const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const dims = page.getViewport({ scale: 1 });
        const p = out.addPage([dims.width, dims.height]);
        p.drawImage(img, { x: 0, y: 0, width: dims.width, height: dims.height });
        setProgress(Math.round((i / src.numPages) * 100));
      }
      const bytes = await out.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      // Never ship a "compressed" file that is larger than the original.
      if (blob.size >= file.size) {
        setError('This PDF is already smaller than a re-render at this level. Try Extreme, or keep the original.');
      }
      setResult({ blob, before: file.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compress this PDF.');
    } finally {
      setTimeout(() => setProgress(-1), 900);
    }
  };

  const clear = () => {
    setFile(null); setResult(null); setEstimates(null); setPages(0); setError('');
    docRef.current = null; bufRef.current = null;
  };

  const busy = progress >= 0 && progress < 100;
  const saved = result ? Math.round((1 - result.blob.size / result.before) * 100) : 0;
  const pct = (est: number) => (file ? Math.round((1 - est / file.size) * 100) : 0);

  return (
    <div class="tool-card">
      {busy ? (
        <ProgressRing value={progress} sublabel={`Rebuilding ${pages} pages`} />
      ) : (
        <>
          <div class={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
            onClick={() => document.getElementById('pc-in')?.click()}>
            <div class="dz-title">{file ? file.name : 'Drop a PDF here'}</div>
            <div class="dz-hint">
              {file ? `${formatBytes(file.size)}${pages ? ` · ${pages} pages` : ''}` : 'or click to choose'} · nothing uploaded
            </div>
            <input id="pc-in" type="file" accept="application/pdf,.pdf" style="display:none"
              onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
          </div>

          {file && (
            <div class="field" style="margin-top:1.25rem">
              <label class="field-label">
                Compression level {estimating && <span style="color:var(--dim);font-weight:400">· estimating sizes…</span>}
              </label>
              <div class="level-grid">
                {LEVEL_KEYS.map((k) => {
                  const est = estimates?.[k];
                  const smaller = est != null && file != null && est < file.size;
                  return (
                    <button key={k} class={`level ${level === k ? 'on' : ''}`} onClick={() => setLevel(k)}>
                      <span class="lv-name">{LEVELS[k].label}</span>
                      <span class="lv-hint">{LEVELS[k].hint}</span>
                      {est != null ? (
                        <span class={`lv-est num ${smaller ? 'good' : ''}`}>
                          ~{formatBytes(est)}{smaller ? ` · −${pct(est)}%` : ''}
                        </span>
                      ) : (
                        <span class="lv-est">{estimating ? '…' : ''}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {file && (
            <div class="btn-row">
              <button class="btn btn-primary" onClick={run} disabled={estimating || !docRef.current}>Compress PDF</button>
              <button class="btn btn-ghost" onClick={clear}>Clear</button>
            </div>
          )}
          {error && <p class="tool-error">{error}</p>}

          {result && (
            <>
              <div class="stat-row" style="margin-top:1.25rem">
                <div class="stat"><div class="stat-val">{formatBytes(result.before)}</div><div class="stat-label">before</div></div>
                <div class="stat"><div class="stat-val">{formatBytes(result.blob.size)}</div><div class="stat-label">after</div></div>
                <div class="stat">
                  <div class="stat-val" style={saved >= 0 ? 'color:var(--green)' : 'color:var(--dim)'}>
                    {saved >= 0 ? `−${saved}%` : `+${-saved}%`}
                  </div>
                  <div class="stat-label">{saved >= 0 ? 'saved' : 'larger'}</div>
                </div>
              </div>
              <div class="btn-row">
                <button class="btn btn-primary" onClick={() => downloadBlob(result.blob, (file?.name.replace(/\.pdf$/i, '') || 'file') + '-compressed.pdf')}>
                  Download compressed PDF
                </button>
              </div>
            </>
          )}
        </>
      )}
      <style>{`
        .level-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:0.6rem; }
        .level {
          display:flex; flex-direction:column; align-items:flex-start; gap:0.15rem;
          padding:0.75rem 0.9rem; background:#fff; border:1px solid var(--hairline);
          border-radius:var(--radius-sm); cursor:pointer; text-align:left;
          transition:border-color .15s var(--ease), box-shadow .15s var(--ease);
        }
        .level.on { border-color:var(--blue); box-shadow:0 0 0 1px var(--blue); }
        .lv-name { font-weight:600; font-size:var(--t-small); color:var(--ink); }
        .lv-hint { font-size:0.78rem; color:var(--dim); }
        .lv-est { font-size:0.78rem; color:var(--dim); margin-top:0.3rem; min-height:1em; }
        .lv-est.good { color:var(--green); font-weight:500; }
      `}</style>
    </div>
  );
}
