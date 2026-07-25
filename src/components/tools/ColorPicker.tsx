import { useState } from 'preact/hooks';

/** Color picker & converter — HEX, RGB, HSL. Copy any format. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export default function ColorPicker() {
  const [hex, setHex] = useState('#0066cc');
  const [copied, setCopied] = useState('');

  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const rows = [
    { label: 'HEX', value: hex.toUpperCase() },
    { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
    { label: 'HSL', value: `hsl(${h}, ${s}%, ${l}%)` },
  ];

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(''), 1200);
  };

  return (
    <div class="tool-card">
      <div style="display:flex;gap:1.25rem;align-items:center;flex-wrap:wrap">
        <input type="color" value={hex} onInput={(e) => setHex((e.target as HTMLInputElement).value)}
          style="width:96px;height:96px;border:none;border-radius:var(--radius-sm);background:none;cursor:pointer" />
        <div style={`flex:1;min-width:160px;height:96px;border-radius:var(--radius-sm);border:1px solid var(--hairline);background:${hex}`} />
      </div>
      <div style="margin-top:1.25rem;display:flex;flex-direction:column;gap:0.6rem">
        {rows.map((row) => (
          <div class="file-row" key={row.label} style="margin:0">
            <span class="fr-meta" style="width:52px;flex:none">{row.label}</span>
            <span class="fr-name">{row.value}</span>
            <button class="btn btn-ghost" style="padding:0.35rem 0.9rem" onClick={() => copy(row.label, row.value)}>
              {copied === row.label ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
