import { useState, useMemo } from 'preact/hooks';
import { computeTax, formatNpr, type Status } from '../../lib/nepal-tax';

/** Nepal Income Tax calculator — FY 2082/83. Pure client-side math. */
export default function NepalIncomeTax() {
  const [period, setPeriod] = useState<'annual' | 'monthly'>('monthly');
  const [status, setStatus] = useState<Status>('individual');
  const [income, setIncome] = useState(50000);
  const [retirement, setRetirement] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [ssfMember, setSsfMember] = useState(false);

  const grossAnnual = period === 'monthly' ? income * 12 : income;

  const result = useMemo(
    () => computeTax({ grossAnnual, status, retirement, insurance, ssfMember }),
    [grossAnnual, status, retirement, insurance, ssfMember],
  );

  const num = (v: string) => Number(v.replace(/[^0-9.]/g, '')) || 0;

  return (
    <div class="tool-card">
      <div class="seg-row">
        <div class="seg">
          <button class={period === 'monthly' ? 'on' : ''} onClick={() => setPeriod('monthly')}>Monthly</button>
          <button class={period === 'annual' ? 'on' : ''} onClick={() => setPeriod('annual')}>Annual</button>
        </div>
        <div class="seg">
          <button class={status === 'individual' ? 'on' : ''} onClick={() => setStatus('individual')}>Individual</button>
          <button class={status === 'couple' ? 'on' : ''} onClick={() => setStatus('couple')}>Couple</button>
        </div>
      </div>

      <div class="field">
        <label class="field-label">{period === 'monthly' ? 'Monthly' : 'Annual'} income (Rs)</label>
        <input class="text-input num" inputMode="numeric" value={income.toLocaleString('en-IN')}
          onInput={(e) => setIncome(num((e.target as HTMLInputElement).value))} />
      </div>

      <div class="two-col">
        <div class="field">
          <label class="field-label">Retirement fund / yr (SSF·EPF·CIT)</label>
          <input class="text-input num" inputMode="numeric" value={retirement.toLocaleString('en-IN')}
            onInput={(e) => setRetirement(num((e.target as HTMLInputElement).value))} />
        </div>
        <div class="field">
          <label class="field-label">Insurance / yr (life + health)</label>
          <input class="text-input num" inputMode="numeric" value={insurance.toLocaleString('en-IN')}
            onInput={(e) => setInsurance(num((e.target as HTMLInputElement).value))} />
        </div>
      </div>

      <label class="check">
        <input type="checkbox" checked={ssfMember} onChange={(e) => setSsfMember((e.target as HTMLInputElement).checked)} />
        I contribute to the Social Security Fund (SSF) — waives the 1% social security tax
      </label>

      <div class="result-head">
        <div>
          <div class="rh-label">Tax payable · FY 2082/83</div>
          <div class="rh-big num">{formatNpr(result.totalTax)}<span class="rh-per">/yr</span></div>
          <div class="rh-sub num">{formatNpr(result.totalTax / 12)}/mo · effective {(result.effectiveRate * 100).toFixed(1)}%</div>
        </div>
        <div class="rh-take">
          <div class="rh-label">Take-home</div>
          <div class="rh-take-val num">{formatNpr(result.takeHome)}</div>
        </div>
      </div>

      <table class="breakdown">
        <thead><tr><th>Slab</th><th>Rate</th><th>Taxable</th><th>Tax</th></tr></thead>
        <tbody>
          {result.bands.map((b) => (
            <tr>
              <td>{b.label}</td>
              <td class="num">{(b.rate * 100).toFixed(0)}%</td>
              <td class="num">{formatNpr(b.taxable)}</td>
              <td class="num">{formatNpr(b.tax)}</td>
            </tr>
          ))}
          {result.deductions > 0 && (
            <tr class="muted"><td colSpan={3}>Deductions applied</td><td class="num">−{formatNpr(result.deductions)}</td></tr>
          )}
          <tr class="total"><td colSpan={3}>Total tax</td><td class="num">{formatNpr(result.totalTax)}</td></tr>
        </tbody>
      </table>

      <p class="note">Taxable income after deductions: <span class="num">{formatNpr(result.taxableIncome)}</span>. Estimate for resident individuals on employment income; verify with a tax professional for your exact situation.</p>

      <style>{`
        .seg-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; }
        .seg { display: inline-flex; background: var(--gray); border-radius: 10px; padding: 3px; }
        .seg button { border: none; background: none; padding: 0.45rem 0.9rem; border-radius: 8px; font-size: var(--t-small); color: var(--dim); }
        .seg button.on { background: #fff; color: var(--ink); box-shadow: var(--shadow-card); font-weight: 500; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .check { display: flex; align-items: flex-start; gap: 0.5rem; font-size: var(--t-small); color: var(--dim); margin: 0.5rem 0 1.5rem; }
        .check input { margin-top: 0.2rem; }
        .result-head { display: flex; flex-wrap: wrap; gap: 1.5rem; justify-content: space-between; align-items: flex-end;
          background: var(--gray); border-radius: var(--radius-sm); padding: 1.25rem 1.5rem; }
        .rh-label { font-size: var(--t-small); color: var(--dim); }
        .rh-big { font-size: clamp(2rem, 6vw, 2.75rem); font-weight: 500; color: var(--ink); line-height: 1.1; }
        .rh-per { font-size: 1rem; color: var(--dim); margin-left: 0.25rem; }
        .rh-sub { font-size: var(--t-small); color: var(--dim); margin-top: 0.25rem; }
        .rh-take { text-align: right; }
        .rh-take-val { font-size: 1.5rem; font-weight: 500; color: var(--green); }
        .breakdown { width: 100%; border-collapse: collapse; margin-top: 1.5rem; font-size: var(--t-small); }
        .breakdown th { text-align: right; color: var(--dim); font-weight: 500; padding: 0.5rem 0.5rem; border-bottom: 1px solid var(--hairline); }
        .breakdown th:first-child { text-align: left; }
        .breakdown td { text-align: right; padding: 0.5rem; border-bottom: 1px solid var(--hairline); }
        .breakdown td:first-child { text-align: left; color: var(--ink); }
        .breakdown .muted td { color: var(--dim); }
        .breakdown .total td { font-weight: 600; color: var(--ink); border-bottom: none; }
        .note { font-size: var(--t-small); color: var(--dim); margin-top: 1rem; }
        @media (max-width: 520px) { .two-col { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
