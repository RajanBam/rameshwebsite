import { useState, useMemo } from 'preact/hooks';
import { downloadBlob } from '../../lib/format';

/** CSV to JSON and JSON to CSV. Runs entirely in the browser. */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

function csvToJson(text: string): string {
  const rows = parseCsv(text);
  if (rows.length < 1) return '[]';
  const [header, ...body] = rows;
  const out = body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
  return JSON.stringify(out, null, 2);
}

function jsonToCsv(text: string): string {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return '';
  const keys = Array.from(new Set(arr.flatMap((o) => Object.keys(o))));
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...arr.map((o) => keys.map((k) => esc(o[k])).join(','))].join('\n');
}

export default function CsvJson() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'csv2json' | 'json2csv'>('csv2json');
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      return { output: mode === 'csv2json' ? csvToJson(input) : jsonToCsv(input), error: '' };
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : 'Could not convert.' };
    }
  }, [input, mode]);

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const download = () => {
    if (!output) return;
    const isJson = mode === 'csv2json';
    downloadBlob(new Blob([output], { type: isJson ? 'application/json' : 'text/csv' }), isJson ? 'data.json' : 'data.csv');
  };

  return (
    <div class="tool-card">
      <div class="btn-row" style="margin:0 0 1rem">
        <button class={`btn ${mode === 'csv2json' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('csv2json')}>CSV to JSON</button>
        <button class={`btn ${mode === 'json2csv' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('json2csv')}>JSON to CSV</button>
      </div>
      <label class="field-label" for="cj">{mode === 'csv2json' ? 'CSV (first row = headers)' : 'JSON (array of objects)'}</label>
      <textarea id="cj" class="tool-textarea" value={input} spellcheck={false}
        placeholder={mode === 'csv2json' ? 'name,age\nAsha,30' : '[{"name":"Asha","age":30}]'}
        onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)} />
      {error && <p class="tool-error">{error}</p>}
      {output && (
        <>
          <div class="btn-row">
            <button class="btn btn-ghost" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
            <button class="btn btn-primary" onClick={download}>Download</button>
          </div>
          <textarea class="tool-textarea" style="margin-top:1rem" readonly value={output} spellcheck={false} />
        </>
      )}
    </div>
  );
}
