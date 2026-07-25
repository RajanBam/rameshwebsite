import { useState, useMemo } from 'preact/hooks';

/** URL encoder / decoder. Component-safe, runs locally. */
export default function UrlEncoder() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: '' };
    try {
      return { output: mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input), error: '' };
    } catch {
      return { output: '', error: 'That text could not be decoded.' };
    }
  }, [input, mode]);

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div class="tool-card">
      <div class="btn-row" style="margin:0 0 1rem">
        <button class={`btn ${mode === 'encode' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('encode')}>Encode</button>
        <button class={`btn ${mode === 'decode' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('decode')}>Decode</button>
      </div>
      <label class="field-label" for="url">{mode === 'encode' ? 'Plain URL or text' : 'Encoded URL'}</label>
      <textarea
        id="url"
        class="tool-textarea"
        style="min-height:110px"
        placeholder={mode === 'encode' ? 'https://example.com/?q=hello world' : 'https%3A%2F%2Fexample.com'}
        value={input}
        spellcheck={false}
        onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
      />
      {error && <p class="tool-error">{error}</p>}
      {output && (
        <>
          <div class="copy-line">
            <label class="field-label" style="margin:0">Result</label>
            <button class="btn btn-ghost" style="padding:0.35rem 0.9rem" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <div class="result-box">{output}</div>
        </>
      )}
    </div>
  );
}
