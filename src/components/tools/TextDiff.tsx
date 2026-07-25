import { useState, useMemo } from 'preact/hooks';

/** Text diff — line-by-line comparison using an LCS diff. Local only. */
type Row = { type: 'same' | 'add' | 'del'; text: string };

function diffLines(a: string[], b: string[]): Row[] {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const rows: Row[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { rows.push({ type: 'same', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ type: 'del', text: a[i] }); i++; }
    else { rows.push({ type: 'add', text: b[j] }); j++; }
  }
  while (i < n) rows.push({ type: 'del', text: a[i++] });
  while (j < m) rows.push({ type: 'add', text: b[j++] });
  return rows;
}

export default function TextDiff() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');

  const { rows, added, removed } = useMemo(() => {
    if (!left && !right) return { rows: [] as Row[], added: 0, removed: 0 };
    const r = diffLines(left.split('\n'), right.split('\n'));
    return { rows: r, added: r.filter((x) => x.type === 'add').length, removed: r.filter((x) => x.type === 'del').length };
  }, [left, right]);

  return (
    <div class="tool-card">
      <div class="field-grid">
        <div>
          <label class="field-label" for="dl">Original</label>
          <textarea id="dl" class="tool-textarea" style="min-height:150px" value={left} spellcheck={false}
            onInput={(e) => setLeft((e.target as HTMLTextAreaElement).value)} placeholder="Paste the original text…" />
        </div>
        <div>
          <label class="field-label" for="dr">Changed</label>
          <textarea id="dr" class="tool-textarea" style="min-height:150px" value={right} spellcheck={false}
            onInput={(e) => setRight((e.target as HTMLTextAreaElement).value)} placeholder="Paste the changed text…" />
        </div>
      </div>
      {rows.length > 0 && (
        <>
          <div class="stat-row" style="margin-top:1.25rem">
            <div class="stat"><div class="stat-val" style="color:var(--green)">+{added}</div><div class="stat-label">added</div></div>
            <div class="stat"><div class="stat-val" style="color:#c22">−{removed}</div><div class="stat-label">removed</div></div>
          </div>
          <div class="result-box" style="margin-top:1rem;padding:0">
            {rows.map((r, k) => (
              <div key={k} style={`padding:0.15rem 0.75rem;${r.type === 'add' ? 'background:rgba(0,138,92,0.10)' : r.type === 'del' ? 'background:rgba(200,40,40,0.10)' : ''}`}>
                <span style="color:var(--dim);user-select:none">{r.type === 'add' ? '+ ' : r.type === 'del' ? '− ' : '  '}</span>
                {r.text || ' '}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
