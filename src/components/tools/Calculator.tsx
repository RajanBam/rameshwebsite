import { useState, useEffect } from 'preact/hooks';

/** Apple-style calculator. Faithful iOS look and behaviour, fully live,
 *  keyboard-enabled. Pure client-side arithmetic. */
type Op = '+' | '−' | '×' | '÷';

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
  }
}

function fmt(n: number): string {
  if (!isFinite(n)) return 'Error';
  const s = Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-6 && n !== 0)
    ? n.toExponential(6)
    : String(Math.round(n * 1e10) / 1e10);
  return s;
}

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d: string) => {
    setDisplay((cur) => {
      if (fresh) { setFresh(false); return d === '.' ? '0.' : d; }
      if (d === '.') return cur.includes('.') ? cur : cur + '.';
      if (cur === '0') return d;
      return cur.length < 12 ? cur + d : cur;
    });
  };

  const applyOp = (next: Op) => {
    const cur = parseFloat(display);
    if (acc === null) setAcc(cur);
    else if (!fresh) { const r = compute(acc, cur, op!); setAcc(r); setDisplay(fmt(r)); }
    setOp(next); setFresh(true);
  };

  const equals = () => {
    if (op === null || acc === null) return;
    const cur = parseFloat(display);
    const r = compute(acc, cur, op);
    setDisplay(fmt(r)); setAcc(null); setOp(null); setFresh(true);
  };

  const clear = () => { setDisplay('0'); setAcc(null); setOp(null); setFresh(true); };
  const negate = () => setDisplay((c) => (parseFloat(c) === 0 ? c : fmt(parseFloat(c) * -1)));
  const percent = () => setDisplay((c) => fmt(parseFloat(c) / 100));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/[0-9]/.test(k)) inputDigit(k);
      else if (k === '.') inputDigit('.');
      else if (k === '+') applyOp('+');
      else if (k === '-') applyOp('−');
      else if (k === '*') applyOp('×');
      else if (k === '/') { e.preventDefault(); applyOp('÷'); }
      else if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); }
      else if (k === 'Escape') clear();
      else if (k === '%') percent();
      else if (k === 'Backspace') setDisplay((c) => (c.length > 1 ? c.slice(0, -1) : '0'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const KEY = (label: string, cls: string, onClick: () => void, wide = false) => (
    <button class={`ck ${cls} ${wide ? 'wide' : ''} ${op && ['+', '−', '×', '÷'].includes(label) && fresh && !wide ? 'active' : ''}`} onClick={onClick}>{label}</button>
  );

  return (
    <div class="tool-card calc-wrap">
      <div class="calc">
        <div class="calc-display"><span>{display}</span></div>
        <div class="calc-keys">
          {KEY(acc === null && fresh && display === '0' ? 'AC' : 'C', 'fn', clear)}
          {KEY('±', 'fn', negate)}
          {KEY('%', 'fn', percent)}
          {KEY('÷', 'op', () => applyOp('÷'))}
          {KEY('7', 'num', () => inputDigit('7'))}
          {KEY('8', 'num', () => inputDigit('8'))}
          {KEY('9', 'num', () => inputDigit('9'))}
          {KEY('×', 'op', () => applyOp('×'))}
          {KEY('4', 'num', () => inputDigit('4'))}
          {KEY('5', 'num', () => inputDigit('5'))}
          {KEY('6', 'num', () => inputDigit('6'))}
          {KEY('−', 'op', () => applyOp('−'))}
          {KEY('1', 'num', () => inputDigit('1'))}
          {KEY('2', 'num', () => inputDigit('2'))}
          {KEY('3', 'num', () => inputDigit('3'))}
          {KEY('+', 'op', () => applyOp('+'))}
          {KEY('0', 'num zero', () => inputDigit('0'))}
          {KEY('.', 'num', () => inputDigit('.'))}
          {KEY('=', 'op', equals)}
        </div>
        <p class="calc-hint">Tip: your keyboard works too. Numbers, + − * /, Enter, Esc.</p>
      </div>
      <style>{`
        .calc-wrap { display:flex; justify-content:center; background:transparent; border:none; box-shadow:none; padding:0; }
        .calc { width:min(340px,100%); background:#000; border-radius:28px; padding:1.25rem 1rem 1.5rem; box-shadow:0 20px 50px rgba(0,0,0,0.35); }
        .calc-display { text-align:right; color:#fff; font-weight:300; font-size:3.4rem; line-height:1.1; padding:1.5rem 0.75rem 1rem; min-height:5rem; overflow:hidden; font-variant-numeric:tabular-nums; letter-spacing:-0.02em; }
        .calc-keys { display:grid; grid-template-columns:repeat(4,1fr); gap:0.7rem; }
        .ck { height:70px; border:none; border-radius:50%; font-size:1.7rem; font-weight:400; cursor:pointer; transition:filter .12s ease, transform .06s ease; color:#fff; }
        .ck:active { transform:scale(0.94); }
        .ck.num { background:#333; }
        .ck.num:hover { filter:brightness(1.3); }
        .ck.fn { background:#a5a5a5; color:#000; font-weight:500; }
        .ck.fn:hover { filter:brightness(1.08); }
        .ck.op { background:#ff9f0a; font-size:2rem; }
        .ck.op:hover { filter:brightness(1.1); }
        .ck.op.active { background:#fff; color:#ff9f0a; }
        .ck.zero { grid-column:span 2; border-radius:40px; text-align:left; padding-left:1.75rem; }
        .calc-hint { color:#8e8e93; font-size:0.78rem; text-align:center; margin-top:1.1rem; }
        @media (max-width:400px){ .ck{ height:62px; font-size:1.5rem; } .calc-display{ font-size:2.8rem; } }
      `}</style>
    </div>
  );
}
