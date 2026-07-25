import { useState, useRef } from 'preact/hooks';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob, formatBytes } from '../../lib/format';
import ProgressRing from '../ui/ProgressRing';

/** PDF Compress.
 *  Two strategies, chosen intelligently per file:
 *  - Lossless: structural re-save (object streams, cleanup). Keeps exact
 *    quality. The real output size is computed up front and shown.
 *  - Raster levels: re-render pages as JPEG. Effective for scans and
 *    image-heavy PDFs. Every level's expected size is estimated from real
 *    sample renders BEFORE compressing, and any level that would make the
 *    file LARGER is disabled, never offered.
 *  Everything runs in the browser; nothing is uploaded. */
const RASTER_LEVELS = {
  extreme: { label: 'Extreme', hint: 'smallest file', scale: 1.3, quality: 0.3 },
  strong: { label: 'Strong', hint: 'small, readable', scale: 1.5, quality: 0.5 },
  balanced: { label: 'Balanced', hint: 'good quality', scale: 1.8, quality: 0.65 },
  light: { label: 'Light', hint: 'near original', scale: 2.2, quality: 0.8 },
} as const;
type RasterLevel = keyof typeof RASTER_LEVELS;
type Level = RasterLevel | 'lossless';
const RASTER_KEYS = Object.keys(RASTER_LEVELS) as RasterLevel[];
/** Rasterizing is impractical beyond this many pages (minutes of encode). */
const MAX_RASTER_PAGES = 300;

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
  const [level, setLevel] = useState<Level | null>(null);
  const [drag, setDrag] = useState(false);
  const [pages, setPages] = useState(0);
  const [estimates, setEstimates] = useState<Partial<Record<RasterLevel, number>>>({});
  const [losslessSize, setLosslessSize] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; before: number } | null>(null);
  const docRef = useRef<any>(null);
  const losslessRef = useRef<Uint8Array | null>(null);

  const reset = () => {
    setFile(null); setResult(null); setEstimates({}); setPages(0); setError('');
    setLosslessSize(null); setLevel(null);
    docRef.current = null; losslessRef.current = null;
  };

  const add = async (list: FileList | File[]) => {
    const pdf = Array.from(list).find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (!pdf) return;
    reset();
    setFile(pdf);
    setAnalyzing(true);
    try {
      const buf = await pdf.arrayBuffer();

      // 1) Lossless structural re-save: the real size, computed up front.
      let losslessOk = false;
      try {
        const doc = await PDFDocument.load(new Uint8Array(buf.slice(0)), { ignoreEncryption: true });
        const bytes = await doc.save({ useObjectStreams: true });
        losslessRef.current = bytes as Uint8Array;
        setLosslessSize(bytes.length);
        losslessOk = bytes.length < pdf.size;
      } catch {
        setLosslessSize(null);
      }

      // 2) Raster estimates from real sample renders (spread across the doc).
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
      docRef.current = doc;
      const n = doc.numPages;
      setPages(n);
      const est: Partial<Record<RasterLevel, number>> = {};
      if (n <= MAX_RASTER_PAGES) {
        const sampleIdx = [...new Set([1, Math.max(1, Math.ceil(n / 2)), n])].slice(0, 3);
        const samples = await Promise.all(sampleIdx.map((i) => doc.getPage(i)));
        for (const key of RASTER_KEYS) {
          const { scale, quality } = RASTER_LEVELS[key];
          let bytes = 0;
          for (const page of samples) bytes += (await renderPageJpeg(page, scale, quality)).size;
          est[key] = Math.round((bytes / samples.length) * n + n * 800 + 4000);
          setEstimates({ ...est });
        }
      }

      // 3) Pick the best default: smallest option that actually shrinks the file.
      const usableRaster = RASTER_KEYS.filter((k) => est[k] != null && est[k]! < pdf.size && n <= MAX_RASTER_PAGES);
      if (usableRaster.length > 0) setLevel(usableRaster.includes('strong') ? 'strong' : usableRaster[0]);
      else if (losslessOk) setLevel('lossless');
      else setLevel(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this PDF.');
    } finally {
      setAnalyzing(false);
    }
  };

  const run = async () => {
    if (!file || !level) return;
    setError(''); setResult(null);
    // Lossless output was already computed during analysis: instant.
    if (level === 'lossless') {
      if (!losslessRef.current) return;
      setResult({ blob: new Blob([losslessRef.current as unknown as BlobPart], { type: 'application/pdf' }), before: file.size });
      return;
    }
    if (!docRef.current) return;
    setProgress(0);
    try {
      const { scale, quality } = RASTER_LEVELS[level];
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
      setResult({ blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), before: file.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compress this PDF.');
    } finally {
      setTimeout(() => setProgress(-1), 900);
    }
  };

  const busy = progress >= 0 && progress < 100;
  const saved = result ? Math.round((1 - result.blob.size / result.before) * 100) : 0;
  const pct = (n: number) => (file ? Math.round((1 - n / file.size) * 100) : 0);

  const tooManyPages = pages > MAX_RASTER_PAGES;
  const rasterDisabled = (k: RasterLevel) =>
    tooManyPages || (estimates[k] != null && file != null && estimates[k]! >= file.size);
  const losslessDisabled = losslessSize == null || (file != null && losslessSize >= file.size);
  const allRasterOut = file != null && !analyzing &&
    RASTER_KEYS.every((k) => rasterDisabled(k));
  const nothingHelps = allRasterOut && losslessDisabled && !analyzing && file != null;

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
                Method {analyzing && <span style="color:var(--dim);font-weight:400">· analyzing your PDF…</span>}
              </label>
              <div class="level-grid">
                <button
                  class={`level ${level === 'lossless' ? 'on' : ''}`}
                  disabled={losslessDisabled}
                  onClick={() => !losslessDisabled && setLevel('lossless')}>
                  <span class="lv-name">Lossless</span>
                  <span class="lv-hint">exact same quality</span>
                  {losslessSize != null ? (
                    losslessSize < (file?.size ?? 0) ? (
                      <span class="lv-est num good">{formatBytes(losslessSize)} · −{pct(losslessSize)}%</span>
                    ) : (
                      <span class="lv-est bad">already optimal</span>
                    )
                  ) : (
                    <span class="lv-est">{analyzing ? '…' : 'not available'}</span>
                  )}
                </button>
                {RASTER_KEYS.map((k) => {
                  const est = estimates[k];
                  const disabled = rasterDisabled(k);
                  const shrinks = est != null && file != null && est < file.size;
                  return (
                    <button key={k} class={`level ${level === k ? 'on' : ''}`} disabled={disabled}
                      onClick={() => !disabled && setLevel(k)}>
                      <span class="lv-name">{RASTER_LEVELS[k].label}</span>
                      <span class="lv-hint">{RASTER_LEVELS[k].hint}</span>
                      {tooManyPages ? (
                        <span class="lv-est bad">too many pages</span>
                      ) : est != null ? (
                        shrinks ? (
                          <span class="lv-est num good">~{formatBytes(est)} · −{pct(est)}%</span>
                        ) : (
                          <span class="lv-est bad">would enlarge</span>
                        )
                      ) : (
                        <span class="lv-est">{analyzing ? '…' : ''}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {allRasterOut && !losslessDisabled && (
                <p class="method-note">
                  This PDF is text-based and already efficient, so re-rendering its pages would only enlarge it.
                  Lossless optimization is the right method here: it keeps the exact quality.
                </p>
              )}
              {nothingHelps && (
                <p class="method-note">
                  This PDF is already as small as it can get without losing quality. Compressing it further is not possible, and we will not offer an option that makes it larger.
                </p>
              )}
            </div>
          )}

          {file && (
            <div class="btn-row">
              <button class="btn btn-primary" onClick={run} disabled={analyzing || !level}>
                {level === 'lossless' ? 'Optimize PDF' : 'Compress PDF'}
              </button>
              <button class="btn btn-ghost" onClick={reset}>Clear</button>
            </div>
          )}
          {error && <p class="tool-error">{error}</p>}

          {result && (
            <>
              <div class="stat-row" style="margin-top:1.25rem">
                <div class="stat"><div class="stat-val">{formatBytes(result.before)}</div><div class="stat-label">before</div></div>
                <div class="stat"><div class="stat-val">{formatBytes(result.blob.size)}</div><div class="stat-label">after</div></div>
                <div class="stat">
                  <div class="stat-val" style="color:var(--green)">−{saved}%</div>
                  <div class="stat-label">saved</div>
                </div>
              </div>
              <div class="btn-row">
                <button class="btn btn-primary" onClick={() => downloadBlob(result.blob, (file?.name.replace(/\.pdf$/i, '') || 'file') + '-compressed.pdf')}>
                  Download PDF
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
          transition:border-color .15s var(--ease), box-shadow .15s var(--ease), opacity .15s var(--ease);
        }
        .level.on { border-color:var(--blue); box-shadow:0 0 0 1px var(--blue); }
        .level:disabled { opacity:0.45; cursor:not-allowed; }
        .lv-name { font-weight:600; font-size:var(--t-small); color:var(--ink); }
        .lv-hint { font-size:0.78rem; color:var(--dim); }
        .lv-est { font-size:0.78rem; color:var(--dim); margin-top:0.3rem; min-height:1em; }
        .lv-est.good { color:var(--green); font-weight:500; }
        .lv-est.bad { color:#b45309; }
        .method-note { font-size:0.82rem; color:var(--dim); margin-top:0.75rem; line-height:1.5; }
      `}</style>
    </div>
  );
}
