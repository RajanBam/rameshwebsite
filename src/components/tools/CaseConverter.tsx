import { useState } from 'preact/hooks';

/** Text case converter — sentence, title, upper, lower, camel, snake, kebab. */
type Mode = 'sentence' | 'title' | 'upper' | 'lower' | 'camel' | 'snake' | 'kebab';

const MODES: { id: Mode; label: string }[] = [
  { id: 'sentence', label: 'Sentence case' },
  { id: 'title', label: 'Title Case' },
  { id: 'upper', label: 'UPPERCASE' },
  { id: 'lower', label: 'lowercase' },
  { id: 'camel', label: 'camelCase' },
  { id: 'snake', label: 'snake_case' },
  { id: 'kebab', label: 'kebab-case' },
];

function convert(text: string, mode: Mode): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  switch (mode) {
    case 'upper': return text.toUpperCase();
    case 'lower': return text.toLowerCase();
    case 'sentence':
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
    case 'title':
      return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    case 'camel':
      return words.map((w, i) =>
        i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    case 'snake':
      return words.map((w) => w.toLowerCase()).join('_');
    case 'kebab':
      return words.map((w) => w.toLowerCase()).join('-');
  }
}

export default function CaseConverter() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState<Mode | null>(null);

  const copy = async (mode: Mode) => {
    await navigator.clipboard.writeText(convert(text, mode));
    setCopied(mode);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div class="tool-card">
      <label class="field-label" for="cc">Your text</label>
      <textarea
        id="cc"
        class="tool-textarea"
        style="min-height:120px"
        placeholder="Type or paste text to convert…"
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
      />
      {text.trim() && (
        <div style="margin-top:1.25rem;display:flex;flex-direction:column;gap:0.6rem">
          {MODES.map((m) => (
            <div class="file-row" key={m.id} style="margin:0">
              <span class="fr-meta" style="width:120px;flex:none">{m.label}</span>
              <span class="fr-name">{convert(text, m.id)}</span>
              <button class="btn btn-ghost" style="padding:0.35rem 0.9rem" onClick={() => copy(m.id)}>
                {copied === m.id ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
