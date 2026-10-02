// Original background music, synthesized from scratch in plain JavaScript.
// No samples, no AI music service, no licenses to worry about.
//
//   node music/compose.mjs   -> writes assets/music.wav and assets/music.mp3 (via ffmpeg)
//
// Tweak the knobs below (BPM, chords, melody, arrangement) and re-run.
// The arrangement is laid out in bars (1 bar = 4 beats = 2 s at 120 BPM)
// and lines up with the scene cuts in index.html.

import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- knobs ---
const BPM = 120;
const BARS = 30; // 30 bars x 2 s = 60 s
const SR = 44100;
const MASTER_PEAK = 0.79; // ~ -2 dBFS, leaves room for the renderer's -1 dBTP AAC limit

// One chord per bar, cycling: C - G - Am - F  (the "four chords" pop loop)
const CHORDS = [
  { root: 36, notes: [60, 64, 67] }, // C
  { root: 43, notes: [59, 62, 67] }, // G
  { root: 45, notes: [60, 64, 69] }, // Am
  { root: 41, notes: [60, 65, 69] }, // F
];

// Lead melody over 4 bars, in 8th-note steps: [step, midi, lengthInSteps]
const MELODY = [
  [0, 76, 2], [2, 79, 2], [4, 84, 2], [6, 79, 1], [7, 76, 1],
  [8, 74, 2], [10, 79, 2], [12, 83, 2], [14, 81, 1], [15, 79, 1],
  [16, 84, 2], [18, 83, 2], [20, 81, 2], [22, 76, 2],
  [24, 77, 2], [26, 81, 2], [28, 84, 3], [31, 83, 1],
];

// Which instruments play in each bar. Scene cuts (s): 6 14 22 32 40 50 56
function layersFor(bar) {
  const L = new Set();
  const t = bar * 2;
  if (t < 4) ["kick", "hat", "bass", "pluck"].forEach((x) => L.add(x)); // hook
  else if (t < 6) ["pluck", "roll", "riser"].forEach((x) => L.add(x)); // build -> drop @6
  else if (t < 32) ["kick", "clap", "hat", "bass", "pad", "pluck", "lead"].forEach((x) => L.add(x));
  else if (t < 34) ["kick", "clap", "hat"].forEach((x) => L.add(x)); // "music is code": drums
  else if (t < 36) ["kick", "clap", "hat", "bass"].forEach((x) => L.add(x)); // + bass
  else if (t < 38) ["kick", "clap", "hat", "bass", "pad"].forEach((x) => L.add(x)); // + chords
  else if (t < 54) ["kick", "clap", "hat", "bass", "pad", "pluck", "lead"].forEach((x) => L.add(x));
  else if (t < 56) ["pad", "pluck", "roll", "riser"].forEach((x) => L.add(x)); // build -> drop @56
  else if (t < 58) ["kick", "clap", "hat", "bass", "pad", "pluck", "lead"].forEach((x) => L.add(x));
  else L.add("final"); // last hit + ring out
  if (t >= 6 && t < 14) L.delete("lead"); // let the melody enter a bit later
  return L;
}
const IMPACTS = [6, 14, 22, 32, 40, 50, 56]; // crash on every scene cut

// ------------------------------------------------------------- helpers ---
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const N = Math.ceil(BARS * BAR * SR);
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

let seed = 1234567; // seeded noise => identical file every run
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};

const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const drums = bus(), bass = bus(), pad = bus(), plucks = bus(), fx = bus();

function add(b, i, v, pan = 0) {
  if (i < 0 || i >= N) return;
  b.L[i] += v * Math.min(1, 1 - pan);
  b.R[i] += v * Math.min(1, 1 + pan);
}

// Chamberlin state-variable lowpass
function svf() {
  let low = 0, band = 0;
  return (x, fc, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
    low += f * band;
    const high = x - low - q * band;
    band += f * high;
    return low;
  };
}

// ---------------------------------------------------------- instruments ---
function kick(t, vel = 1) {
  const s = Math.floor(t * SR), len = Math.floor(0.45 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const f = 45 + 110 * Math.exp(-tt / 0.03);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-tt / 0.16);
    const click = i < 60 ? noise() * 0.3 * (1 - i / 60) : 0;
    add(drums, s + i, (Math.tanh(Math.sin(ph) * 2.2) * 0.9 * env + click) * vel);
  }
}

function clap(t, vel = 1, pan = 0) {
  const s = Math.floor(t * SR), len = Math.floor(0.25 * SR);
  const lp = svf(), hpLow = svf();
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    // three fast bursts then a tail, like hands clapping
    const burst = tt < 0.03 ? Math.exp(-((tt % 0.01) / 0.003)) : Math.exp(-(tt - 0.03) / 0.07);
    const n = noise();
    const band = lp(n - hpLow(n, 700), 3200, 0.5);
    add(drums, s + i, band * burst * 0.9 * vel, pan);
  }
}

function hat(t, vel = 1, open = false) {
  const s = Math.floor(t * SR), dec = open ? 0.18 : 0.035;
  const len = Math.floor(dec * 5 * SR);
  const lp = svf();
  for (let i = 0; i < len; i++) {
    const n = noise();
    const hp = n - lp(n, 7000);
    add(drums, s + i, hp * Math.exp(-i / SR / dec) * 0.35 * vel, 0.25);
  }
}

function crash(t, vel = 1) {
  const s = Math.floor(t * SR), len = Math.floor(2.2 * SR);
  const lpL = svf(), lpR = svf();
  for (let i = 0; i < len; i++) {
    const env = Math.exp(-i / SR / 0.6) * vel * 0.32;
    const a = noise(), b = noise();
    add(fx, s + i, (a - lpL(a, 5000)) * env, -0.6);
    add(fx, s + i, (b - lpR(b, 5000)) * env, 0.6);
  }
}

function riser(t, dur) {
  const s = Math.floor(t * SR), len = Math.floor(dur * SR);
  const lp = svf();
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const n = lp(noise(), 300 + 9000 * p * p, 0.3);
    ph += (2 * Math.PI * (200 + 1400 * p * p)) / SR;
    const v = (n * 0.5 + Math.sin(ph) * 0.08) * p * p * 0.8;
    add(fx, s + i, v, Math.sin(p * 20) * 0.5);
  }
}

function bassNote(t, midi, dur, vel = 1) {
  const s = Math.floor(t * SR), len = Math.floor((dur + 0.05) * SR);
  const f = midiHz(midi), lp = svf();
  let ph = 0, ph2 = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    ph = (ph + f / SR) % 1;
    ph2 = (ph2 + (f * 1.004) / SR) % 1;
    const saw = (ph * 2 - 1) * 0.6 + (ph2 * 2 - 1) * 0.4;
    const cutoff = 180 + 1400 * Math.exp(-tt / 0.08);
    const sub = Math.sin(2 * Math.PI * ph) * 0.5;
    const env = Math.min(1, tt / 0.004) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / 0.05));
    add(bass, s + i, (lp(saw, cutoff, 0.4) * 0.7 + sub) * env * 0.55 * vel);
  }
}

function padChord(t, notes, dur) {
  const s = Math.floor(t * SR), len = Math.floor((dur + 0.3) * SR);
  const voices = [];
  notes.forEach((m, k) =>
    [-0.09, 0, 0.09].forEach((det, j) =>
      voices.push({ f: midiHz(m) * Math.pow(2, det / 12), ph: (k * 0.31 + j * 0.17) % 1, pan: (j - 1) * 0.7 })
    )
  );
  const lpL = svf(), lpR = svf();
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let l = 0, r = 0;
    for (const v of voices) {
      v.ph = (v.ph + v.f / SR) % 1;
      const x = v.ph * 2 - 1;
      l += x * (1 - Math.max(0, v.pan));
      r += x * (1 + Math.min(0, v.pan));
    }
    const env = Math.min(1, tt / 0.03) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / 0.3));
    if (s + i >= N) break;
    pad.L[s + i] += lpL(l, 2400, 0.6) * env * 0.05;
    pad.R[s + i] += lpR(r, 2400, 0.6) * env * 0.05;
  }
}

function pluckNote(t, midi, vel = 1, pan = 0) {
  const s = Math.floor(t * SR), len = Math.floor(0.4 * SR);
  const f = midiHz(midi), lp = svf();
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    ph = (ph + f / SR) % 1;
    const x = (ph < 0.5 ? 1 : -1) * 0.5 + (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph) * 0.5;
    const y = lp(x, 900 + 5000 * Math.exp(-tt / 0.05), 0.5);
    add(plucks, s + i, y * Math.exp(-tt / 0.12) * 0.22 * vel, pan);
  }
}

function leadNote(t, midi, dur, vel = 1) {
  const s = Math.floor(t * SR), len = Math.floor((dur + 0.08) * SR);
  const f = midiHz(midi), lp = svf();
  let ph = 0, ph2 = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * tt) * Math.min(1, tt / 0.2);
    ph = (ph + (f * vib) / SR) % 1;
    ph2 = (ph2 + (f * vib * 1.006) / SR) % 1;
    const x = (ph < 0.5 ? 1 : -1) * 0.5 + (ph2 * 2 - 1) * 0.5;
    const env = Math.min(1, tt / 0.01) * (tt < dur ? 1 - 0.3 * Math.min(1, tt / 0.3) : 0.7 * Math.max(0, 1 - (tt - dur) / 0.08));
    add(plucks, s + i, lp(x, 3200, 0.6) * env * 0.16 * vel, -0.15);
  }
}

// ------------------------------------------------------------ sequence ---
for (let bar = 0; bar < BARS; bar++) {
  const L = layersFor(bar);
  const t0 = bar * BAR;
  const chord = CHORDS[bar % 4];

  if (L.has("final")) {
    kick(t0, 1.1);
    crash(t0, 1.2);
    bassNote(t0, 36, 1.6, 1);
    padChord(t0, [60, 64, 67, 72], 1.4);
    [72, 76, 79, 84].forEach((m, k) => pluckNote(t0 + k * BEAT * 0.25, m, 0.9, k % 2 ? 0.4 : -0.4));
    continue;
  }

  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    if (L.has("kick")) kick(tb);
    if (L.has("clap") && (b === 1 || b === 3)) clap(tb, 1, 0.05);
    if (L.has("hat")) {
      hat(tb + BEAT / 2, 0.9, b === 3);
      hat(tb + BEAT / 4, 0.35);
      hat(tb + (3 * BEAT) / 4, 0.35);
    }
    if (L.has("bass")) {
      bassNote(tb, chord.root, BEAT * 0.4, 0.9);
      bassNote(tb + BEAT / 2, chord.root + 12, BEAT * 0.35, 0.8);
    }
  }
  if (L.has("pad")) padChord(t0, chord.notes, BAR - 0.05);
  if (L.has("pluck")) {
    const tones = [...chord.notes.map((m) => m + 12), chord.notes[0] + 24];
    const order = [0, 1, 2, 3, 2, 1, 0, 2, 1, 2, 3, 2, 1, 2, 0, 1];
    for (let k = 0; k < 16; k++) pluckNote(t0 + k * BEAT * 0.25, tones[order[k]], k % 4 === 0 ? 1 : 0.7, k % 2 ? 0.45 : -0.45);
  }
  if (L.has("lead")) {
    const phraseBar = bar % 4;
    for (const [step, m, ln] of MELODY) {
      if (Math.floor(step / 8) !== phraseBar) continue;
      leadNote(t0 + (step % 8) * (BEAT / 2), m, ln * (BEAT / 2) * 0.9);
    }
  }
  if (L.has("roll")) {
    for (let k = 0; k < 16; k++) {
      const sub = k < 8 ? 2 : 1; // 8ths then 16ths
      if (k % sub) continue;
      clap(t0 + k * BEAT * 0.25, 0.3 + 0.7 * (k / 16), k % 2 ? 0.3 : -0.3);
    }
  }
  if (L.has("riser")) riser(t0, BAR);
}
IMPACTS.forEach((t) => crash(t, 1));

// ----------------------------------------------------------- effects ---
// Sidechain "pump": duck pad + bass a little on every beat (classic dance feel)
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const bar = Math.floor(t / BAR);
  const pumping = layersFor(Math.min(bar, BARS - 1)).has("kick");
  const g = pumping ? 1 - 0.75 * Math.exp(-(t % BEAT) / 0.09) : 1;
  pad.L[i] *= g; pad.R[i] *= g;
  bass.L[i] *= 0.6 + 0.4 * g; bass.R[i] *= 0.6 + 0.4 * g;
}

// Ping-pong delay on plucks + lead (dotted 8th)
{
  const d = Math.floor(BEAT * 0.75 * SR);
  const L = plucks.L, R = plucks.R;
  for (let i = d; i < N; i++) {
    L[i] += R[i - d] * 0.32;
    R[i] += L[i - d] * 0.32;
  }
}

// Small Schroeder reverb on everything except kick/bass
function reverb(src, wet) {
  const combs = [1557, 1617, 1491, 1422].map((n) => ({ buf: new Float32Array(n), i: 0 }));
  const aps = [225, 556].map((n) => ({ buf: new Float32Array(n), i: 0 }));
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.buf[c.i] = src[i] + y * 0.8;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of aps) {
      const y = a.buf[a.i];
      a.buf[a.i] = s + y * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = y - s * 0.5;
    }
    out[i] = s * wet;
  }
  return out;
}
const sendL = new Float32Array(N), sendR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  sendL[i] = pad.L[i] + plucks.L[i] + fx.L[i] * 0.3;
  sendR[i] = pad.R[i] + plucks.R[i] + fx.R[i] * 0.3;
}
const revL = reverb(sendL, 0.09), revR = reverb(sendR, 0.09);

// ---------------------------------------------------------- mixdown ---
const outL = new Float32Array(N), outR = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  outL[i] = Math.tanh((drums.L[i] + bass.L[i] + pad.L[i] + plucks.L[i] + fx.L[i] + revL[i]) * 0.5);
  outR[i] = Math.tanh((drums.R[i] + bass.R[i] + pad.R[i] + plucks.R[i] + fx.R[i] + revR[i]) * 0.5);
  peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
}
const gain = MASTER_PEAK / peak;
const fadeOut = Math.floor(1.6 * SR);
// 30 ms fade-in: a full-level hit on the very first sample makes AAC encoders overshoot
const fadeIn = Math.floor(0.03 * SR);
for (let i = 0; i < N; i++) {
  const f = (i < fadeIn ? i / fadeIn : 1) * (i > N - fadeOut ? (N - i) / fadeOut : 1);
  outL[i] *= gain * f;
  outR[i] *= gain * f;
}

// ---------------------------------------------------------- write wav ---
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[i])) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[i])) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "music.wav");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, data]));
console.log(`wrote ${out} (${(N / SR).toFixed(1)} s, ${BPM} BPM)`);

const mp3 = out.replace(/\.wav$/, ".mp3");
const enc = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", out, "-c:a", "libmp3lame", "-b:a", "192k", mp3], { stdio: "inherit" });
console.log(enc.status === 0 ? `wrote ${mp3}` : "ffmpeg not found: convert assets/music.wav to assets/music.mp3 yourself");
