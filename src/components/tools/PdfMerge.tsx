import { useState, useCallback } from 'preact/hooks';
import { PDFDocument } from 'pdf-lib';
import { formatBytes, downloadBlob } from '../../lib/format';

interface Row {
  id: string;
  file: File;
}

/** Merge PDF — combines any number of PDFs, entirely in the browser. */
export default function PdfMerge() {
  const [rows, setRows] = useState<Row[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const addFiles = useCallback((files: FileList | File[]) => {
    const pdfs = Array.from(files).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) return;
    setRows((prev) => [
      ...prev,
      ...pdfs.map((file) => ({ id: `${file.name}-${crypto.randomUUID()}`, file })),
    ]);
    setError('');
  }, []);

  const move = (index: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const merge = async () => {
    if (rows.length < 2) return;
    setBusy(true);
    setError('');
    try {
      const out = await PDFDocument.create();
      for (const row of rows) {
        const bytes = new Uint8Array(await row.file.arrayBuffer());
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const merged = await out.save();
      // Copy into a fresh ArrayBuffer-backed Blob to satisfy strict typing.
      downloadBlob(new Blob([merged as BlobPart], { type: 'application/pdf' }), 'merged.pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not merge these PDFs.');
    } finally {
      setBusy(false);
    }
  };

  const totalBytes = rows.reduce((s, r) => s + r.file.size, 0);

  return (
    <div class="tool-card">
      <div
        class={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer?.files ?? []); }}
        onClick={() => document.getElementById('pdf-input')?.click()}
      >
        <div class="dz-title">Drop PDF files here</div>
        <div class="dz-hint">or click to choose · unlimited files · nothing uploaded</div>
        <input
          id="pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          style="display:none"
          onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) addFiles(t.files); t.value = ''; }}
        />
      </div>

      {rows.length > 0 && (
        <>
          <ul class="file-list">
            {rows.map((row, i) => (
              <li class="file-row" key={row.id}>
                <span class="fr-handle" aria-hidden="true">⠿</span>
                <span class="fr-name">{row.file.name}</span>
                <span class="fr-meta">{formatBytes(row.file.size)}</span>
                <button class="fr-remove" title="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button class="fr-remove" title="Move down" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>↓</button>
                <button class="fr-remove" title="Remove" onClick={() => remove(row.id)}>✕</button>
              </li>
            ))}
          </ul>

          <div class="stat-row">
            <div class="stat"><div class="stat-val">{rows.length}</div><div class="stat-label">files</div></div>
            <div class="stat"><div class="stat-val">{formatBytes(totalBytes)}</div><div class="stat-label">total</div></div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" onClick={merge} disabled={busy || rows.length < 2}>
              {busy ? 'Merging…' : `Merge ${rows.length} PDFs`}
            </button>
            <button class="btn btn-ghost" onClick={() => setRows([])} disabled={busy}>Clear</button>
          </div>
          {rows.length < 2 && <p class="dz-hint" style="margin-top:0.75rem">Add at least two PDFs to merge.</p>}
          {error && <p class="tool-error">✗ {error}</p>}
        </>
      )}
    </div>
  );
}
