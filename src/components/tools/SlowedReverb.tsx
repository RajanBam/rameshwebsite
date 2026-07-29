import { useState, useRef, useEffect } from 'preact/hooks';
import { downloadBlob, formatBytes } from '../../lib/format';
import { decodeAudio, buildGraph, renderEffect, encodeMp3, type EffectSettings } from '../../lib/audioEffects';
import ProgressRing from '../ui/ProgressRing';

/** Slowed + Reverb / Nightcore maker. Web Audio does the effect; lamejs
 *  exports MP3. Everything runs in the browser, nothing uploaded. */
const PRESETS: { id: string; label: string; sub: string; s: EffectSettings }[] = [
  { id: 'slowreverb', label: 'Slowed + Reverb', sub: '0.85× · dreamy', s: { speed: 0.85, reverb: 0.4 } },
  { id: 'deep', label: 'Super Slowed', sub: '0.75× · deep', s: { speed: 0.75, reverb: 0.5 } },
  { id: 'nightcore', label: 'Nightcore', sub: '1.3× · bright', s: { speed: 1.3, reverb: 0.12 } },
  { id: 'spedup', label: 'Sped Up', sub: '1.15× · lively', s: { speed: 1.15, reverb: 0.08 } },
];

export default function SlowedReverb() {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [speed, setSpeed] = useState(0.85);
  const [reverb, setReverb] = useState(0.4);
  const [preset, setPreset] = useState('slowreverb');
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState('');
  const [progress, setProgress] = useState(-1);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  const bufRef = useRef<AudioBuffer | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ src: AudioBufferSourceNode; wet: GainNode; dry: GainNode } | null>(null);

  useEffect(() => () => { stopPreview(); ctxRef.current?.close().catch(() => {}); }, []);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setPreset(p.id); setSpeed(p.s.speed); setReverb(p.s.reverb);
    if (nodesRef.current) {
      nodesRef.current.src.playbackRate.value = p.s.speed;
      nodesRef.current.wet.gain.value = p.s.reverb;
      nodesRef.current.dry.gain.value = 1 - p.s.reverb * 0.45;
    }
  };

  const onSpeed = (v: number) => { setSpeed(v); setPreset('custom'); if (nodesRef.current) nodesRef.current.src.playbackRate.value = v; };
  const onReverb = (v: number) => {
    setReverb(v); setPreset('custom');
    if (nodesRef.current) { nodesRef.current.wet.gain.value = v; nodesRef.current.dry.gain.value = 1 - v * 0.45; }
  };

  const add = async (list: FileList | File[]) => {
    const aud = Array.from(list).find((f) => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name));
    if (!aud) return;
    stopPreview();
    setFile(aud); setResult(null); setError(''); setPhase('Reading audio…'); setProgress(0);
    try {
      bufRef.current = await decodeAudio(aud);
      setProgress(-1); setPhase('');
    } catch {
      setError('This audio could not be read. Try an MP3, WAV or M4A file.'); setProgress(-1); setPhase('');
    }
  };

  const stopPreview = () => {
    try { nodesRef.current?.src.stop(); } catch { /* already stopped */ }
    nodesRef.current = null;
    setPlaying(false);
  };

  const togglePreview = async () => {
    if (playing) { stopPreview(); return; }
    if (!bufRef.current) return;
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    await ctxRef.current.resume();
    const nodes = buildGraph(ctxRef.current, bufRef.current, { speed, reverb });
    nodes.src.onended = () => { if (nodesRef.current?.src === nodes.src) stopPreview(); };
    nodes.src.start(0);
    nodesRef.current = nodes;
    setPlaying(true);
  };

  const exportMp3 = async () => {
    if (!bufRef.current || !file) return;
    stopPreview();
    setError(''); setResult(null); setProgress(0); setPhase('Rendering effect…');
    try {
      const rendered = await renderEffect(bufRef.current, { speed, reverb });
      setPhase('Encoding MP3…');
      const blob = await encodeMp3(rendered, 192, (p) => setProgress(Math.round(p * 100)));
      const tag = preset === 'nightcore' || speed > 1 ? 'spedup' : 'slowed-reverb';
      setResult({ blob, name: file.name.replace(/\.[^.]+$/, '') + ` (${tag}).mp3` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the audio.');
    } finally {
      setPhase(''); setTimeout(() => setProgress(-1), 700);
    }
  };

  const busy = progress >= 0;

  return (
    <div class="tool-card">
      {busy && phase !== 'Reading audio…' ? (
        <ProgressRing value={progress} label={phase || undefined} sublabel="On your device" />
      ) : (
        <>
          <div class={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
            onClick={() => document.getElementById('sr-in')?.click()}>
            <div class="dz-title">{file ? file.name : 'Drop a song here'}</div>
            <div class="dz-hint">{file ? formatBytes(file.size) : 'MP3, WAV, M4A, FLAC'} · nothing uploaded</div>
            <input id="sr-in" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" style="display:none"
              onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
          </div>
          {phase === 'Reading audio…' && <p class="method-note" style="margin-top:0.75rem">Reading audio…</p>}

          {bufRef.current && (
            <>
              <div class="preset-row">
                {PRESETS.map((p) => (
                  <button key={p.id} class={`preset ${preset === p.id ? 'on' : ''}`} onClick={() => applyPreset(p)}>
                    <span class="pn">{p.label}</span><span class="ps">{p.sub}</span>
                  </button>
                ))}
              </div>

              <div class="field" style="margin-top:1.25rem">
                <label class="field-label">Speed · {speed.toFixed(2)}× {speed < 1 ? '(slower, deeper)' : speed > 1 ? '(faster, higher)' : ''}</label>
                <input type="range" min="0.5" max="1.5" step="0.01" value={speed} style="width:100%"
                  onInput={(e) => onSpeed(Number((e.target as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <label class="field-label">Reverb · {Math.round(reverb * 100)}%</label>
                <input type="range" min="0" max="1" step="0.01" value={reverb} style="width:100%"
                  onInput={(e) => onReverb(Number((e.target as HTMLInputElement).value))} />
              </div>

              <div class="btn-row">
                <button class="btn btn-ghost" onClick={togglePreview}>
                  {playing ? '⏸ Stop preview' : '▶ Preview'}
                </button>
                <button class="btn btn-primary" onClick={exportMp3}>Export MP3</button>
                <button class="btn btn-ghost" onClick={() => { stopPreview(); setFile(null); bufRef.current = null; setResult(null); }}>Clear</button>
              </div>
              <p class="method-note">Preview plays the effect live. Export renders the full track and downloads an MP3. Nothing is uploaded.</p>
            </>
          )}

          {error && <p class="tool-error">{error}</p>}

          {result && (
            <div class="result-box" style="margin-top:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-family:var(--font-sans)">
              <span>Ready · <strong>{formatBytes(result.blob.size)}</strong></span>
              <button class="btn btn-primary" onClick={() => downloadBlob(result.blob, result.name)}>Download MP3</button>
            </div>
          )}
        </>
      )}
      <style>{`
        .preset-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.6rem; margin-top:1.25rem; }
        .preset { display:flex; flex-direction:column; align-items:flex-start; gap:0.15rem; padding:0.7rem 0.9rem;
          background:#fff; border:1px solid var(--hairline); border-radius:var(--radius-sm); cursor:pointer; text-align:left;
          transition:border-color .15s var(--ease), box-shadow .15s var(--ease); }
        .preset.on { border-color:var(--blue); box-shadow:0 0 0 1px var(--blue); }
        .preset .pn { font-weight:600; font-size:var(--t-small); color:var(--ink); }
        .preset .ps { font-size:0.78rem; color:var(--dim); }
        .method-note { font-size:0.82rem; color:var(--dim); margin-top:0.75rem; line-height:1.5; }
      `}</style>
    </div>
  );
}
