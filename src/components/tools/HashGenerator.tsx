import { useState, useEffect } from 'preact/hooks';

/** Hash generator — SHA-1/256/384/512 via the Web Crypto API. Local only. */
const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
type Algo = (typeof ALGOS)[number];

async function hash(text: string, algo: Algo): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function HashGenerator() {
  const [text, setText] = useState('');
  const [algo, setAlgo] = useState<Algo>('SHA-256');
  const [digest, setDigest] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!text) { setDigest(''); return; }
    hash(text, algo).then((h) => { if (alive) setDigest(h); });
    return () => { alive = false; };
  }, [text, algo]);

  const copy = async () => {
    if (!digest) return;
    await navigator.clipboard.writeText(digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div class="tool-card">
      <label class="field-label" for="hg">Text to hash</label>
      <textarea
        id="hg"
        class="tool-textarea"
        style="min-height:110px"
        placeholder="Type or paste text…"
        value={text}
        spellcheck={false}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
      />
      <div class="btn-row">
        {ALGOS.map((a) => (
          <button key={a} class={`btn ${algo === a ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAlgo(a)}>{a}</button>
        ))}
      </div>
      {digest && (
        <>
          <div class="copy-line">
            <label class="field-label" style="margin:0">{algo} digest</label>
            <button class="btn btn-ghost" style="padding:0.35rem 0.9rem" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <div class="result-box">{digest}</div>
        </>
      )}
    </div>
  );
}
