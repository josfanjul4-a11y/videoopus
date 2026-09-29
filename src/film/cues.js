// THE MASTER TIMELINE. One table drives the picture, the camera, the music
// and the sound effects. Times in seconds (PLAN.md §4.3).

export const DURATION = 136.0;

export const C = {
  fadeIn: [0.0, 2.0],
  beadTone: 1.2,
  circleDraw: [2.0, 4.2],
  crossDraw: [4.4, 5.2],
  cleave2: 6.0,
  cleave4: 7.4,
  cleave16: 8.6,
  cellsDisperse: [9.4, 13.5],
  embryoCondense: [10.5, 14.0],
  heartFirst: 13.2,
  silkUnfurl: [11.0, 16.0],
  lullaby: [12.5, 32.5],
  treeGrow: [14.0, 26.0],
  threadsDescend: [15.0, 21.0],
  growth: [26.0, 33.0],
  birthBreak: [33.0, 36.0],
  starIgnite: 36.0,
  ribbonLaunch: 36.5,
  childhood: [37.0, 50.0],
  loveMeet: 50.0,
  love: [50.0, 60.0],
  childSpark: 60.5,
  allAtOnce: [63.0, 71.0],
  arcsDraw: [65.5, 68.5],
  loss: [72.0, 78.0],
  partnerFray: 73.0,
  age: [78.0, 90.0],
  figureRise: [90.0, 95.0],
  heartSlow: [95.0, 101.0],
  lastBeat: 101.0,
  silence: [101.0, 103.5],
  gridDraw: [103.5, 105.5],
  shed: [105.0, 111.0],
  mosaicSettle: [108.0, 114.0],
  merges: [114.0, 116.0, 117.6, 118.8, 119.8, 120.6],
  contract: [120.75, 121.4],
  beadForm: 121.4,
  threaded: 123.0,
  curtain: [123.5, 127.0],
  returnCircle: [127.5, 128.3],
  returnCross: [128.4, 128.8],
  heartEcho: 129.0,
  split: 129.6,
  fadeOut: [129.8, 130.8],
  title: [131.0, 135.0],
  end: 136.0,
};

// Movements (for ?debug and the benchmark).
export const MOVEMENTS = [
  ['0 The Bead', 0, 12],
  ['I Quickening', 12, 38],
  ['II The Long Line', 38, 90],
  ['III Shedding', 90, 111],
  ['IV Kept', 111, 136],
];
export function movementAt(t) {
  for (const m of MOVEMENTS) if (t < m[2]) return m[0];
  return MOVEMENTS[MOVEMENTS.length - 1][0];
}

// 0..1 progress of t through [a, b], clamped
export const prog = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
export const ss = (t, a, b) => {
  const x = prog(t, a, b);
  return x * x * (3 - 2 * x);
};
// a pulse that is 1 inside [a, b] with soft edges of width w
export const win = (t, a, b, w = 0.5) => ss(t, a - w, a) * (1 - ss(t, b, b + w));

// ---------------------------------------------------------------- heartbeat
// Heart rate (bpm) as a function of time; beats are found by integrating it.
function rate(t) {
  const pts = [
    [13.2, 144], [26, 146], [33, 152], [36, 130], [38, 112], [50, 96], [52, 82], [63, 80], [71, 76], [78, 70],
    [90, 58], [95, 56], [98, 48], [100, 40], [101, 36],
  ];
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [a, ra] = pts[i - 1], [b, rb] = pts[i];
      return ra + ((rb - ra) * (t - a)) / (b - a);
    }
  }
  return pts[pts.length - 1][1];
}

function buildBeats() {
  const beats = [];
  let t = C.heartFirst;
  let k = 0;
  while (t <= C.lastBeat + 1e-6) {
    // in the last seconds the rhythm falters a little (deterministic)
    const falter = t > 97 ? [0.08, -0.05, 0.12, 0.02, 0.18, 0.05][k % 6] : 0;
    beats.push({ t, kind: t < 36 ? 'fetal' : 'adult', k });
    const dt = 60 / rate(t);
    t += dt * (1 + falter);
    k++;
    if (t > C.lastBeat - 0.3 && t < C.lastBeat + 1.0) break;
  }
  beats.push({ t: C.lastBeat, kind: 'half', k });
  beats.push({ t: C.heartEcho, kind: 'fetal', k: k + 1 });
  return beats;
}
export const BEATS = buildBeats();

// Loudness weight of the heartbeat sound over the film (0 = silent): quiet as
// a fetal pulse, under the music in life, gone at the midpoint, foreground at
// the death.
export function heartGain(t) {
  if (t < 36) return 0.16 + 0.06 * ss(t, 26, 34);
  if (t < 63) return 0.1;
  if (t < 71) return 0.1 * (1 - ss(t, 63, 65)) + 0.1 * ss(t, 69, 71);
  if (t < 90) return 0.1;
  if (t < 102) return 0.12 + 0.3 * ss(t, 90, 96);
  return 0.22;
}

// The score's dynamics (dB) over the film, applied after the render: the
// arc of PLAN.md §4.1 made audible. The master then normalises the whole.
export function faderDb(t) {
  const k = [
    [0, -9], [11, -9], [13, -12], [26, -11], [33, -6], [36, -2], [38, -4], [50, -3], [52, -1], [62, -2], [64, -8], [70, -8], [72, -4],
    [78, -7], [90, -8], [100.6, -7], [101.2, -12], [103.6, -12], [106, -9], [111, -7], [114, -6], [120.6, 0], [121.6, 1], [126, -3], [130, -6], [136, -8],
  ];
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return k[i - 1][1] + ((k[i][1] - k[i - 1][1]) * (t - k[i - 1][0])) / (k[i][0] - k[i - 1][0]);
  return k[k.length - 1][1];
}

// Heartbeat pulse envelope for visuals: 0..1, peaks just after each beat.
export function pulse(t) {
  let v = 0;
  for (const b of BEATS) {
    const d = t - b.t;
    if (d < 0) break;
    if (d < 0.8) v = Math.max(v, Math.exp(-d * 6) * (1 - Math.exp(-d * 60)));
  }
  return v;
}
