import { useState, useEffect } from 'preact/hooks';

/** Unix timestamp ⇄ human date converter. Local timezone + UTC. */
export default function TimestampConverter() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [ts, setTs] = useState(String(Math.floor(Date.now() / 1000)));
  const [human, setHuman] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = ts.length > 10 ? Number(ts) / 1000 : Number(ts);
  const valid = ts.trim() !== '' && !Number.isNaN(seconds);
  const date = valid ? new Date(seconds * 1000) : null;

  const fromHuman = (v: string) => {
    setHuman(v);
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) setTs(String(Math.floor(d.getTime() / 1000)));
  };

  return (
    <div class="tool-card">
      <div class="stat-row" style="margin:0 0 1.25rem">
        <div class="stat"><div class="stat-val">{now}</div><div class="stat-label">current unix time</div></div>
      </div>

      <div class="field">
        <label class="field-label" for="ts">Unix timestamp (seconds or milliseconds)</label>
        <input id="ts" class="text-input" value={ts} inputMode="numeric"
          onInput={(e) => setTs((e.target as HTMLInputElement).value)} placeholder="1700000000" />
      </div>

      {date && (
        <div class="result-box" style="font-family:var(--font-sans)">
          <div><strong>Local:</strong> {date.toLocaleString()}</div>
          <div style="margin-top:0.4rem"><strong>UTC:</strong> {date.toUTCString()}</div>
          <div style="margin-top:0.4rem"><strong>ISO 8601:</strong> {date.toISOString()}</div>
        </div>
      )}

      <div class="field" style="margin-top:1.25rem">
        <label class="field-label" for="hu">Or pick a date and time</label>
        <input id="hu" class="text-input" type="datetime-local" value={human}
          onInput={(e) => fromHuman((e.target as HTMLInputElement).value)} />
      </div>
    </div>
  );
}
