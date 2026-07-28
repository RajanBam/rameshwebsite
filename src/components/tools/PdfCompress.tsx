import { useState, useRef } from 'preact/hooks';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob, formatBytes } from '../../lib/format';
import { runGhostscript, type GsSetting } from '../../lib/gs';
import ProgressRing from '../ui/ProgressRing';

/** PDF Compress, powered by a WebAssembly build of Ghostscript running in a
 *  worker: the same engine class the big PDF sites run on their servers,
 *  except the file never leaves the device.
 *
 *  On drop it runs the maximum-compression level immediately (one pass) so
 *  the user sees the biggest saving fast. Higher-quality levels are one
 *  click away and run on demand. Text stays selectable; images are
 *  downsampled. A result that would enlarge the file is never shown. */
const LEVELS: Record<string, { setting: GsSetting; label: string; hint: string }> = {
  smallest: { setting: '/screen', label: 'Maximum', hint: 'smallest file · 72 dpi images' },
  balanced: { setting: '/ebook', label: 'Balanced', hint: 'great quality · 150 dpi images' },
  high: { setting: '/printer', label: 'High quality', hint: 'print-ready · 300 dpi images' },
};
type Level = keyof typeof LEVELS;
const LEVEL_KEYS = Object.keys(LEVELS) as Level[];

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [pages, setPages] = useState(0);
  const [busyLevel, setBusyLevel] = useState<Level | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Partial<Record<Level, { blob: Blob; size: number; ok: boolean }>>>({});
  const [active, setActive] = useState<Level>('smallest');
  const bufRef = useRef<ArrayBuffer | null>(null);
  const jobId = useRef(0);
  const pagesRef = useRef(0);

  const reset = () => {
    jobId.current++;
    setFile(null); setResults({}); setPages(0); setError('');
    setBusyLevel(null); setProgress(0); setActive('smallest');
    bufRef.current = null; pagesRef.current = 0;
  };

  const compressAt = async (lvl: Level) => {
    if (!bufRef.current || !file) return;
    const job = jobId.current;
    setBusyLevel(lvl); setProgress(0); setError('');
    try {
      const out = await runGhostscript(bufRef.current, LEVELS[lvl].setting, (page) => {
        if (job === jobId.current && pagesRef.current) setProgress(Math.min(99, Math.round((page / pagesRef.current) * 100)));
      });
      if (job !== jobId.current) return;
      const ok = out.length < file.size;
      setResults((r) => ({ ...r, [lvl]: { blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }), size: out.length, ok } }));
      setActive(lvl);
    } catch {
      if (job !== jobId.current) return;
      setResults((r) => ({ ...r, [lvl]: undefined }));
      setError('This level could not be produced. The file may be encrypted or damaged.');
    } finally {
      if (job === jobId.current) setBusyLevel(null);
    }
  };

  const add = async (list: FileList | File[]) => {
    const pdf = Array.from(list).find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (!pdf) return;
    reset();
    const job = ++jobId.current;
    setFile(pdf);
    setBusyLevel('smallest');
    try {
      bufRef.current = await pdf.arrayBuffer();
      // Page count for the progress bar (cosmetic).
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        const doc = await pdfjs.getDocument({ data: new Uint8Array(bufRef.current.slice(0)) }).promise;
        if (job !== jobId.current) return;
        pagesRef.current = doc.numPages;
        setPages(doc.numPages);
        doc.destroy();
      } catch { /* ignore */ }
      // One pass at maximum compression, immediately.
      const out = await runGhostscript(bufRef.current, LEVELS.smallest.setting, (page) => {
        if (job === jobId.current && pagesRef.current) setProgress(Math.min(99, Math.round((page / pagesRef.current) * 100)));
      });
      if (job !== jobId.current) return;
      const ok = out.length < pdf.size;
      setResults({ smallest: { blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }), size: out.length, ok } });
      setActive('smallest');
    } catch (e) {
      if (job === jobId.current) setError(e instanceof Error ? e.message : 'Could not read this PDF. It may be encrypted or damaged.');
    } finally {
      if (job === jobId.current) setBusyLevel(null);
    }
  };

  const cur = results[active];
  const saved = cur && file ? Math.round((1 - cur.size / file.size) * 100) : 0;
  const pct = (n: number) => (file ? Math.round((1 - n / file.size) * 100) : 0);
  const anyOk = LEVEL_KEYS.some((k) => results[k]?.ok);
  const smallestDone = results.smallest !== undefined || (busyLevel === null && !!file);
  const nothingHelps = smallestDone && file != null && !busyLevel && LEVEL_KEYS.every((k) => !results[k]?.ok) && !!results.smallest;

  return (
    <div class="tool-card">
      {busyLevel ? (
        <ProgressRing value={progress}
          label={`Compressing (${LEVELS[busyLevel].label})…`}
          sublabel={pages ? `${pages} pages · on your device` : 'On your device'} />
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

          {file && !error && anyOk && (
            <>
              <div class="stat-row" style="margin-top:1.5rem">
                <div class="stat"><div class="stat-val">{formatBytes(file.size)}</div><div class="stat-label">before</div></div>
                <div class="stat"><div class="stat-val">{cur ? formatBytes(cur.size) : '—'}</div><div class="stat-label">after</div></div>
                <div class="stat"><div class="stat-val" style="color:var(--green)">−{saved}%</div><div class="stat-label">saved</div></div>
              </div>

              <label class="field-label" style="margin-top:1.5rem">Quality (tap to switch, recomputed on your device)</label>
              <div class="level-grid">
                {LEVEL_KEYS.map((k) => {
                  const r = results[k];
                  return (
                    <button key={k} class={`level ${active === k ? 'on' : ''}`}
                      disabled={r != null && !r.ok}
                      onClick={() => { if (r) { if (r.ok) setActive(k); } else compressAt(k); }}>
                      <span class="lv-name">{LEVELS[k].label}</span>
                      <span class="lv-hint">{LEVELS[k].hint}</span>
                      {r ? (
                        r.ok
                          ? <span class="lv-est num good">{formatBytes(r.size)} · −{pct(r.size)}%</span>
                          : <span class="lv-est bad">would enlarge</span>
                      ) : (
                        <span class="lv-est">tap to try</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div class="btn-row">
                <button class="btn btn-primary" disabled={!cur?.ok}
                  onClick={() => cur && downloadBlob(cur.blob, (file.name.replace(/\.pdf$/i, '') || 'file') + '-compressed.pdf')}>
                  Download compressed PDF
                </button>
                <button class="btn btn-ghost" onClick={reset}>Clear</button>
              </div>
              <p class="method-note">Text stays selectable and searchable. Everything runs on your device; the file is never uploaded.</p>
            </>
          )}

          {nothingHelps && (
            <>
              <p class="method-note" style="margin-top:1.25rem">This PDF is already efficiently compressed, so we cannot make it meaningfully smaller without harming quality. We will not offer a result that enlarges your file.</p>
              <div class="btn-row"><button class="btn btn-ghost" onClick={reset}>Clear</button></div>
            </>
          )}

          {error && (
            <>
              <p class="tool-error" style="margin-top:1rem">{error}</p>
              <div class="btn-row"><button class="btn btn-ghost" onClick={reset}>Clear</button></div>
            </>
          )}
        </>
      )}
      <style>{`
        .level-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.6rem; margin-top:0.5rem; }
        .level {
          display:flex; flex-direction:column; align-items:flex-start; gap:0.15rem;
          padding:0.75rem 0.9rem; background:#fff; border:1px solid var(--hairline);
          border-radius:var(--radius-sm); cursor:pointer; text-align:left;
          transition:border-color .15s var(--ease), box-shadow .15s var(--ease), opacity .15s var(--ease);
        }
        .level.on { border-color:var(--blue); box-shadow:0 0 0 1px var(--blue); }
        .level:disabled { opacity:0.5; cursor:not-allowed; }
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
