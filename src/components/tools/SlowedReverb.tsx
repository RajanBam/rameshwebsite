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
  const bars = Array.from({ length: 28 });

  return (
    <div class="tool-card sr-card">
      {busy && phase !== 'Reading audio…' ? (
        <ProgressRing value={progress} label={phase || undefined} sublabel="On your device" />
      ) : !bufRef.current ? (
        <>
          <div class={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
            onClick={() => document.getElementById('sr-in')?.click()}>
            <div class="dz-title">Drop a song here</div>
            <div class="dz-hint">MP3, WAV, M4A, FLAC · nothing uploaded</div>
            <input id="sr-in" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" style="display:none"
              onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
          </div>
          {phase === 'Reading audio…' && <p class="sr-reading">Reading audio…</p>}
          {error && <p class="tool-error">{error}</p>}
        </>
      ) : (
        <div class="deck">
          {/* header */}
          <div class="deck-top">
            <div class="deck-track">
              <span class="deck-eq-ico" aria-hidden="true">
                <i /><i /><i />
              </span>
              <div>
                <div class="deck-name">{file?.name}</div>
                <div class="deck-meta">{speed.toFixed(2)}× speed · {Math.round(reverb * 100)}% reverb</div>
              </div>
            </div>
            <button class="deck-x" title="Remove" onClick={() => { stopPreview(); setFile(null); bufRef.current = null; setResult(null); }}>✕</button>
          </div>

          {/* visualizer */}
          <div class={`viz ${playing ? 'is-playing' : ''}`} aria-hidden="true">
            {bars.map((_, i) => <span style={`--i:${i}`} />)}
          </div>

          {/* presets */}
          <div class="deck-presets">
            {PRESETS.map((p) => (
              <button key={p.id} class={`dpreset ${preset === p.id ? 'on' : ''}`} onClick={() => applyPreset(p)}>
                <span class="dpn">{p.label}</span><span class="dps">{p.sub}</span>
              </button>
            ))}
          </div>

          {/* sliders */}
          <div class="deck-slider">
            <div class="ds-head"><span>Speed</span><b class="num">{speed.toFixed(2)}×</b></div>
            <input type="range" min="0.5" max="1.5" step="0.01" value={speed}
              onInput={(e) => onSpeed(Number((e.target as HTMLInputElement).value))} />
            <div class="ds-scale"><span>slower · deeper</span><span>faster · higher</span></div>
          </div>
          <div class="deck-slider">
            <div class="ds-head"><span>Reverb</span><b class="num">{Math.round(reverb * 100)}%</b></div>
            <input type="range" min="0" max="1" step="0.01" value={reverb}
              onInput={(e) => onReverb(Number((e.target as HTMLInputElement).value))} />
            <div class="ds-scale"><span>dry</span><span>spacious</span></div>
          </div>

          {/* actions */}
          <div class="deck-actions">
            <button class={`deck-btn ghost ${playing ? 'on' : ''}`} onClick={togglePreview}>
              {playing ? '❚❚ Stop' : '▶ Preview'}
            </button>
            <button class="deck-btn solid" onClick={exportMp3}>Export MP3</button>
          </div>
          <p class="deck-note">Preview plays live; Export renders the full track to MP3. Everything stays on your device.</p>

          {error && <p class="tool-error">{error}</p>}
          {result && (
            <div class="deck-result">
              <span>Your version is ready · <b>{formatBytes(result.blob.size)}</b></span>
              <button class="deck-btn solid" onClick={() => downloadBlob(result.blob, result.name)}>Download MP3</button>
            </div>
          )}
        </div>
      )}
      <style>{`
        .sr-card { background: transparent; border: none; box-shadow: none; padding: 0; }
        .sr-reading { color: var(--dim); font-size: var(--t-small); margin-top: 0.75rem; }

        .deck {
          background: linear-gradient(165deg, #241938 0%, #120b1f 100%);
          border-radius: 24px; padding: 1.5rem clamp(1rem,3vw,1.75rem) 1.75rem; color: #f3eefb;
          box-shadow: 0 24px 60px rgba(40,10,80,0.28), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .deck-top { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
        .deck-track { display:flex; align-items:center; gap:0.85rem; min-width:0; }
        .deck-eq-ico { display:inline-flex; gap:3px; align-items:flex-end; height:26px; }
        .deck-eq-ico i { width:4px; background:#c4b5fd; border-radius:2px; height:60%; }
        .deck-eq-ico i:nth-child(1){ height:40%; } .deck-eq-ico i:nth-child(2){ height:90%; } .deck-eq-ico i:nth-child(3){ height:65%; }
        .deck-name { font-weight:600; font-size:0.98rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:min(60vw,340px); }
        .deck-meta { color:#b6a8d4; font-size:0.8rem; margin-top:0.15rem; font-variant-numeric:tabular-nums; }
        .deck-x { background:rgba(255,255,255,0.08); border:none; color:#d7ccf0; width:32px; height:32px; border-radius:50%; cursor:pointer; flex:none; }
        .deck-x:hover { background:rgba(255,255,255,0.16); }

        .viz { display:flex; align-items:center; justify-content:center; gap:3px; height:78px; margin:1.25rem 0; }
        .viz span { width:5px; height:14px; border-radius:3px; background:linear-gradient(#a78bfa,#7c3aed); opacity:0.55; }
        .viz.is-playing span { animation: bounce 900ms ease-in-out infinite; animation-delay: calc(var(--i) * -70ms); opacity:0.95; }
        @keyframes bounce { 0%,100%{ transform:scaleY(0.4);} 50%{ transform:scaleY(2.6);} }
        @media (prefers-reduced-motion: reduce){ .viz.is-playing span{ animation:none; } }

        .deck-presets { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:0.55rem; }
        .dpreset { display:flex; flex-direction:column; gap:0.1rem; padding:0.6rem 0.75rem; text-align:left; cursor:pointer;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:12px; transition:border-color .15s, background .15s; }
        .dpreset:hover { background:rgba(255,255,255,0.09); }
        .dpreset.on { border-color:#a78bfa; background:rgba(167,139,250,0.16); box-shadow:0 0 0 1px #a78bfa; }
        .dpn { font-weight:600; font-size:0.85rem; color:#f3eefb; }
        .dps { font-size:0.74rem; color:#b6a8d4; }

        .deck-slider { margin-top:1.25rem; }
        .ds-head { display:flex; justify-content:space-between; align-items:baseline; font-size:0.82rem; color:#cdc0ea; }
        .ds-head b { font-size:1.05rem; color:#fff; font-variant-numeric:tabular-nums; }
        .deck-slider input[type=range]{ width:100%; margin-top:0.4rem; accent-color:#a78bfa; }
        .ds-scale { display:flex; justify-content:space-between; color:#8f80b3; font-size:0.7rem; margin-top:0.25rem; }

        .deck-actions { display:flex; gap:0.7rem; margin-top:1.6rem; }
        .deck-btn { flex:1; border:none; border-radius:999px; padding:0.8rem 1rem; font-size:0.95rem; font-weight:600; cursor:pointer; transition:filter .15s, background .15s; }
        .deck-btn.solid { background:#7c3aed; color:#fff; } .deck-btn.solid:hover { filter:brightness(1.12); }
        .deck-btn.ghost { background:rgba(255,255,255,0.08); color:#f3eefb; } .deck-btn.ghost:hover { background:rgba(255,255,255,0.14); }
        .deck-btn.ghost.on { background:rgba(167,139,250,0.22); }
        .deck-note { color:#8f80b3; font-size:0.76rem; text-align:center; margin-top:0.9rem; }
        .deck-result { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;
          margin-top:1.25rem; padding:1rem 1.1rem; background:rgba(255,255,255,0.06); border-radius:14px; font-size:0.9rem; }
        .deck-result .deck-btn { flex:none; padding:0.6rem 1.2rem; }
        .deck .tool-error { color:#fca5a5; }
      `}</style>
    </div>
  );
}
