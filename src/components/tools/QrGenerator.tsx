import { useState, useEffect } from 'preact/hooks';
import QRCode from 'qrcode';
import { downloadBlob } from '../../lib/format';

/** QR Code Generator — PNG + SVG, no watermark, generated locally. */
export default function QrGenerator() {
  const [text, setText] = useState('https://');
  const [fg, setFg] = useState('#1d1d1f');
  const [bg, setBg] = useState('#ffffff');
  const [size, setSize] = useState(320);
  const [pngUrl, setPngUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!text.trim()) {
      setPngUrl('');
      return;
    }
    QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: 'M',
    })
      .then((url) => { if (!cancelled) { setPngUrl(url); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not generate'); });
    return () => { cancelled = true; };
  }, [text, fg, bg, size]);

  const downloadPng = () => {
    if (!pngUrl) return;
    fetch(pngUrl).then((r) => r.blob()).then((b) => downloadBlob(b, 'qr-code.png'));
  };

  const downloadSvg = async () => {
    if (!text.trim()) return;
    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin: 2,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: 'M',
    });
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
  };

  return (
    <div class="tool-card" style="display:grid;gap:1.5rem;grid-template-columns:1fr;align-items:start">
      <div>
        <div class="field">
          <label class="field-label" for="qr-text">Link or text</label>
          <input
            id="qr-text"
            class="text-input"
            value={text}
            onInput={(e) => setText((e.target as HTMLInputElement).value)}
            placeholder="https://example.com"
          />
        </div>
        <div class="stat-row" style="gap:1rem">
          <div class="field" style="margin:0">
            <label class="field-label" for="qr-fg">Foreground</label>
            <input id="qr-fg" type="color" value={fg} onInput={(e) => setFg((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field" style="margin:0">
            <label class="field-label" for="qr-bg">Background</label>
            <input id="qr-bg" type="color" value={bg} onInput={(e) => setBg((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field" style="margin:0">
            <label class="field-label" for="qr-size">Size</label>
            <select id="qr-size" class="select-input" value={String(size)} onChange={(e) => setSize(Number((e.target as HTMLSelectElement).value))}>
              <option value="256">256 px</option>
              <option value="320">320 px</option>
              <option value="512">512 px</option>
              <option value="1024">1024 px</option>
            </select>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" onClick={downloadPng} disabled={!pngUrl}>Download PNG</button>
          <button class="btn btn-ghost" onClick={downloadSvg} disabled={!text.trim()}>Download SVG</button>
        </div>
        {error && <p class="tool-error">✗ {error}</p>}
      </div>

      <div style="display:flex;justify-content:center;align-items:center;min-height:220px">
        {pngUrl
          ? <img src={pngUrl} alt="Your QR code" width={220} height={220} style="border-radius:12px" />
          : <span style="color:var(--dim)">Type something to see your QR code</span>}
      </div>
    </div>
  );
}
