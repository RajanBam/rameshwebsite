import { useState, useMemo } from 'preact/hooks';

/** Base64 encoder / decoder. UTF-8 safe, runs locally. */
export default function Base64Tool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: '' };
    try {
      if (mode === 'encode') {
        return { output: btoa(unescape(encodeURIComponent(input))), error: '' };
      }
      return { output: decodeURIComponent(escape(atob(input.trim()))), error: '' };
    } catch {
      return { output: '', error: mode === 'decode' ? 'That is not valid Base64.' : 'Could not encode this text.' };
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
      <label class="field-label" for="b64">{mode === 'encode' ? 'Plain text' : 'Base64'}</label>
      <textarea
        id="b64"
        class="tool-textarea"
        style="min-height:130px"
        placeholder={mode === 'encode' ? 'Text to encode…' : 'Base64 to decode…'}
        value={input}
        spellcheck={false}
        onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
      />
      {error && <p class="tool-error">{error}</p>}
      {output && (
        <>
          <div class="copy-line">
            <label class="field-label" style="margin:0">{mode === 'encode' ? 'Base64' : 'Plain text'}</label>
            <button class="btn btn-ghost" style="padding:0.35rem 0.9rem" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <div class="result-box">{output}</div>
        </>
      )}
    </div>
  );
}
