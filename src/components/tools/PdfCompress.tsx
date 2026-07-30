import { useState, useRef } from 'preact/hooks';
import { downloadBlob, formatBytes } from '../../lib/format';
import { runGhostscript, type GsSetting } from '../../lib/gs';
import ProgressRing from '../ui/ProgressRing';

/** PDF Compress, powered by a WebAssembly build of Ghostscript in a worker
 *  (the engine class the big PDF sites run on their servers), fully on-device.
 *
 *  On drop it only reads the page count — instant — and lets the user choose
 *  a quality and press Compress. Nothing runs until they ask, so a large file
 *  never forces a wait. A time hint is shown up front, and a live page counter
 *  runs during the pass. Text stays selectable. */
const LEVELS: Record<string, { setting: GsSetting; label: string; hint: string }> = {
  smallest: { setting: '/screen', label: 'Maximum', hint: 'smallest file · 72 dpi' },
  balanced: { setting: '/ebook', label: 'Balanced', hint: 'great quality · 150 dpi' },
  high: { setting: '/printer', label: 'High quality', hint: 'print-ready · 300 dpi' },
};
type Level = keyof typeof LEVELS;
const LEVEL_KEYS = Object.keys(LEVELS) as Level[];

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [pages, setPages] = useState(0);
  const [level, setLevel] = useState<Level>('smallest');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [curPage, setCurPage] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; size: number; level: Level } | null>(null);
  const bufRef = useRef<ArrayBuffer | null>(null);
  const pagesRef = useRef(0);
  const jobId = useRef(0);

  const reset = () => {
    jobId.current++;
    setFile(null); setResult(null); setPages(0); setError('');
    setRunning(false); setProgress(0); setCurPage(0); setLevel('smallest');
    bufRef.current = null; pagesRef.current = 0;
  };

  const add = async (list: FileList | File[]) => {
    const pdf = Array.from(list).find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (!pdf) return;
    reset();
    const job = ++jobId.current;
    setFile(pdf); setError('');
    try {
      bufRef.current = await pdf.arrayBuffer();
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(bufRef.current.slice(0)) }).promise;
      if (job !== jobId.current) return;
      pagesRef.current = doc.numPages;
      setPages(doc.numPages);
      doc.destroy();
    } catch (e) {
      if (job === jobId.current) setError('Could not read this PDF. It may be encrypted or damaged.');
    }
  };

  const compress = async () => {
    if (!bufRef.current || !file) return;
    const job = jobId.current;
    setRunning(true); setProgress(0); setCurPage(0); setError(''); setResult(null);
    try {
      const out = await runGhostscript(bufRef.current, LEVELS[level].setting, (page) => {
        if (job !== jobId.current) return;
        setCurPage(page);
        if (pagesRef.current) setProgress(Math.min(99, Math.round((page / pagesRef.current) * 100)));
      });
      if (job !== jobId.current) return;
      if (out.length >= file.size) {
        setError('This PDF is already efficiently compressed, so this level would not make it smaller. Try a stronger level, or keep the original.');
      } else {
        setResult({ blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }), size: out.length, level });
      }
    } catch {
      if (job === jobId.current) setError('Could not compress this PDF. It may be encrypted or damaged.');
    } finally {
      if (job === jobId.current) setRunning(false);
    }
  };

  // Rough time hint: Ghostscript-WASM does very roughly 0.5 MB/s on a laptop.
  const est = file ? Math.max(2, Math.round(file.size / (0.6 * 1024 * 1024))) : 0;
  const timeHint = est < 60 ? `about ${est}s` : `about ${Math.ceil(est / 60)} min`;
  const saved = result && file ? Math.round((1 - result.size / file.size) * 100) : 0;

  return (
    <div class="tool-card">
      {running ? (
        <>
          <ProgressRing value={progress} label={`Compressing (${LEVELS[level].label})…`}
            sublabel={pages ? `Page ${curPage.toLocaleString()} of ${pages.toLocaleString()}` : 'On your device'} />
          <p class="method-note" style="text-align:center">Working on your device. Larger files take longer; the page counter above is live.</p>
        </>
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

          {file && !error && (
            <div class="field" style="margin-top:1.25rem">
              <label class="field-label">Quality</label>
              <div class="level-grid">
                {LEVEL_KEYS.map((k) => (
                  <button key={k} class={`level ${level === k ? 'on' : ''}`} onClick={() => setLevel(k)}>
                    <span class="lv-name">{LEVELS[k].label}</span>
                    <span class="lv-hint">{LEVELS[k].hint}</span>
                  </button>
                ))}
              </div>
              <div class="btn-row">
                <button class="btn btn-primary" onClick={compress}>Compress PDF</button>
                <button class="btn btn-ghost" onClick={reset}>Clear</button>
              </div>
              <p class="method-note">Estimated time for this file: <strong>{timeHint}</strong>. Text stays selectable; it all runs on your device, nothing uploaded.</p>
            </div>
          )}

          {error && (
            <>
              <p class="tool-error" style="margin-top:1rem">{error}</p>
              <div class="btn-row"><button class="btn btn-ghost" onClick={reset}>Clear</button></div>
            </>
          )}

          {result && (
            <>
              <div class="stat-row" style="margin-top:1.5rem">
                <div class="stat"><div class="stat-val">{formatBytes(file!.size)}</div><div class="stat-label">before</div></div>
                <div class="stat"><div class="stat-val">{formatBytes(result.size)}</div><div class="stat-label">after</div></div>
                <div class="stat"><div class="stat-val" style="color:var(--green)">−{saved}%</div><div class="stat-label">saved</div></div>
              </div>
              <div class="btn-row">
                <button class="btn btn-primary" onClick={() => downloadBlob(result.blob, (file!.name.replace(/\.pdf$/i, '') || 'file') + '-compressed.pdf')}>
                  Download compressed PDF
                </button>
                <button class="btn btn-ghost" onClick={() => { setResult(null); }}>Try another quality</button>
              </div>
            </>
          )}
        </>
      )}
      <style>{`
        .level-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.6rem; margin-top:0.5rem; }
        .level { display:flex; flex-direction:column; align-items:flex-start; gap:0.15rem; padding:0.75rem 0.9rem;
          background:#fff; border:1px solid var(--hairline); border-radius:var(--radius-sm); cursor:pointer; text-align:left;
          transition:border-color .15s var(--ease), box-shadow .15s var(--ease); }
        .level.on { border-color:var(--blue); box-shadow:0 0 0 1px var(--blue); }
        .lv-name { font-weight:600; font-size:var(--t-small); color:var(--ink); }
        .lv-hint { font-size:0.78rem; color:var(--dim); }
        .method-note { font-size:0.82rem; color:var(--dim); margin-top:0.75rem; line-height:1.5; }
      `}</style>
    </div>
  );
}
