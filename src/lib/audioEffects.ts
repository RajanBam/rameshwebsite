// Web Audio engine for the slowed + reverb / nightcore tool.
// Decoding, offline rendering (speed via playbackRate + convolution reverb),
// and MP3/WAV export all run in the browser. Nothing is uploaded.
import { Mp3Encoder } from '@breezystack/lamejs';

export interface EffectSettings {
  speed: number;   // 0.5 (deep slow) .. 1.5 (nightcore)
  reverb: number;  // 0 .. 1 wet amount
}

const AC: typeof AudioContext =
  (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) as any;

export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const ctx = new AC();
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } finally {
    ctx.close();
  }
}

/** Synthetic hall reverb: exponentially-decaying noise, no external file. */
export function impulseResponse(ctx: BaseAudioContext, seconds = 2.8, decay = 2.4): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return ir;
}

/** Build the effect graph on any context; returns the source to start. */
export function buildGraph(ctx: BaseAudioContext, buffer: AudioBuffer, s: EffectSettings) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = s.speed;

  const dry = ctx.createGain();
  dry.gain.value = 1 - s.reverb * 0.45;
  const wet = ctx.createGain();
  wet.gain.value = s.reverb;

  src.connect(dry).connect(ctx.destination as AudioNode);
  const conv = ctx.createConvolver();
  conv.buffer = impulseResponse(ctx);
  src.connect(conv).connect(wet).connect(ctx.destination as AudioNode);

  return { src, dry, wet };
}

/** Render the effect offline (faster than realtime) into a new AudioBuffer. */
export async function renderEffect(buffer: AudioBuffer, s: EffectSettings): Promise<AudioBuffer> {
  const tail = s.reverb > 0 ? 3.2 : 0;
  const outLen = Math.max(1, Math.ceil((buffer.duration / s.speed + tail) * buffer.sampleRate));
  const ctx = new OfflineAudioContext(Math.min(2, buffer.numberOfChannels) || 1, outLen, buffer.sampleRate);
  const { src } = buildGraph(ctx, buffer, s);
  src.start(0);
  return ctx.startRendering();
}

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const v = Math.max(-1, Math.min(1, input[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

/** Encode an AudioBuffer to MP3, yielding periodically so the UI stays live. */
export async function encodeMp3(
  buffer: AudioBuffer,
  kbps = 192,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const channels = Math.min(2, buffer.numberOfChannels) || 1;
  const enc = new Mp3Encoder(channels, buffer.sampleRate, kbps);
  const left = floatTo16(buffer.getChannelData(0));
  const right = channels > 1 ? floatTo16(buffer.getChannelData(1)) : left;
  const block = 1152;
  const parts: Uint8Array[] = [];
  for (let i = 0; i < left.length; i += block) {
    const lc = left.subarray(i, i + block);
    const rc = right.subarray(i, i + block);
    const chunk = channels > 1 ? enc.encodeBuffer(lc, rc) : enc.encodeBuffer(lc);
    if (chunk.length) parts.push(new Uint8Array(chunk));
    if ((i / block) % 200 === 0) {
      onProgress?.(i / left.length);
      await new Promise((r) => setTimeout(r));
    }
  }
  const end = enc.flush();
  if (end.length) parts.push(new Uint8Array(end));
  onProgress?.(1);
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' });
}
