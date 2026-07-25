/** ProgressRing — the green circular progress indicator shown while a tool
 *  is doing real work. Reused across every processing tool so the feedback
 *  feels consistent and reassuring: Working… → Finishing… → Done.
 *
 *  Pass a value 0–100. Pass `label` to override the auto phase text. */
interface Props {
  value: number;        // 0–100
  label?: string;       // overrides the auto phase text
  size?: number;        // px, default 132
  sublabel?: string;    // small line under the phase text
}

function phase(v: number): string {
  if (v >= 100) return 'Done';
  if (v >= 85) return 'Finishing…';
  if (v <= 0) return 'Starting…';
  return 'Working…';
}

export default function ProgressRing({ value, label, size = 132, sublabel }: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v / 100);
  const done = v >= 100;
  const text = label ?? phase(v);

  return (
    <div class="ring-wrap" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div class="ring" style={`width:${size}px;height:${size}px`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" stroke-width={stroke} />
          <circle
            class="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--green)"
            stroke-width={stroke}
            stroke-linecap="round"
            stroke-dasharray={c}
            stroke-dashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div class="ring-center">
          {done ? (
            <span class="ring-check" aria-hidden="true">✓</span>
          ) : (
            <span class="ring-pct num">{v}<i>%</i></span>
          )}
        </div>
      </div>
      <div class={`ring-label ${done ? 'is-done' : ''}`}>{text}</div>
      {sublabel && <div class="ring-sub">{sublabel}</div>}
    </div>
  );
}
