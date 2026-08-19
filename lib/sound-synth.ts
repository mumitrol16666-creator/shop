// Lightweight Web Audio Guitar & Instrument Synthesizer
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export type SoundType = "electric-clean" | "electric-crunch" | "acoustic-strum" | "ukulele-chord" | "bass-slap";

export function playInstrumentPreview(type: SoundType, onFinish?: () => void) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === "electric-clean") {
      // E major 9th arpeggio with soft chorus/reverb decay
      const freqs = [164.81, 246.94, 329.63, 392.00, 493.88, 659.25];
      freqs.forEach((freq, idx) => {
        playPluck(ctx, freq, now + idx * 0.12, 1.8, "triangle", 0.35);
      });
      if (onFinish) setTimeout(onFinish, 2400);
    } else if (type === "electric-crunch") {
      // Power chord with soft distortion
      const freqs = [110.0, 164.81, 220.0];
      freqs.forEach((freq) => {
        playDistortedPluck(ctx, freq, now, 1.6, 0.4);
      });
      setTimeout(() => {
        const freqs2 = [130.81, 196.0, 261.63];
        freqs2.forEach((freq) => {
          playDistortedPluck(ctx, freq, now + 0.35, 1.8, 0.45);
        });
      }, 350);
      if (onFinish) setTimeout(onFinish, 2600);
    } else if (type === "acoustic-strum") {
      // G major acoustic strumming
      const freqs = [98.0, 123.47, 146.83, 196.0, 246.94, 392.0];
      freqs.forEach((freq, idx) => {
        playPluck(ctx, freq, now + idx * 0.04, 2.2, "sawtooth", 0.28, true);
      });
      setTimeout(() => {
        const cFreqs = [130.81, 164.81, 196.0, 261.63, 329.63];
        cFreqs.forEach((freq, idx) => {
          playPluck(ctx, freq, now + 0.6 + idx * 0.035, 2.2, "sawtooth", 0.28, true);
        });
      }, 600);
      if (onFinish) setTimeout(onFinish, 2800);
    } else if (type === "ukulele-chord") {
      // Bright C major ukulele chord
      const freqs = [392.0, 261.63, 329.63, 440.0];
      freqs.forEach((freq, idx) => {
        playPluck(ctx, freq, now + idx * 0.03, 1.4, "triangle", 0.4);
      });
      setTimeout(() => {
        const fFreqs = [349.23, 261.63, 329.63, 440.0];
        fFreqs.forEach((freq, idx) => {
          playPluck(ctx, freq, now + 0.45 + idx * 0.03, 1.4, "triangle", 0.4);
        });
      }, 450);
      if (onFinish) setTimeout(onFinish, 2000);
    } else {
      // Default acoustic tone
      const freqs = [196.0, 246.94, 293.66, 392.0];
      freqs.forEach((freq, idx) => {
        playPluck(ctx, freq, now + idx * 0.08, 1.5, "triangle", 0.3);
      });
      if (onFinish) setTimeout(onFinish, 2000);
    }
  } catch (err) {
    console.warn("Audio playback not permitted yet:", err);
    if (onFinish) onFinish();
  }
}

function playPluck(
  ctx: AudioContext,
  freq: number,
  time: number,
  duration: number,
  waveType: OscillatorType = "triangle",
  gainLevel = 0.3,
  isAcoustic = false
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, time);

  // Body acoustic filter
  filter.type = isAcoustic ? "bandpass" : "lowpass";
  filter.frequency.setValueAtTime(isAcoustic ? freq * 2.2 : freq * 3.5, time);
  filter.Q.setValueAtTime(isAcoustic ? 3 : 1.5, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(gainLevel, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + duration + 0.1);
}

function playDistortedPluck(
  ctx: AudioContext,
  freq: number,
  time: number,
  duration: number,
  gainLevel = 0.3
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const filter = ctx.createBiquadFilter();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, time);

  // Soft clipping curve
  shaper.curve = makeDistortionCurve(30);
  shaper.oversample = "4x";

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(gainLevel, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.connect(shaper);
  shaper.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + duration + 0.1);
}

function makeDistortionCurve(amount: number) {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}
