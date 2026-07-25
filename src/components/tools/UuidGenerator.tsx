import { useState } from 'preact/hooks';

/** UUID v4 generator — cryptographically random, generated locally. */
export default function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>(() => [crypto.randomUUID()]);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setUuids(Array.from({ length: count }, () => crypto.randomUUID()));
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(uuids.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div class="tool-card">
      <div class="stat-row" style="align-items:flex-end;gap:1.25rem">
        <div class="field" style="margin:0">
          <label class="field-label" for="uc">How many · {count}</label>
          <input id="uc" type="range" min="1" max="50" value={count} style="width:220px"
            onInput={(e) => setCount(Number((e.target as HTMLInputElement).value))} />
        </div>
        <button class="btn btn-primary" onClick={generate}>Generate</button>
        <button class="btn btn-ghost" onClick={copyAll}>{copied ? 'Copied ✓' : 'Copy all'}</button>
      </div>
      <div class="result-box" style="margin-top:1.25rem">{uuids.join('\n')}</div>
    </div>
  );
}
