import { useState, useMemo } from 'preact/hooks';

/** JSON Formatter / Validator / Minifier — runs entirely in the browser. */
export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      const parsed = JSON.parse(input);
      return { output: JSON.stringify(parsed, null, indent), error: '' };
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : 'Invalid JSON' };
    }
  }, [input, indent]);

  const minify = () => {
    try {
      setInput(JSON.stringify(JSON.parse(input)));
    } catch {
      /* leave input; error already shown */
    }
  };

  const format = () => {
    if (output) setInput(output);
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const valid = !!input.trim() && !error;

  return (
    <div class="tool-card">
      <label class="field-label" for="json-in">Your JSON</label>
      <textarea
        id="json-in"
        class="tool-textarea"
        placeholder='Paste JSON here, e.g. {"hello":"world"}'
        value={input}
        onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        spellcheck={false}
      />

      {error && <p class="tool-error">✗ {error}</p>}
      {valid && (
        <p class="trust" style="margin-top:0.75rem"><span class="dot" />Valid JSON</p>
      )}

      <div class="btn-row">
        <label class="field-label" style="margin:0;align-self:center">Indent</label>
        <select
          class="select-input"
          style="width:auto"
          value={String(indent)}
          onChange={(e) => setIndent(Number((e.target as HTMLSelectElement).value))}
        >
          <option value="2">2 spaces</option>
          <option value="4">4 spaces</option>
          <option value="0">Tab</option>
        </select>
        <button class="btn btn-primary" onClick={format} disabled={!valid}>Format</button>
        <button class="btn btn-ghost" onClick={minify} disabled={!valid}>Minify</button>
        <button class="btn btn-ghost" onClick={copy} disabled={!valid}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      {output && (
        <>
          <label class="field-label" style="margin-top:1.5rem">Result</label>
          <textarea class="tool-textarea" readonly value={output} spellcheck={false} />
        </>
      )}
    </div>
  );
}
