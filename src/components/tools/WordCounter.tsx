import { useState, useMemo } from 'preact/hooks';

/** Word & character counter. Counts as you type, entirely on-device. */
export default function WordCounter() {
  const [text, setText] = useState('');

  const s = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const sentences = trimmed ? (trimmed.match(/[.!?]+(\s|$)/g) || []).length || 1 : 0;
    const paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter((p) => p.trim()).length : 0;
    const readMins = Math.max(1, Math.round(words / 200));
    return {
      words,
      chars: text.length,
      charsNoSpace: text.replace(/\s/g, '').length,
      sentences,
      paragraphs,
      readMins,
    };
  }, [text]);

  return (
    <div class="tool-card">
      <label class="field-label" for="wc">Your text</label>
      <textarea
        id="wc"
        class="tool-textarea"
        placeholder="Start typing or paste your text…"
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
      />
      <div class="stat-row" style="margin-top:1.25rem">
        <div class="stat"><div class="stat-val">{s.words}</div><div class="stat-label">words</div></div>
        <div class="stat"><div class="stat-val">{s.chars}</div><div class="stat-label">characters</div></div>
        <div class="stat"><div class="stat-val">{s.charsNoSpace}</div><div class="stat-label">no spaces</div></div>
        <div class="stat"><div class="stat-val">{s.sentences}</div><div class="stat-label">sentences</div></div>
        <div class="stat"><div class="stat-val">{s.paragraphs}</div><div class="stat-label">paragraphs</div></div>
        <div class="stat"><div class="stat-val">{s.readMins}</div><div class="stat-label">min read</div></div>
      </div>
    </div>
  );
}
