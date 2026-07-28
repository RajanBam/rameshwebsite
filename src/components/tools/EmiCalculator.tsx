import { useState, useMemo } from 'preact/hooks';
import { formatNpr } from '../../lib/nepal-tax';

/** EMI calculator — monthly payment, total interest, amortization. */
export default function EmiCalculator() {
  const [principal, setPrincipal] = useState(2000000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(15);

  const calc = useMemo(() => {
    const P = Math.max(0, principal);
    const r = rate / 100 / 12;
    const n = Math.max(1, Math.round(years * 12));
    const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - P;

    // Yearly amortization summary.
    const rows: { year: number; principalPaid: number; interestPaid: number; balance: number }[] = [];
    let balance = P;
    for (let y = 1; y <= years; y++) {
      let pPaid = 0, iPaid = 0;
      for (let m = 0; m < 12 && balance > 0.01; m++) {
        const i = balance * r;
        const p = Math.min(emi - i, balance);
        iPaid += i; pPaid += p; balance -= p;
      }
      rows.push({ year: y, principalPaid: pPaid, interestPaid: iPaid, balance: Math.max(0, balance) });
    }
    return { emi, total, interest, principal: P, rows };
  }, [principal, rate, years]);

  const num = (v: string) => Number(v.replace(/[^0-9.]/g, '')) || 0;
  const interestPct = calc.total > 0 ? Math.round((calc.interest / calc.total) * 100) : 0;

  return (
    <div class="tool-card">
      <div class="calc-layout">
        <div class="calc-inputs">
          <div class="field">
            <label class="field-label">Loan amount (Rs)</label>
            <input class="text-input num" inputMode="numeric" value={principal.toLocaleString('en-IN')}
              onInput={(e) => setPrincipal(num((e.target as HTMLInputElement).value))} />
          </div>
          <div class="two-col">
            <div class="field">
              <label class="field-label">Interest rate · {rate}% /yr</label>
              <input type="range" min="1" max="30" step="0.1" value={rate} style="width:100%"
                onInput={(e) => setRate(Number((e.target as HTMLInputElement).value))} />
            </div>
            <div class="field">
              <label class="field-label">Tenure · {years} yr</label>
              <input type="range" min="1" max="30" step="1" value={years} style="width:100%"
                onInput={(e) => setYears(Number((e.target as HTMLInputElement).value))} />
            </div>
          </div>

          <details class="sched">
            <summary>Yearly breakdown</summary>
            <table class="breakdown">
              <thead><tr><th>Year</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
              <tbody>
                {calc.rows.map((r) => (
                  <tr>
                    <td class="num">{r.year}</td>
                    <td class="num">{formatNpr(r.principalPaid)}</td>
                    <td class="num">{formatNpr(r.interestPaid)}</td>
                    <td class="num">{formatNpr(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        <aside class="result-panel">
          <div class="rp-label">Monthly EMI</div>
          <div class="rp-big num">{formatNpr(calc.emi)}<span class="rp-per">/mo</span></div>
          <div class="rp-tagsub">over {years} years · {rate}% p.a.</div>
          <div class="rp-divider" />
          <div class="rp-row"><span class="k">Principal</span><span class="v num">{formatNpr(calc.principal)}</span></div>
          <div class="rp-row"><span class="k">Total interest</span><span class="v warn num">{formatNpr(calc.interest)}</span></div>
          <div class="rp-row"><span class="k">Total payable</span><span class="v num">{formatNpr(calc.total)}</span></div>
          <div class="rp-bar">
            <i style={`width:${100 - interestPct}%;background:#3b82f6`} />
            <i style={`width:${interestPct}%;background:#fbbf24`} />
          </div>
          <div class="rp-tagsub">interest is {interestPct}% of what you pay</div>
          <div class="rp-foot"><span class="dot" />Calculated on your device</div>
        </aside>
      </div>

      <style>{`
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .sched { margin-top: 1.5rem; }
        .sched summary { cursor: pointer; color: var(--blue); font-size: var(--t-small); }
        .breakdown { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: var(--t-small); }
        .breakdown th { text-align: right; color: var(--dim); font-weight: 500; padding: 0.5rem; border-bottom: 1px solid var(--hairline); }
        .breakdown th:first-child { text-align: left; }
        .breakdown td { text-align: right; padding: 0.5rem; border-bottom: 1px solid var(--hairline); }
        .breakdown td:first-child { text-align: left; }
        @media (max-width: 520px) { .two-col { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
