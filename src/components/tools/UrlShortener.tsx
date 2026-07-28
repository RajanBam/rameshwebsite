import { useState } from 'preact/hooks';
import QRCode from 'qrcode';

/** URL shortener. Shortening a link fundamentally needs a server to store
 *  and redirect it, so this is the one tool that calls an external service.
 *  We use free, no-account providers and try them in turn. The link you
 *  shorten is a link you intend to share, so no private file is involved.
 *  A QR code of the result is generated locally. */

interface Provider { name: string; run: (url: string) => Promise<string>; }

const PROVIDERS: Provider[] = [
  {
    name: 'spoo.me',
    run: async (url) => {
      const r = await fetch('https://spoo.me/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: 'url=' + encodeURIComponent(url),
      });
      if (!r.ok) throw new Error('spoo.me ' + r.status);
      const j = await r.json();
      if (!j.short_url) throw new Error('no short_url');
      return j.short_url;
    },
  },
  {
    name: 'cleanuri.com',
    run: async (url) => {
      const r = await fetch('https://cleanuri.com/api/v1/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'url=' + encodeURIComponent(url),
      });
      const j = await r.json();
      if (!j.result_url) throw new Error(j.error || 'no result_url');
      return j.result_url;
    },
  },
  {
    name: 'is.gd',
    run: async (url) => {
      const r = await fetch('https://is.gd/create.php?format=json&url=' + encodeURIComponent(url));
      const j = await r.json();
      if (!j.shorturl) throw new Error(j.errormessage || 'no shorturl');
      return j.shorturl;
    },
  },
  {
    name: 'TinyURL',
    run: async (url) => {
      const r = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url));
      if (!r.ok) throw new Error('tinyurl ' + r.status);
      const text = (await r.text()).trim();
      if (!/^https?:\/\//.test(text)) throw new Error('bad response');
      return text;
    },
  },
  // CORS-proxy fallbacks: guarantee reachability if a provider lacks CORS
  // headers. The proxy only relays the request; no data is stored.
  {
    name: 'is.gd',
    run: async (url) => {
      const target = 'https://is.gd/create.php?format=json&url=' + encodeURIComponent(url);
      const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(target));
      const j = await r.json();
      if (!j.shorturl) throw new Error(j.errormessage || 'no shorturl');
      return j.shorturl;
    },
  },
  {
    name: 'TinyURL',
    run: async (url) => {
      const target = 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url);
      const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(target));
      const text = (await r.text()).trim();
      if (!/^https?:\/\//.test(text)) throw new Error('bad response');
      return text;
    },
  },
];

function normalize(input: string): string | null {
  let u = input.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { new URL(u); return u; } catch { return null; }
}

export default function UrlShortener() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ short: string; via: string; qr: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const shorten = async () => {
    const url = normalize(input);
    if (!url) { setError('Please enter a valid link, for example example.com/page.'); return; }
    setBusy(true); setError(''); setResult(null);
    let lastErr = '';
    for (const p of PROVIDERS) {
      try {
        const short = await p.run(url);
        // Defence in depth: never render a non-http(s) URL returned by a
        // third-party API as a clickable link.
        if (!/^https?:\/\/[^\s]+$/i.test(short)) throw new Error('unexpected response');
        const qr = await QRCode.toDataURL(short, { width: 240, margin: 1 });
        setResult({ short, via: p.name, qr });
        setBusy(false);
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    setBusy(false);
    setError('All free shortening services are unreachable right now (this can happen on strict networks). Please try again in a moment. Last error: ' + lastErr);
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.short);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div class="tool-card">
      <label class="field-label" for="us-in">Paste a long link</label>
      <div class="short-row">
        <input id="us-in" class="text-input" value={input} placeholder="https://example.com/very/long/link?with=params"
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter') shorten(); }} />
        <button class="btn btn-primary" onClick={shorten} disabled={busy || !input.trim()}>
          {busy ? 'Shortening…' : 'Shorten'}
        </button>
      </div>
      {error && <p class="tool-error">{error}</p>}

      {result && (
        <div class="short-result">
          <div class="sr-main">
            <div class="sr-line">
              <a class="sr-link" href={result.short} target="_blank" rel="noopener">{result.short}</a>
              <div class="sr-actions">
                <button class="btn btn-ghost" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
                <a class="btn btn-ghost" href={result.short} target="_blank" rel="noopener">Open</a>
              </div>
            </div>
            <p class="sr-meta">Shortened via {result.via}. Scan the QR code to open it on a phone.</p>
          </div>
          <img class="sr-qr" src={result.qr} alt="QR code for the short link" width="120" height="120" />
        </div>
      )}

      <p class="short-note">
        <strong>How this one differs:</strong> shortening a link requires a server to store and redirect it, so unlike every other tool here, this one sends the link you enter to a free public shortening service. The link you shorten is one you intend to share, so no private file leaves your device.
      </p>

      <style>{`
        .short-row { display:flex; gap:0.6rem; margin-bottom:0.5rem; }
        .short-row .text-input { flex:1; }
        .short-result {
          display:flex; gap:1.25rem; align-items:center; flex-wrap:wrap;
          margin-top:1.25rem; padding:1.1rem; background:var(--gray);
          border:1px solid var(--hairline); border-radius:var(--radius-sm);
        }
        .sr-main { flex:1; min-width:220px; }
        .sr-line { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; justify-content:space-between; }
        .sr-link { font-family:var(--font-mono); font-size:1.1rem; font-weight:600; color:var(--blue); word-break:break-all; }
        .sr-actions { display:flex; gap:0.5rem; }
        .sr-actions .btn { padding:0.4rem 1rem; }
        .sr-meta { color:var(--dim); font-size:var(--t-small); margin-top:0.6rem; }
        .sr-qr { border-radius:10px; background:#fff; padding:6px; border:1px solid var(--hairline); }
        .short-note { color:var(--dim); font-size:var(--t-small); line-height:1.55; margin-top:1.25rem; padding-top:1rem; border-top:1px solid var(--hairline); }
      `}</style>
    </div>
  );
}
