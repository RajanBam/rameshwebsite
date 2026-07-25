import { useState, useRef } from 'preact/hooks';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob, formatBytes } from '../../lib/format';
import { runGhostscript, type GsSetting } from '../../lib/gs';
import ProgressRing from '../ui/ProgressRing';

/** PDF Compress, powered by a WebAssembly build of Ghostscript running in a
 *  worker: the same class of engine the big PDF sites run on their servers,
 *  except here the file never leaves the device.
 *
 *  On drop, the file is compressed at every quality level in the background,
 *  so each option shows its REAL output size (not an estimate) before the
 *  user chooses. Text stays selectable; embedded images are downsampled.
 *  Any level that would enlarge the file is disabled, never offered. */
const LEVELS: Record<string, { setting: GsSetting; label: string; hint: string }> = {
  smallest: { setting: '/screen', label: 'Smallest', hint: 'images at 72 dpi' },
  balanced: { setting: '/ebook', label: 'Balanced', hint: 'images at 150 dpi' },
  high: { setting: '/printer', label: 'High quality', hint: 'images at 300 dpi' },
};
type Level = keyof typeof LEVELS;
const LEVEL_KEYS = Object.keys(LEVELS) as Level[];

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [drag, setDrag] = useState(false);
  const [pages, setPages] = useState(0);
  const [sizes, setSizes] = useState<Partial<Record<Level, number>>>({});
  const [failed, setFailed] = useState<Partial<Record<Level, boolean>>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; before: number } | null>(null);
  const outputs = useRef<Partial<Record<Level, Uint8Array>>>({});
  const jobId = useRef(0);

  const reset = () => {
    jobId.current++;
    setFile(null); setResult(null); setSizes({}); setFailed({}); setPages(0);
    setError(''); setLevel(null); setProgress(-1); setAnalyzing(false);
    outputs.current = {};
  };

  const add = async (list: FileList | File[]) => {
    const pdf = Array.from(list).find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (!pdf) return;
    reset();
    const job = ++jobId.current;
    setFile(pdf);
    setAnalyzing(true);
    setProgress(0);
    try {
      const buf = await pdf.arrayBuffer();

      // Page count (for progress) via pdf.js, quickly and locally.
      let numPages = 0;
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
        numPages = doc.numPages;
        if (job !== jobId.current) return;
        setPages(numPages);
        doc.destroy();
      } catch { /* page count is cosmetic; continue without it */ }

      // Compress at every level, smallest first, storing the real outputs.
      const done: Partial<Record<Level, number>> = {};
      const bad: Partial<Record<Level, boolean>> = {};
      for (let i = 0; i < LEVEL_KEYS.length; i++) {
        const key = LEVEL_KEYS[i];
        if (job !== jobId.current) return;
        try {
          const out = await runGhostscript(buf, LEVELS[key].setting, (page) => {
            if (job !== jobId.current || !numPages) return;
            setProgress(Math.min(99, Math.round(((i + page / numPages) / LEVEL_KEYS.length) * 100)));
          });
          outputs.current[key] = out;
          done[key] = out.length;
        } catch {
          bad[key] = true;
        }
        if (job !== jobId.current) return;
        setSizes({ ...done });
        setFailed({ ...bad });
        setProgress(Math.min(99, Math.round(((i + 1) / LEVEL_KEYS.length) * 100)));
      }

      // Every level failed (corrupted/encrypted input): try a structural
      // re-save so we still offer something when it helps.
      if (Object.keys(done).length === 0) {
        try {
          const doc = await PDFDocument.load(new Uint8Array(buf.slice(0)), { ignoreEncryption: true });
          const bytes = (await doc.save({ useObjectStreams: true })) as Uint8Array;
          if (job !== jobId.current) return;
          outputs.current.balanced = bytes;
          done.balanced = bytes.length;
          bad.balanced = false as any;
          setSizes({ ...done }); setFailed({ ...bad });
        } catch {
          setError('This PDF could not be processed. It may be corrupted or password-protected.');
        }
      }

      // Auto-select the best level that actually shrinks the file.
      const shrinking = LEVEL_KEYS.filter((k) => done[k] != null && done[k]! < pdf.size);
      setLevel(shrinking.includes('balanced') ? 'balanced' : shrinking[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this PDF.');
    } finally {
      if (job === jobId.current) { setAnalyzing(false); setProgress(-1); }
    }
  };

  // Outputs are computed during analysis, so compressing is instant.
  const run = () => {
    if (!file || !level) return;
    const bytes = outputs.current[level];
    if (!bytes) return;
    setResult({ blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), before: file.size });
  };

  const saved = result ? Math.round((1 - result.blob.size / result.before) * 100) : 0;
  const pct = (n: number) => (file ? Math.round((1 - n / file.size) * 100) : 0);
  const nothingHelps = file != null && !analyzing && !error &&
    LEVEL_KEYS.every((k) => sizes[k] == null || sizes[k]! >= file.size);

  return (
    <div class="tool-card">
      {analyzing ? (
        <ProgressRing
          value={Math.max(0, progress)}
          label="Compressing…"
          sublabel={pages ? `${pages} pages · trying every quality level` : 'Trying every quality level'}
        />
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
              <label class="field-label">Result size at each level (already computed, exact)</label>
              <div class="level-grid">
                {LEVEL_KEYS.map((k) => {
                  const size = sizes[k];
                  const shrinks = size != null && size < file.size;
                  const disabled = !shrinks;
                  return (
                    <button key={k} class={`level ${level === k ? 'on' : ''}`} disabled={disabled}
                      onClick={() => shrinks && setLevel(k)}>
                      <span class="lv-name">{LEVELS[k].label}</span>
                      <span class="lv-hint">{LEVELS[k].hint}</span>
                      {size != null ? (
                        shrinks ? (
                          <span class="lv-est num good">{formatBytes(size)} · −{pct(size)}%</span>
                        ) : (
                          <span class="lv-est bad">would enlarge</span>
                        )
                      ) : (
                        <span class="lv-est bad">{failed[k] ? 'not possible' : ''}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {nothingHelps && (
                <p class="method-note">
                  This PDF is already as small as this quality allows. We will not offer an option that makes it larger.
                </p>
              )}
              <p class="method-note">
                Text stays selectable and searchable. Compression happens on your device; the file is never uploaded.
              </p>
            </div>
          )}

          {file && !error && (
            <div class="btn-row">
              <button class="btn btn-primary" onClick={run} disabled={!level}>Get compressed PDF</button>
              <button class="btn btn-ghost" onClick={reset}>Clear</button>
            </div>
          )}
          {error && (
            <>
              <p class="tool-error">{error}</p>
              <div class="btn-row"><button class="btn btn-ghost" onClick={reset}>Clear</button></div>
            </>
          )}

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
                  Download compressed PDF
                </button>
              </div>
            </>
          )}
        </>
      )}
      <style>{`
        .level-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.6rem; }
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
