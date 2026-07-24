import { useState } from 'preact/hooks';
import { PDFDocument } from 'pdf-lib';
import { zip } from 'fflate';
import { formatBytes, downloadBlob } from '../../lib/format';

/** Split PDF — extract a page range, or burst every page into its own file. */
export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState('');
  const [mode, setMode] = useState<'range' | 'each'>('range');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (f: File) => {
    setError('');
    try {
      const doc = await PDFDocument.load(new Uint8Array(await f.arrayBuffer()), { ignoreEncryption: true });
      const n = doc.getPageCount();
      setFile(f); setPageCount(n); setRange(`1-${n}`);
    } catch {
      setError('Could not read that PDF.');
    }
  };

  // "1-3,5,8-10" -> [0,1,2,4,7,8,9] (0-indexed), clamped and de-duplicated.
  const parseRange = (spec: string, max: number): number[] => {
    const out = new Set<number>();
    for (const part of spec.split(',')) {
      const t = part.trim();
      if (!t) continue;
      if (t.includes('-')) {
        const [a, b] = t.split('-').map((x) => parseInt(x, 10));
        if (!isNaN(a) && !isNaN(b)) for (let i = a; i <= b; i++) if (i >= 1 && i <= max) out.add(i - 1);
      } else {
        const i = parseInt(t, 10);
        if (!isNaN(i) && i >= 1 && i <= max) out.add(i - 1);
      }
    }
    return [...out].sort((a, b) => a - b);
  };

  const run = async () => {
    if (!file) return;
    const indices = parseRange(range, pageCount);
    if (indices.length === 0) { setError('No valid pages in that range.'); return; }
    setBusy(true); setError('');
    try {
      const src = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
      const base = file.name.replace(/\.pdf$/i, '');

      if (mode === 'range') {
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, indices);
        pages.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${base}-split.pdf`);
      } else {
        const files: Record<string, Uint8Array> = {};
        for (const idx of indices) {
          const out = await PDFDocument.create();
          const [p] = await out.copyPages(src, [idx]);
          out.addPage(p);
          files[`${base}-page-${idx + 1}.pdf`] = await out.save();
        }
        zip(files, (err, data) => {
          if (!err) downloadBlob(new Blob([data], { type: 'application/zip' }), `${base}-pages.zip`);
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not split this PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="tool-card">
      {!file ? (
        <div class={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer?.files?.[0]; if (f) load(f); }}
          onClick={() => document.getElementById('split-input')?.click()}>
          <div class="dz-title">Drop a PDF here</div>
          <div class="dz-hint">or click to choose · nothing uploaded</div>
          <input id="split-input" type="file" accept="application/pdf,.pdf" style="display:none"
            onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) load(f); }} />
        </div>
      ) : (
        <>
          <div class="file-row" style="margin-bottom:1.25rem">
            <span class="fr-name">{file.name}</span>
            <span class="fr-meta">{pageCount} pages · {formatBytes(file.size)}</span>
            <button class="fr-remove" onClick={() => { setFile(null); setPageCount(0); }}>✕</button>
          </div>

          <div class="seg" style="display:inline-flex;background:var(--gray);border-radius:10px;padding:3px;margin-bottom:1rem">
            <button class={mode === 'range' ? 'on' : ''} onClick={() => setMode('range')}>Extract range</button>
            <button class={mode === 'each' ? 'on' : ''} onClick={() => setMode('each')}>Each page (zip)</button>
          </div>

          {mode === 'range' && (
            <div class="field">
              <label class="field-label">Pages (e.g. 1-3, 5, 8-10)</label>
              <input class="text-input" value={range} onInput={(e) => setRange((e.target as HTMLInputElement).value)} />
            </div>
          )}

          <div class="btn-row">
            <button class="btn btn-primary" onClick={run} disabled={busy}>
              {busy ? 'Working…' : mode === 'range' ? 'Extract pages' : 'Split all pages'}
            </button>
          </div>
          {error && <p class="tool-error">✗ {error}</p>}
        </>
      )}
      <style>{`
        .seg button { border: none; background: none; padding: 0.45rem 0.9rem; border-radius: 8px; font-size: var(--t-small); color: var(--dim); }
        .seg button.on { background: #fff; color: var(--ink); box-shadow: var(--shadow-card); font-weight: 500; }
      `}</style>
    </div>
  );
}
