import { useState, useRef } from 'preact/hooks';
import { downloadBlob, formatBytes } from '../../lib/format';
import { decodeAudio, concatBuffers, encodeMp3 } from '../../lib/audioEffects';
import ProgressRing from '../ui/ProgressRing';

/** Audio Joiner / Merger. Add clips, reorder, and export one combined MP3. */
interface Clip { id: number; file: File; buffer: AudioBuffer; }
let nextId = 1;

export default function AudioJoiner() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob } | null>(null);
  const dragId = useRef<number | null>(null);

  const add = async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name));
    if (!files.length) return;
    setError(''); setResult(null); setPhase('Reading audio…'); setProgress(0);
    try {
      const added: Clip[] = [];
      for (const f of files) added.push({ id: nextId++, file: f, buffer: await decodeAudio(f) });
      setClips((c) => [...c, ...added]);
    } catch {
      setError('One of those files could not be read. Try MP3, WAV or M4A.');
    } finally {
      setProgress(-1); setPhase('');
    }
  };

  const remove = (id: number) => setClips((c) => c.filter((x) => x.id !== id));
  const move = (id: number, dir: -1 | 1) => setClips((c) => {
    const i = c.findIndex((x) => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= c.length) return c;
    const n = [...c]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const join = async () => {
    if (clips.length < 1) return;
    setError(''); setResult(null); setProgress(0); setPhase('Joining…');
    try {
      const merged = concatBuffers(clips.map((c) => c.buffer));
      setPhase('Encoding MP3…');
      const blob = await encodeMp3(merged, 192, (p) => setProgress(Math.round(p * 100)));
      setResult({ blob });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join these files.');
    } finally {
      setPhase(''); setTimeout(() => setProgress(-1), 600);
    }
  };

  const busy = progress >= 0 && phase !== 'Reading audio…';
  const totalDur = clips.reduce((n, c) => n + c.buffer.duration, 0);

  return (
    <div class="tool-card sr-card">
      {busy ? (
        <ProgressRing value={progress} label={phase || undefined} sublabel="On your device" />
      ) : (
        <div class={clips.length ? 'deck' : ''}>
          <div class={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
            onClick={() => document.getElementById('aj-in')?.click()}
            style={clips.length ? 'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.15)' : ''}>
            <div class="dz-title" style={clips.length ? 'color:#f3eefb' : ''}>Add audio files</div>
            <div class="dz-hint" style={clips.length ? 'color:#b6a8d4' : ''}>drop or click · they play in the order below · nothing uploaded</div>
            <input id="aj-in" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" multiple style="display:none"
              onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
          </div>
          {phase === 'Reading audio…' && <p class="sr-reading">Reading audio…</p>}

          {clips.length > 0 && (
            <>
              <ul class="join-list">
                {clips.map((c, i) => (
                  <li key={c.id} class="join-row"
                    draggable
                    onDragStart={() => { dragId.current = c.id; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragId.current != null && dragId.current !== c.id) {
                      setClips((cs) => { const from = cs.findIndex((x) => x.id === dragId.current); const to = cs.findIndex((x) => x.id === c.id);
                        const n = [...cs]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; }); } dragId.current = null; }}>
                    <span class="jr-n">{i + 1}</span>
                    <span class="jr-name">{c.file.name}</span>
                    <span class="jr-dur">{c.buffer.duration.toFixed(1)}s</span>
                    <button class="jr-btn" title="Move up" onClick={() => move(c.id, -1)} disabled={i === 0}>↑</button>
                    <button class="jr-btn" title="Move down" onClick={() => move(c.id, 1)} disabled={i === clips.length - 1}>↓</button>
                    <button class="jr-btn" title="Remove" onClick={() => remove(c.id)}>✕</button>
                  </li>
                ))}
              </ul>
              <div class="deck-meta" style="margin-top:0.75rem">{clips.length} clips · {totalDur.toFixed(1)}s total</div>
              <div class="deck-actions">
                <button class="deck-btn solid" onClick={join} disabled={clips.length < 1}>Join &amp; export MP3</button>
                <button class="deck-btn ghost" onClick={() => { setClips([]); setResult(null); }}>Clear all</button>
              </div>
              <p class="deck-note">Drag rows to reorder. Everything is merged on your device.</p>
            </>
          )}

          {error && <p class="tool-error">{error}</p>}
          {result && (
            <div class="deck-result">
              <span>Merged track ready · <b>{formatBytes(result.blob.size)}</b></span>
              <button class="deck-btn solid" onClick={() => downloadBlob(result.blob, 'joined.mp3')}>Download MP3</button>
            </div>
          )}
        </div>
      )}
      <style>{`
        .join-list { list-style:none; margin:1.1rem 0 0; padding:0; display:flex; flex-direction:column; gap:0.5rem; }
        .join-row { display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.75rem; background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08); border-radius:12px; cursor:grab; }
        .jr-n { width:22px; height:22px; flex:none; display:grid; place-items:center; border-radius:50%; background:rgba(167,139,250,0.25); color:#ddd0ff; font-size:0.75rem; font-weight:600; }
        .jr-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.88rem; }
        .jr-dur { color:#b6a8d4; font-size:0.78rem; font-variant-numeric:tabular-nums; }
        .jr-btn { background:rgba(255,255,255,0.08); border:none; color:#e6ddf7; width:28px; height:28px; border-radius:8px; cursor:pointer; }
        .jr-btn:hover:not(:disabled) { background:rgba(255,255,255,0.16); }
        .jr-btn:disabled { opacity:0.3; cursor:not-allowed; }
      `}</style>
    </div>
  );
}
