import { useState, useMemo } from 'preact/hooks';

/** Lorem Ipsum generator — placeholder text by paragraphs, sentences or words. */
const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ' +
  'ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate ' +
  'velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa ' +
  'qui officia deserunt mollit anim id est laborum').split(' ');

const rand = (n: number) => Math.floor(Math.random() * n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function sentence(): string {
  const len = 8 + rand(10);
  const parts = Array.from({ length: len }, () => WORDS[rand(WORDS.length)]);
  return cap(parts.join(' ')) + '.';
}
function paragraph(): string {
  return Array.from({ length: 3 + rand(3) }, sentence).join(' ');
}

export default function LoremIpsum() {
  const [unit, setUnit] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs');
  const [count, setCount] = useState(3);
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    void seed;
    if (unit === 'paragraphs') return Array.from({ length: count }, paragraph).join('\n\n');
    if (unit === 'sentences') return Array.from({ length: count }, sentence).join(' ');
    return cap(Array.from({ length: count }, () => WORDS[rand(WORDS.length)]).join(' ')) + '.';
  }, [unit, count, seed]);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div class="tool-card">
      <div class="stat-row" style="align-items:flex-end;gap:1.25rem">
        <div class="field" style="margin:0">
          <label class="field-label" for="lu">Unit</label>
          <select id="lu" class="select-input" value={unit} onChange={(e) => setUnit((e.target as HTMLSelectElement).value as any)}>
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
        </div>
        <div class="field" style="margin:0">
          <label class="field-label" for="lc">Count · {count}</label>
          <input id="lc" type="range" min="1" max="20" value={count} style="width:180px"
            onInput={(e) => setCount(Number((e.target as HTMLInputElement).value))} />
        </div>
        <button class="btn btn-primary" onClick={() => setSeed((s) => s + 1)}>Regenerate</button>
        <button class="btn btn-ghost" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <div class="result-box" style="margin-top:1.25rem;font-family:var(--font-sans);line-height:1.6">{text}</div>
    </div>
  );
}
