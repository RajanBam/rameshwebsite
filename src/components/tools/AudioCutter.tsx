import { useState, useRef, useEffect } from 'preact/hooks';
import { downloadBlob, formatBytes } from '../../lib/format';
import { decodeAudio, sliceBuffer, encodeMp3 } from '../../lib/audioEffects';
import ProgressRing from '../ui/ProgressRing';

/** Audio Cutter / Trimmer. Draw the waveform, drag two handles to select a
 *  region, preview it, and export a trimmed MP3. All in the browser. */
function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioCutter() {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const stopT = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => () => { stopPreview(); ctxRef.current?.close().catch(() => {}); }, []);

  const drawWave = (buf: AudioBuffer) => {
    const c = canvasRef.current; if (!c) return;
    const w = c.width, h = c.height;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    const data = buf.getChannelData(0);
    const step = Math.floor(data.length / w) || 1;
    ctx.fillStyle = '#c4b5fd';
    for (let x = 0; x < w; x++) {
      let min = 1, max = -1;
      for (let i = 0; i < step; i++) { const v = data[x * step + i] || 0; if (v < min) min = v; if (v > max) max = v; }
      ctx.fillRect(x, (1 + min) * h / 2, 1, Math.max(1, (max - min) * h / 2));
    }
  };

  const add = async (list: FileList | File[]) => {
    const aud = Array.from(list).find((f) => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name));
    if (!aud) return;
    stopPreview();
    setFile(aud); setResult(null); setError(''); setReading(true);
    try {
      const buf = await decodeAudio(aud);
      bufRef.current = buf;
      setDuration(buf.duration); setStart(0); setEnd(buf.duration);
      setReading(false);
      requestAnimationFrame(() => drawWave(buf));
    } catch {
      setError('This audio could not be read. Try an MP3, WAV or M4A file.'); setReading(false);
    }
  };

  const stopPreview = () => {
    if (stopT.current) { clearTimeout(stopT.current); stopT.current = null; }
    try { srcRef.current?.stop(); } catch { /* noop */ }
    srcRef.current = null; setPlaying(false);
  };

  const previewSelection = async () => {
    if (playing) { stopPreview(); return; }
    if (!bufRef.current) return;
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    await ctxRef.current.resume();
    const src = ctxRef.current.createBufferSource();
    src.buffer = bufRef.current;
    src.connect(ctxRef.current.destination);
    src.start(0, start, Math.max(0.05, end - start));
    src.onended = () => { if (srcRef.current === src) stopPreview(); };
    srcRef.current = src; setPlaying(true);
  };

  const exportClip = async () => {
    if (!bufRef.current || !file || end <= start) return;
    stopPreview();
    setError(''); setResult(null); setProgress(0); setPhase('Trimming…');
    try {
      const clip = sliceBuffer(bufRef.current, start, end);
      setPhase('Encoding MP3…');
      const blob = await encodeMp3(clip, 192, (p) => setProgress(Math.round(p * 100)));
      setResult({ blob, name: file.name.replace(/\.[^.]+$/, '') + ' (cut).mp3' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the clip.');
    } finally {
      setPhase(''); setTimeout(() => setProgress(-1), 600);
    }
  };

  const busy = progress >= 0;
  const clip = Math.max(0, end - start);

  return (
    <div class="tool-card sr-card">
      {busy ? (
        <ProgressRing value={progress} label={phase || undefined} sublabel="On your device" />
      ) : !bufRef.current ? (
        <>
          <div class={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
            onClick={() => document.getElementById('ac-in')?.click()}>
            <div class="dz-title">Drop a song here</div>
            <div class="dz-hint">MP3, WAV, M4A, FLAC · nothing uploaded</div>
            <input id="ac-in" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" style="display:none"
              onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
          </div>
          {reading && <p class="sr-reading">Reading audio…</p>}
          {error && <p class="tool-error">{error}</p>}
        </>
      ) : (
        <div class="deck">
          <div class="deck-top">
            <div class="deck-track">
              <div>
                <div class="deck-name">{file?.name}</div>
                <div class="deck-meta">Selection {fmtTime(start)} – {fmtTime(end)} · {clip.toFixed(1)}s</div>
              </div>
            </div>
            <button class="deck-x" title="Remove" onClick={() => { stopPreview(); setFile(null); bufRef.current = null; setResult(null); }}>✕</button>
          </div>

          <canvas ref={canvasRef} width={760} height={110} class="wave" />

          <div class="deck-slider">
            <div class="ds-head"><span>Start</span><b class="num">{fmtTime(start)}</b></div>
            <input type="range" min="0" max={duration} step="0.05" value={start}
              onInput={(e) => { const v = Math.min(Number((e.target as HTMLInputElement).value), end - 0.1); setStart(v); }} />
          </div>
          <div class="deck-slider">
            <div class="ds-head"><span>End</span><b class="num">{fmtTime(end)}</b></div>
            <input type="range" min="0" max={duration} step="0.05" value={end}
              onInput={(e) => { const v = Math.max(Number((e.target as HTMLInputElement).value), start + 0.1); setEnd(v); }} />
          </div>

          <div class="deck-actions">
            <button class={`deck-btn ghost ${playing ? 'on' : ''}`} onClick={previewSelection}>{playing ? '❚❚ Stop' : '▶ Preview selection'}</button>
            <button class="deck-btn solid" onClick={exportClip}>Export MP3</button>
          </div>
          <p class="deck-note">Drag the handles to pick your clip. Everything stays on your device.</p>

          {error && <p class="tool-error">{error}</p>}
          {result && (
            <div class="deck-result">
              <span>Clip ready · <b>{formatBytes(result.blob.size)}</b></span>
              <button class="deck-btn solid" onClick={() => downloadBlob(result.blob, result.name)}>Download MP3</button>
            </div>
          )}
        </div>
      )}
      <style>{`
        .wave { width:100%; height:110px; background:rgba(255,255,255,0.04); border-radius:14px; margin:1.1rem 0; }
      `}</style>
    </div>
  );
}
