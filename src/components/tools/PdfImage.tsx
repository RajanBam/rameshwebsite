import { useState } from 'preact/hooks';
import { PDFDocument } from 'pdf-lib';
import { zip } from 'fflate';
import { downloadBlob } from '../../lib/format';

type Mode = 'toimg' | 'topdf';

/** PDF ⇄ Image — render PDF pages to PNG, or combine images into a PDF.
 *  pdf.js and its worker are lazy-imported so nothing browser-only runs
 *  during SSR and the heavy code only loads on use. */
export default function PdfImage() {
  const [mode, setMode] = useState<Mode>('toimg');
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const accept = mode === 'toimg' ? 'application/pdf,.pdf' : 'image/*';

  const add = (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) =>
      mode === 'toimg' ? /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name) : f.type.startsWith('image/'),
    );
    if (arr.length) setFiles((p) => (mode === 'toimg' ? [arr[0]] : [...p, ...arr]));
    setError('');
  };

  const switchMode = (m: Mode) => { setMode(m); setFiles([]); setError(''); };

  const pdfToImages = async () => {
    const file = files[0];
    if (!file) return;
    setBusy('Rendering pages…'); setError('');
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const base = file.name.replace(/\.pdf$/i, '');
      const out: Record<string, Uint8Array> = {};
      for (let i = 1; i <= doc.numPages; i++) {
        setBusy(`Rendering page ${i} / ${doc.numPages}…`);
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
        out[`${base}-page-${i}.png`] = new Uint8Array(await blob.arrayBuffer());
      }
      if (doc.numPages === 1) {
        const only = Object.entries(out)[0];
        downloadBlob(new Blob([only[1]], { type: 'image/png' }), only[0]);
      } else {
        zip(out, (err, data) => { if (!err) downloadBlob(new Blob([data], { type: 'application/zip' }), `${base}-images.zip`); });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not render this PDF.');
    } finally {
      setBusy('');
    }
  };

  const imagesToPdf = async () => {
    if (!files.length) return;
    setBusy('Building PDF…'); setError('');
    try {
      const pdf = await PDFDocument.create();
      for (const file of files) {
        const buf = new Uint8Array(await file.arrayBuffer());
        let img;
        if (file.type === 'image/jpeg') img = await pdf.embedJpg(buf);
        else if (file.type === 'image/png') img = await pdf.embedPng(buf);
        else {
          // Convert webp/others to PNG via canvas first.
          const bmp = await createImageBitmap(file);
          const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
          c.getContext('2d')!.drawImage(bmp, 0, 0);
          const pngBlob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
          img = await pdf.embedPng(new Uint8Array(await pngBlob.arrayBuffer()));
        }
        const page = pdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const bytes = await pdf.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'images.pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the PDF.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div class="tool-card">
      <div class="seg" style="display:inline-flex;background:var(--gray);border-radius:10px;padding:3px;margin-bottom:1.25rem">
        <button class={mode === 'toimg' ? 'on' : ''} onClick={() => switchMode('toimg')}>PDF → Image</button>
        <button class={mode === 'topdf' ? 'on' : ''} onClick={() => switchMode('topdf')}>Image → PDF</button>
      </div>

      <div class={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
        onClick={() => document.getElementById('pi-input')?.click()}>
        <div class="dz-title">{mode === 'toimg' ? 'Drop a PDF here' : 'Drop images here'}</div>
        <div class="dz-hint">{mode === 'toimg' ? 'each page becomes a PNG' : 'combined into one PDF, in order'} · nothing uploaded</div>
        <input id="pi-input" type="file" accept={accept} multiple={mode === 'topdf'} style="display:none"
          onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
      </div>

      {files.length > 0 && (
        <ul class="file-list">
          {files.map((f, i) => (
            <li class="file-row" key={f.name + i}>
              <span class="fr-name">{f.name}</span>
              <button class="fr-remove" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <div class="btn-row">
        <button class="btn btn-primary" disabled={!!busy || files.length === 0}
          onClick={mode === 'toimg' ? pdfToImages : imagesToPdf}>
          {busy || (mode === 'toimg' ? 'Convert to images' : `Make PDF from ${files.length || ''} image${files.length === 1 ? '' : 's'}`)}
        </button>
        {files.length > 0 && <button class="btn btn-ghost" disabled={!!busy} onClick={() => setFiles([])}>Clear</button>}
      </div>
      {error && <p class="tool-error">✗ {error}</p>}
      <style>{`
        .seg button { border: none; background: none; padding: 0.45rem 0.9rem; border-radius: 8px; font-size: var(--t-small); color: var(--dim); }
        .seg button.on { background: #fff; color: var(--ink); box-shadow: var(--shadow-card); font-weight: 500; }
      `}</style>
    </div>
  );
}
