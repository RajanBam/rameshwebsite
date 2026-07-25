import { useState } from 'preact/hooks';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob, formatBytes } from '../../lib/format';
import ProgressRing from '../ui/ProgressRing';

/** PDF Compress — re-renders each page at a chosen resolution and JPEG quality,
 *  then rebuilds a smaller PDF. Best for scanned or image-heavy PDFs. Runs
 *  entirely in the browser: the file is never uploaded. */
const LEVELS = {
  high: { label: 'Smaller file', scale: 1.1, quality: 0.5 },
  medium: { label: 'Balanced', scale: 1.5, quality: 0.7 },
  low: { label: 'Better quality', scale: 2.0, quality: 0.85 },
} as const;
type Level = keyof typeof LEVELS;

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>('medium');
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; before: number } | null>(null);

  const add = (list: FileList | File[]) => {
    const pdf = Array.from(list).find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (pdf) { setFile(pdf); setResult(null); setError(''); }
  };

  const run = async () => {
    if (!file) return;
    setError(''); setResult(null); setProgress(0);
    try {
      const { scale, quality } = LEVELS[level];
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const src = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const out = await PDFDocument.create();

      for (let i = 1; i <= src.numPages; i++) {
        const page = await src.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const jpg: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality));
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

  return (
    <div class="tool-card">
      {busy ? (
        <ProgressRing value={progress} sublabel="Rebuilding your PDF" />
      ) : (
        <>
          <div class={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
            onClick={() => document.getElementById('pc-in')?.click()}>
            <div class="dz-title">{file ? file.name : 'Drop a PDF here'}</div>
            <div class="dz-hint">{file ? formatBytes(file.size) : 'or click to choose'} · nothing uploaded</div>
            <input id="pc-in" type="file" accept="application/pdf,.pdf" style="display:none"
              onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
          </div>

          <div class="field" style="margin-top:1.25rem">
            <label class="field-label">Compression</label>
            <div class="btn-row" style="margin:0">
              {(Object.keys(LEVELS) as Level[]).map((k) => (
                <button key={k} class={`btn ${level === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLevel(k)}>
                  {LEVELS[k].label}
                </button>
              ))}
            </div>
          </div>

          {file && (
            <div class="btn-row">
              <button class="btn btn-primary" onClick={run}>Compress PDF</button>
              <button class="btn btn-ghost" onClick={() => { setFile(null); setResult(null); }}>Clear</button>
            </div>
          )}
          {error && <p class="tool-error">✗ {error}</p>}

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
    </div>
  );
}
