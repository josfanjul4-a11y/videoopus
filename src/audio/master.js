// Mastering on the rendered buffer (pure JS, deterministic):
//   BS.1770-4 integrated loudness → gain to the target → true-peak lookahead
//   limiter (4× oversampled detection) → re-measure → fades.

// K-weighting biquads for 48 kHz (ITU-R BS.1770-4 table values).
const K48 = {
  shelf: { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] },
  hp: { b: [1.0, -2.0, 1.0], a: [1, -1.99004745483398, 0.99007225036621] },
};

function biquad(x, { b, a }) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

// Returns { integrated, momentary: Float32Array (per 100 ms step), shortTerm }
export function loudness(chans, sr = 48000) {
  const kw = chans.map((c) => biquad(biquad(c, K48.shelf), K48.hp));
  const block = Math.round(0.4 * sr), step = Math.round(0.1 * sr);
  const ms = [];
  for (let s = 0; s + block <= kw[0].length; s += step) {
    let z = 0;
    for (const c of kw) {
      let acc = 0;
      for (let i = s; i < s + block; i++) acc += c[i] * c[i];
      z += acc / block;
    }
    ms.push(z);
  }
  const L = (z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-12));
  const abs = ms.filter((z) => L(z) > -70);
  const meanAbs = abs.reduce((a, b) => a + b, 0) / Math.max(1, abs.length);
  const rel = L(meanAbs) - 10;
  const gated = abs.filter((z) => L(z) > rel);
  const integrated = L(gated.reduce((a, b) => a + b, 0) / Math.max(1, gated.length));
  const momentary = Float32Array.from(ms.map(L));
  // short term: 3 s windows, 100 ms step
  const st = [];
  const n3 = 30;
  for (let k = 0; k + n3 <= ms.length; k++) {
    let z = 0;
    for (let j = k; j < k + n3; j++) z += ms[j];
    st.push(L(z / n3));
  }
  return { integrated, momentary, shortTerm: Float32Array.from(st) };
}

// 4× oversampled true-peak estimate of a sample stream around index i
const TAPS = (() => {
  // windowed-sinc interpolator for phases 1/4, 2/4, 3/4 (8 taps each)
  const out = [];
  for (let ph = 1; ph < 4; ph++) {
    const f = ph / 4, t = [];
    let s = 0;
    for (let k = -3; k <= 4; k++) {
      const x = k - f;
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / 4.5);
      t.push(sinc * w);
      s += sinc * w;
    }
    out.push(t.map((v) => v / s));
  }
  return out;
})();

export function truePeak(chans) {
  let peak = 0;
  for (const c of chans) {
    for (let i = 3; i < c.length - 4; i++) {
      const a = Math.abs(c[i]);
      if (a > peak) peak = a;
      if (a < peak * 0.5) continue;
      for (const t of TAPS) {
        let v = 0;
        for (let k = 0; k < 8; k++) v += t[k] * c[i - 3 + k];
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
    }
  }
  return peak;
}

// Lookahead limiter with a smooth gain curve: peaks (true-peak estimate per
// sample) above the ceiling are pulled down over a 5 ms attack, released
// over 120 ms.
export function limit(chans, sr, ceiling) {
  const n = chans[0].length;
  const need = new Float32Array(n).fill(1);
  const guard = ceiling * 0.6;
  for (let i = 3; i < n - 4; i++) {
    let p = 0, near = 0;
    for (const c of chans) {
      const a = Math.abs(c[i]);
      if (a > p) p = a;
      const b = Math.max(Math.abs(c[i - 1]), Math.abs(c[i + 1]), Math.abs(c[i + 2]));
      if (b > near) near = b;
    }
    if (Math.max(p, near) > guard) {
      for (const c of chans) {
        for (const t of TAPS) {
          let v = 0;
          for (let k = 0; k < 8; k++) v += t[k] * c[i - 3 + k];
          if (Math.abs(v) > p) p = Math.abs(v);
        }
      }
    }
    if (p > ceiling) need[i] = ceiling / p;
  }
  // g[i] = min(need[i .. i + look]) via a monotonic deque, so the gain is
  // already down when a peak arrives
  const look = Math.round(0.005 * sr);
  const g = new Float32Array(n);
  const dq = new Int32Array(n);
  let head = 0, tail = 0;
  for (let j = 0; j < n + look; j++) {
    if (j < n) {
      while (tail > head && need[dq[tail - 1]] >= need[j]) tail--;
      dq[tail++] = j;
    }
    const i = j - look;
    if (i >= 0) {
      while (dq[head] < i) head++;
      g[i] = need[dq[head]];
    }
  }
  // smooth attack: average the anticipated minimum over the previous `look`
  // samples, which ramps the gain down linearly and still reaches the
  // required value at the peak; then an exponential release
  const avg = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += g[i];
    if (i > look) sum -= g[i - look - 1];
    avg[i] = sum / Math.min(i + 1, look + 1);
  }
  const rel = Math.exp(-1 / (0.12 * sr));
  let cur = 1;
  for (let i = 0; i < n; i++) {
    const target = avg[i];
    cur = target < cur ? target : target + (cur - target) * rel;
    g[i] = cur;
  }
  for (const c of chans) for (let i = 0; i < n; i++) c[i] *= g[i];
}

export function master(chans, sr, { target = -14, ceilingDb = -1.2, fadeIn = 0.05, fadeOutEnd = null, fadeOut = 1.5 } = {}) {
  const before = loudness(chans, sr).integrated;
  const gain = Math.pow(10, (target - before) / 20);
  for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= gain;
  const ceiling = Math.pow(10, ceilingDb / 20);
  limit(chans, sr, ceiling);
  // second pass: the limiter lowered loudness slightly; nudge and limit again
  const mid = loudness(chans, sr).integrated;
  const g2 = Math.pow(10, (target - mid) / 20);
  if (Math.abs(target - mid) > 0.05) {
    for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= g2;
    limit(chans, sr, ceiling);
  }
  const n = chans[0].length;
  const fi = Math.round(fadeIn * sr);
  const end = fadeOutEnd != null ? Math.min(n, Math.round(fadeOutEnd * sr)) : n;
  const fo = Math.round(fadeOut * sr);
  for (const c of chans) {
    for (let i = 0; i < fi; i++) c[i] *= i / fi;
    for (let i = Math.max(0, end - fo); i < n; i++) {
      const x = i >= end ? 0 : (end - i) / fo;
      c[i] *= x * x * (3 - 2 * x);
    }
  }
  const after = loudness(chans, sr);
  return { before, gain: gain * g2, integrated: after.integrated, truePeak: truePeak(chans), loud: after };
}
