// World layout (PLAN.md §4.2): time is laid out as space along +X.
import { C } from './cues.js';

export const LIFE_LEN = 46;            // x extent of the life-ribbon
export const FIG = [47.4, 0.15, 0];    // figure base (its local origin)
export const MOSAIC = [50.9, 1.35, -0.1];
export const BEAD_END = [50.9, 1.35, 0.0];
export const BEAD_R = 0.12;

// ---------------------------------------------------------------- the present
// Speed of the present along x (units/s) by time; X(t) is its integral.
const SPEED = [
  [36.5, 0.0], [38.5, 1.2], [40, 1.35], [50, 1.3], [52, 1.05], [60, 1.0], [63, 0.8],
  [65, 0.1], [68, 0.1], [71, 0.7], [78, 0.75], [84, 0.55], [89, 0.3], [90.5, 0.0],
];
function speed(t) {
  if (t <= SPEED[0][0]) return 0;
  for (let i = 1; i < SPEED.length; i++) {
    if (t <= SPEED[i][0]) {
      const [a, va] = SPEED[i - 1], [b, vb] = SPEED[i];
      const u = (t - a) / (b - a);
      return va + (vb - va) * u * u * (3 - 2 * u);
    }
  }
  return 0;
}
const DT = 0.01;
const XT = (() => {
  const n = Math.ceil((C.end - 36.5) / DT) + 2;
  const a = new Float64Array(n);
  let x = 0;
  for (let i = 1; i < n; i++) {
    const t = 36.5 + i * DT;
    x += 0.5 * (speed(t - DT) + speed(t)) * DT;
    a[i] = x;
  }
  // normalise so the present reaches exactly LIFE_LEN when it stops
  const end = a[n - 1];
  for (let i = 0; i < n; i++) a[i] *= LIFE_LEN / end;
  return a;
})();

// x of the present at time t
export function presentX(t) {
  if (t <= 36.5) return 0;
  const f = (t - 36.5) / DT;
  const i = Math.floor(f);
  if (i >= XT.length - 1) return LIFE_LEN;
  return XT[i] + (XT[i + 1] - XT[i]) * (f - i);
}

// time at which the present reaches x (inverse of presentX)
export function timeOfX(x) {
  if (x <= 0) return 36.5;
  if (x >= LIFE_LEN) return 90.5;
  let lo = 0, hi = XT.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (XT[m] < x) lo = m;
    else hi = m;
  }
  const u = (x - XT[lo]) / Math.max(1e-9, XT[hi] - XT[lo]);
  return 36.5 + (lo + u) * DT;
}

// ---------------------------------------------------------------- the life-ribbon
// centreline as a function of x
export function lifeY(x) {
  const env = Math.min(1, x / 6);
  return 0.35 * Math.sin(x * 0.55 - 0.4) * env + 0.12 * Math.sin(x * 1.3 + 1.0) * env - 0.25 * Math.max(0, (x - 38) / 8) ** 2;
}
export function lifeZ(x) {
  return 0.45 * Math.sin(x * 0.31 + 1.0) * Math.min(1, x / 4);
}
export const lifeAt = (x) => [x, lifeY(x), lifeZ(x)];

// the life's chapters in x
export const MEET_X = presentX(C.loveMeet);           // partner meets ours
export const CHILD_X = presentX(C.childSpark);        // child leaves
export const LOSS_X = presentX(C.partnerFray + 0.8);  // partner ends
export const AGE_X = presentX(C.age[0]);

// the partner: arrives from above before the meeting, then braids around ours
export function partnerAt(x) {
  if (x < MEET_X) {
    const u = (MEET_X - x) / 5; // 0 at meeting, grows backward
    const c = lifeAt(x);
    return [x, c[1] + 0.15 + u * u * 2.6, c[2] - 0.3 * u];
  }
  const c = lifeAt(x);
  const ph = (x - MEET_X) * 1.25;
  const rad = 0.26 * Math.min(1, (x - MEET_X) / 1.2);
  return [x, c[1] + 0.15 * Math.cos(ph) * (1 - Math.min(1, (x - MEET_X) / 1.2)) + rad * Math.sin(ph), c[2] + rad * Math.cos(ph)];
}
export const PARTNER_X0 = MEET_X - 6.5;

// the child: leaves the braid and rises toward the upper right, beyond the film
export function childAt(u) {
  // u from 0 (birth) along its own path; x0 = CHILD_X
  const c = lifeAt(CHILD_X);
  return [CHILD_X + u * 7.5, c[1] + u * u * 3.2 + u * 1.2, c[2] - u * 2.0];
}

// life-ribbon palette coordinate: gold → amber → crimson → magenta → violet →
// teal → slate → bone → ash, by x
export function lifeU(x) {
  const k = [[0, 0.02], [MEET_X, 0.26], [CHILD_X, 0.4], [LOSS_X, 0.6], [AGE_X, 0.7], [LIFE_LEN, 0.95]];
  for (let i = 1; i < k.length; i++) if (x <= k[i][0]) return k[i - 1][1] + ((k[i][1] - k[i - 1][1]) * (x - k[i - 1][0])) / (k[i][0] - k[i - 1][0]);
  return 0.95;
}
