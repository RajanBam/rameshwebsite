import { useState, useRef, useEffect } from 'preact/hooks';
import { downloadBlob, formatBytes } from '../../lib/format';
import { getFFmpeg, mediaDuration, estimateSize } from '../../lib/ffmpeg';
import ProgressRing from '../ui/ProgressRing';

/** Video Compressor. Bitrate-targeted H.264 + AAC via ffmpeg.wasm, entirely
 *  in the browser. Expected output size for every level is shown from the
 *  video's duration the moment a file is dropped, before compressing. */
const LEVELS = {
  small: { label: 'Small', hint: '480p · sharing', height: 480, vKbps: 600, aKbps: 64 },
  medium: { label: 'Medium', hint: '720p · balanced', height: 720, vKbps: 1200, aKbps: 96 },
  high: { label: 'High', hint: '1080p · quality', height: 1080, vKbps: 2500, aKbps: 128 },
} as const;
type Level = keyof typeof LEVELS;
const LEVEL_KEYS = Object.keys(LEVELS) as Level[];

export default function VideoCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>('medium');
  const [drag, setDrag] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(-1);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; before: number } | null>(null);
  const cancelled = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);

  const add = async (list: FileList | File[]) => {
    const vid = Array.from(list).find((f) => f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(f.name));
    if (!vid) return;
    setFile(vid); setResult(null); setError(''); setDuration(0);
    const d = await mediaDuration(vid, 'video');
    setDuration(d);
  };

  const run = async () => {
    if (!file) return;
    setError(''); setResult(null); setProgress(0); setPhase('Loading engine…');
    try {
      const ff = await getFFmpeg();
      if (cancelled.current) return;
      setPhase('');
      const onProgress = ({ progress: p }: { progress: number }) => {
        setProgress(Math.max(0, Math.min(99, Math.round(p * 100))));
      };
      ff.on('progress', onProgress);
      const { height, vKbps, aKbps } = LEVELS[level];
      const inName = 'in' + (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.mp4');
      await ff.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
      // ultrafast preset + capped frame rate keeps in-browser encoding as
      // quick as possible; bitrate targeting still controls the output size.
      await ff.exec([
        '-i', inName,
        '-vf', `scale=-2:'min(${height},ih)',fps='min(30,source_fps)'`,
        '-c:v', 'libx264', '-b:v', `${vKbps}k`,
        '-preset', 'ultrafast', '-tune', 'fastdecode',
        '-c:a', 'aac', '-b:a', `${aKbps}k`,
        '-movflags', '+faststart',
        'out.mp4',
      ]);
      ff.off('progress', onProgress);
      const data = await ff.readFile('out.mp4');
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile('out.mp4').catch(() => {});
      const blob = new Blob([data as BlobPart], { type: 'video/mp4' });
      if (blob.size === 0) throw new Error('Encoding produced no output. This format may not be supported.');
      setProgress(100);
      setResult({ blob, before: file.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compress this video.');
    } finally {
      setTimeout(() => setProgress(-1), 900);
    }
  };

  const busy = progress >= 0 && progress < 100;
  const saved = result ? Math.round((1 - result.blob.size / result.before) * 100) : 0;
  const est = (k: Level) => (duration > 0 ? estimateSize(duration, LEVELS[k].vKbps, LEVELS[k].aKbps) : null);
  // Only offer a level if it cuts the file by at least half. When a file's
  // duration cannot be read (some webm/stream files), we cannot estimate, so
  // we allow compression and simply skip the estimate rather than dead-end.
  const known = duration > 0 && isFinite(duration);
  const worthIt = (k: Level) => { if (!known) return true; const e = est(k); return e != null && file != null && e <= file.size * 0.5; };
  const anyWorth = file != null && (!known || LEVEL_KEYS.some(worthIt));
  const alreadySmall = file != null && known && !LEVEL_KEYS.some(worthIt);

  return (
    <div class="tool-card">
      {busy ? (
        <ProgressRing value={progress} label={phase || undefined}
          sublabel={phase ? 'One-time download, cached after' : 'Encoding on your device'} />
      ) : (
        <>
          <div class={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? []); }}
            onClick={() => document.getElementById('vc-in')?.click()}>
            <div class="dz-title">{file ? file.name : 'Drop a video here'}</div>
            <div class="dz-hint">
              {file
                ? `${formatBytes(file.size)}${duration ? ` · ${Math.round(duration)}s` : ''}`
                : 'MP4, MOV, WebM and more · nothing uploaded'}
            </div>
            <input id="vc-in" type="file" accept="video/*,.mp4,.mov,.webm,.mkv,.avi" style="display:none"
              onChange={(e) => { const t = e.target as HTMLInputElement; if (t.files) add(t.files); t.value = ''; }} />
          </div>

          {file && anyWorth && (
            <div class="field" style="margin-top:1.25rem">
              <label class="field-label">Output quality</label>
              <div class="level-grid">
                {LEVEL_KEYS.map((k) => {
                  const e = est(k);
                  const good = worthIt(k);
                  return (
                    <button key={k} class={`level ${level === k ? 'on' : ''}`} disabled={!good}
                      onClick={() => good && setLevel(k)}>
                      <span class="lv-name">{LEVELS[k].label}</span>
                      <span class="lv-hint">{LEVELS[k].hint}</span>
                      <span class={`lv-est num ${good ? 'good' : 'bad'}`}>
                        {!known ? 'ready' : e != null ? (good ? `~${formatBytes(e)} · −${Math.round((1 - e / file.size) * 100)}%` : 'too small to help') : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p class="engine-note">Compression runs on your device. The first run loads the engine (about 31 MB, one time); longer videos take longer to encode.</p>
            </div>
          )}

          {alreadySmall && (
            <p class="method-note" style="margin-top:1.25rem">This video is already efficiently compressed, so we cannot cut its size by half without noticeably hurting quality. Nothing to do here.</p>
          )}

          {file && (
            <div class="btn-row">
              {anyWorth && <button class="btn btn-primary" onClick={run}>Compress video</button>}
              <button class="btn btn-ghost" onClick={() => { setFile(null); setResult(null); setError(''); }}>Clear</button>
            </div>
          )}
          {error && <p class="tool-error">{error}</p>}

          {result && (
            <>
              <div class="stat-row" style="margin-top:1.25rem">
                <div class="stat"><div class="stat-val">{formatBytes(result.before)}</div><div class="stat-label">before</div></div>
                <div class="stat"><div class="stat-val">{formatBytes(result.blob.size)}</div><div class="stat-label">after</div></div>
                <div class="stat">
                  <div class="stat-val" style={saved >= 0 ? 'color:var(--green)' : 'color:var(--dim)'}>
                    {saved >= 0 ? `−${saved}%` : `+${-saved}%`}
                  </div>
                  <div class="stat-label">{saved >= 0 ? 'saved' : 'larger'}</div>
                </div>
              </div>
              <div class="btn-row">
                <button class="btn btn-primary"
                  onClick={() => downloadBlob(result.blob, (file?.name.replace(/\.[^.]+$/, '') || 'video') + '-compressed.mp4')}>
                  Download MP4
                </button>
              </div>
            </>
          )}
        </>
      )}
      <style>{`
        .level-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:0.6rem; }
        .level {
          display:flex; flex-direction:column; align-items:flex-start; gap:0.15rem;
          padding:0.75rem 0.9rem; background:#fff; border:1px solid var(--hairline);
          border-radius:var(--radius-sm); cursor:pointer; text-align:left;
          transition:border-color .15s var(--ease), box-shadow .15s var(--ease);
        }
        .level.on { border-color:var(--blue); box-shadow:0 0 0 1px var(--blue); }
        .level:disabled { opacity:0.5; cursor:not-allowed; }
        .lv-name { font-weight:600; font-size:var(--t-small); color:var(--ink); }
        .lv-hint { font-size:0.78rem; color:var(--dim); }
        .lv-est { font-size:0.78rem; color:var(--dim); margin-top:0.3rem; min-height:1em; }
        .lv-est.good { color:var(--green); font-weight:500; }
        .lv-est.bad { color:#b45309; }
        .method-note { font-size:0.82rem; color:var(--dim); line-height:1.5; }
        .engine-note { font-size:0.78rem; color:var(--dim); margin-top:0.75rem; }
      `}</style>
    </div>
  );
}
