import { useState, useCallback, useEffect } from 'preact/hooks';

/** Strong password generator — cryptographically random, never leaves the tab. */
const SETS = {
  lower: 'abcdefghijkmnpqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digits: '23456789',
  symbols: '!@#$%^&*-_=+?',
};

function make(len: number, opts: Record<keyof typeof SETS, boolean>): string {
  let pool = '';
  (Object.keys(SETS) as (keyof typeof SETS)[]).forEach((k) => { if (opts[k]) pool += SETS[k]; });
  if (!pool) return '';
  const rnd = new Uint32Array(len);
  crypto.getRandomValues(rnd);
  let out = '';
  for (let i = 0; i < len; i++) out += pool[rnd[i] % pool.length];
  return out;
}

export default function PasswordGenerator() {
  const [len, setLen] = useState(16);
  const [opts, setOpts] = useState({ lower: true, upper: true, digits: true, symbols: true });
  const [pw, setPw] = useState('');
  const [copied, setCopied] = useState(false);

  const regen = useCallback(() => setPw(make(len, opts)), [len, opts]);
  useEffect(() => { regen(); }, [regen]);

  const copy = async () => {
    if (!pw) return;
    await navigator.clipboard.writeText(pw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const active = Object.values(opts).filter(Boolean).length;
  const strength = pw.length >= 16 && active >= 3 ? 'Strong' : pw.length >= 12 && active >= 2 ? 'Good' : 'Weak';

  return (
    <div class="tool-card">
      <div class="copy-line" style="margin-top:0">
        <div class="result-box" style="margin:0;flex:1;font-size:1.15rem;text-align:center">{pw || 'Choose at least one character type'}</div>
        <button class="btn btn-ghost" onClick={regen} title="Regenerate">↻</button>
        <button class="btn btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <p class="trust" style="margin-top:0.75rem">
        <span class="dot" style={strength === 'Weak' ? 'background:#c22' : strength === 'Good' ? 'background:var(--blue)' : ''} />
        {strength}
      </p>

      <div class="field" style="margin-top:1.25rem">
        <label class="field-label" for="pl">Length · {len}</label>
        <input id="pl" type="range" min="6" max="48" value={len} style="width:100%"
          onInput={(e) => setLen(Number((e.target as HTMLInputElement).value))} />
      </div>
      <div class="btn-row">
        {(Object.keys(SETS) as (keyof typeof SETS)[]).map((k) => (
          <label key={k} class="btn btn-ghost" style="cursor:pointer;text-transform:capitalize">
            <input type="checkbox" checked={opts[k]} style="margin-right:0.4rem"
              onChange={(e) => setOpts({ ...opts, [k]: (e.target as HTMLInputElement).checked })} />
            {k}
          </label>
        ))}
      </div>
    </div>
  );
}
