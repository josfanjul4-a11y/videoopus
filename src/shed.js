// HAAR SHEDDING (technique T3, invented for this film).
//
// The death is the AI compressing a person. A pixelation filter would throw
// the detail away; here the discarded detail *is* the fragments, and the
// same machinery run backwards is the cell cleavage that opens the film.
//
// Build (load time):
//   1. The figure's dabs are projected onto a chart plane and binned into a
//      64×64 grid (quadtree level 6). Each non-empty leaf stores the mean
//      colour, mean position and dab count of its dabs (its Haar scaling
//      coefficient).
//   2. Each leaf gets a quantisation time from a front sweeping from the
//      trailing edge to the face, with a ragged edge.
//   3. Each leaf has a slot in a mosaic (a spaced copy of the grid) and a
//      "life colour": the colour of the moment of the life its column stands
//      for. Levels 5..0 store the means of their children's life colours.
//
// Per frame (vertex shaders, closed-form in t, no state):
//   dab    — at its leaf's time it slides into the cell centre and vanishes
//            into the square (its detail is gone);
//   square — appears at the cell as the dabs collapse, detaches, tumbles along
//            an arc to its mosaic slot, blooms from the figure's colour into
//            its life colour, then at each merge k slides into its level-(6-k)
//            ancestor's position, size and mean colour. Four squares become one
//            because they are drawn identically; no instance is ever created
//            or destroyed. At the end the single square contracts and rounds
//            (superellipse exponent 40 → 2) into the bead;
//   dust   — the residual (what the averaging discards) falls away and fades.

import { DabSet, MAT } from './dabs.js';
import { texture2D } from './gl.js';
import { BRUSH, brushLayer } from './brushes.js';

export const LEAF = 64;
const LEVEL_X = [62, 60, 56, 48, 32, 0]; // x offsets of levels 0..5 in the colour texture (row 64+)

const COMMON = `
uniform sampler2D uShedCol;
uniform vec3 uShO, uShA, uShB, uShN;
uniform vec4 uShP;      // pitch, fill, flight duration, detach delay
uniform vec4 uMrgA;      // merge times T1..T4
uniform vec4 uMrgB;      // T5, T6, contraction start, contraction end
uniform vec4 uBead;      // bead position xyz, radius
uniform vec4 uMrgD;      // merge duration, arc lift, -, -
vec3 shedCol(float L, float i, float j) {
  float k = exp2(6.0 - L);
  float I = floor(i / k), J = floor(j / k);
  ivec2 tc = L > 5.5 ? ivec2(int(I), int(J)) : ivec2(int(I) + ${'${LX}'}, 64 + int(J));
  vec3 c = texelFetch(uShedCol, tc, 0).rgb;
  return c * c;
}
vec3 slot(float L, float i, float j) {
  float k = exp2(6.0 - L);
  float I = floor(i / k), J = floor(j / k);
  vec2 g = (vec2(I, J) + 0.5) * k - 32.0;
  return uShO + (uShA * g.x + uShB * g.y) * uShP.x;
}
float mergeT(int k) {
  return k == 1 ? uMrgA.x : k == 2 ? uMrgA.y : k == 3 ? uMrgA.z : k == 4 ? uMrgA.w : k == 5 ? uMrgB.x : uMrgB.y;
}
`;

function levelX() {
  // GLSL expression for the level x offset (levels 0..5)
  return `(L < 0.5 ? 62 : L < 1.5 ? 60 : L < 2.5 ? 56 : L < 3.5 ? 48 : L < 4.5 ? 32 : 0)`;
}

export const ANIM_SHED_SQUARE = COMMON.replace('${LX}', levelX()) + `
void animate(inout Dab d) {
  float tq = aAnim.x, i = aAnim.y, j = aAnim.z, seed = aAnim.w;
  float t = uTime;
  vec3 C = d.pos;
  float appear = smoothstep(tq + 0.05, tq + 0.3, t);
  d.alpha *= uAlpha * appear;
  // flight to the mosaic slot
  float td = tq + uShP.w + seed * 0.5;
  float f = clamp((t - td) / uShP.z, 0.0, 1.0);
  float fe = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 M = slot(6.0, i, j);
  vec3 P = mix(C, M, fe) + (uShB * 0.6 + uShN * 0.4) * sin(3.14159 * f) * uMrgD.y * (0.4 + seed);
  // tumble like a card, ending flat
  float spin = sin(3.14159 * fe) * (2.0 + seed * 5.0);
  d.rot = spin * 0.5 + (1.0 - fe) * (seed - 0.5);
  d.aspect = mix(1.0, max(0.12, abs(cos(spin))), sin(3.14159 * f));
  float S = d.size;
  vec3 col = mix(d.color, shedCol(6.0, i, j), smoothstep(0.25, 0.95, f));
  // merges: slide into the ancestor, take its size and mean colour
  float base = uShP.x * 0.5 * uShP.y;
  S = mix(S, base, fe);
  for (int k = 1; k <= 6; k++) {
    float T = mergeT(k);
    float fk = smoothstep(T, T + uMrgD.x, t);
    if (fk <= 0.0) break;
    float L = 6.0 - float(k);
    float ek = fk * fk * (3.0 - 2.0 * fk);
    P = mix(P, slot(L, i, j), ek);
    S = mix(S, base * exp2(6.0 - L), ek);
    col = mix(col, shedCol(L, i, j), fk);
  }
  // contraction into the bead
  float fc = smoothstep(uMrgB.z, uMrgB.w, t);
  P = mix(P, uBead.xyz, fc * fc);
  S = mix(S, uBead.w, 1.0 - (1.0 - fc) * (1.0 - fc));
  col = mix(col, vec3(0.9, 0.62, 0.25), fc);
  d.shape = mix(40.0, 2.0, sqrt(fc));
  d.alpha *= 1.0 - smoothstep(uMrgB.w - 0.05, uMrgB.w + 0.25, t);
  d.pos = P;
  d.size = S;
  d.color = col;
  d.normal = uShN;
  d.tangent = vec3(0.0);
  d.emissive = 0.15 + 0.6 * fc;
}`;

export const ANIM_SHED_FIGURE = `
uniform vec4 uShedF;   // collapse duration, -, -, -
void animate(inout Dab d) {
  float tq = aAnim.x;
  vec3 C = aAnim.yzw;
  float f = clamp((uTime - tq) / uShedF.x, 0.0, 1.0);
  d.pos = mix(d.pos, C, f * f);
  d.size *= 1.0 - 0.85 * f;
  d.alpha *= uAlpha * (1.0 - smoothstep(0.55, 1.0, f));
}`;

export const ANIM_SHED_DUST = `
void animate(inout Dab d) {
  float te = aAnim.x;
  float a = uTime - te;
  if (a < 0.0) { d.alpha = 0.0; return; }
  vec3 v = aAnim.yzw;
  float life = 2.2 + aExtra.x * 2.0;
  // drag, a drift to the right (time runs on) and gravity (vertical gravity)
  float k = 1.2;
  float disp = (1.0 - exp(-k * a)) / k;
  d.pos += v * disp + vec3(0.25, -0.12, 0.0) * a * a * 0.5 + vec3(0.0, -0.05, 0.0) * a;
  d.alpha *= uAlpha * smoothstep(0.0, 0.08, a) * (1.0 - smoothstep(life * 0.4, life, a));
  d.size *= 1.0 - 0.6 * smoothstep(0.0, life, a);
}`;

// dabs: array of DabSet.add descriptors; o: see below
export function buildShed(gl, dabs, r, o) {
  const N = LEAF;
  const { origin, A, B, Nrm, size } = o.chart;
  const cs = size / N;
  const cnt = new Float32Array(N * N), col = new Float32Array(N * N * 3), pos = new Float32Array(N * N * 3);
  const cellOf = new Int32Array(dabs.length);
  dabs.forEach((d, k) => {
    const rel = [d.pos[0] - origin[0], d.pos[1] - origin[1], d.pos[2] - origin[2]];
    const u = rel[0] * A[0] + rel[1] * A[1] + rel[2] * A[2];
    const v = rel[0] * B[0] + rel[1] * B[1] + rel[2] * B[2];
    const i = Math.max(0, Math.min(N - 1, Math.floor(u / cs)));
    const j = Math.max(0, Math.min(N - 1, Math.floor(v / cs)));
    const c = i + j * N;
    cellOf[k] = c;
    const w = d.size * d.size;
    cnt[c] += w;
    for (let q = 0; q < 3; q++) {
      col[c * 3 + q] += d.color[q] * w;
      pos[c * 3 + q] += d.pos[q] * w;
    }
  });
  // leaf data and times
  const tq = new Float32Array(N * N);
  const figCol = [], leaves = [];
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const c = i + j * N;
      if (cnt[c] <= 0) continue;
      const w = cnt[c];
      const mc = [col[c * 3] / w, col[c * 3 + 1] / w, col[c * 3 + 2] / w];
      const mp = [pos[c * 3] / w, pos[c * 3 + 1] / w, pos[c * 3 + 2] / w];
      // cell centre on the chart, at the cell's mean depth
      const dep = (mp[0] - origin[0]) * Nrm[0] + (mp[1] - origin[1]) * Nrm[1] + (mp[2] - origin[2]) * Nrm[2];
      const cc = [0, 1, 2].map((q) => origin[q] + A[q] * (i + 0.5) * cs + B[q] * (j + 0.5) * cs + Nrm[q] * dep);
      tq[c] = o.sweep((i + 0.5) / N, (j + 0.5) / N, r);
      leaves.push({ i, j, c, mc, cc });
    }
  // figure dabs with their collapse targets
  const fig = new DabSet(dabs.length);
  const leafByC = new Map(leaves.map((l) => [l.c, l]));
  dabs.forEach((d, k) => {
    const l = leafByC.get(cellOf[k]);
    fig.add({ ...d, anim: [tq[l.c], l.cc[0], l.cc[1], l.cc[2]] });
  });
  fig.build(gl, o.sortDir);
  // squares
  const sq = new DabSet(leaves.length);
  leaves.forEach((l) => {
    sq.add({ pos: l.cc, size: cs * 0.5, layer: brushLayer(BRUSH.SQUARE, 0), seed: r.next(), color: l.mc, mat: MAT.PAPER,
      anim: [tq[l.c], l.i, l.j, r.next()], normal: Nrm });
  });
  sq.build(gl, o.sortDir);
  // dust: residual detail at quantisation, and at each merge
  const dust = new DabSet();
  leaves.forEach((l) => {
    const n = r.next() < (o.dustChance ?? 0.5) ? 1 + (r.next() < 0.3 ? 1 : 0) : 0;
    for (let k = 0; k < n; k++) {
      const dir = [r.gauss() * 0.5 + 0.5, r.gauss() * 0.5 + 0.1, r.gauss() * 0.4];
      dust.add({ pos: l.cc.map((x) => x + r.gauss() * cs * 0.4), size: cs * (0.12 + r.next() * 0.3), layer: brushLayer(r.next() < 0.6 ? BRUSH.DOT : BRUSH.FLECK, r.int(0, 2)),
        seed: r.next(), color: l.mc.map((x) => Math.min(1, x * (0.7 + r.next() * 0.6))), mat: r.next() < 0.3 ? MAT.GOLD : MAT.PAINT,
        anim: [tq[l.c] + r.next() * 0.3, dir[0] * 0.6, dir[1] * 0.6, dir[2] * 0.6], extra: [r.next(), 0, 0, 0] });
    }
  });
  // colour pyramid over the life colours
  const life = new Float32Array(N * N * 3);
  const has = new Uint8Array(N * N);
  leaves.forEach((l) => {
    const lc = o.lifeColor(l.i, l.j, l.mc, r);
    life.set(lc, l.c * 3);
    has[l.c] = 1;
  });
  const tex = new Uint8Array(128 * 128 * 4);
  const put = (x, y, c) => {
    const k = (x + y * 128) * 4;
    for (let q = 0; q < 3; q++) tex[k + q] = Math.round(Math.sqrt(Math.max(0, Math.min(1, c[q]))) * 255);
    tex[k + 3] = 255;
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (has[i + j * N]) put(i, j, [life[(i + j * N) * 3], life[(i + j * N) * 3 + 1], life[(i + j * N) * 3 + 2]]);
  let prev = { n: N, c: life, h: has };
  const mergeDust = [];
  for (let L = 5; L >= 0; L--) {
    const n = 1 << L;
    const c = new Float32Array(n * n * 3), h = new Uint8Array(n * n);
    for (let J = 0; J < n; J++)
      for (let I = 0; I < n; I++) {
        let s = [0, 0, 0], m = 0;
        for (let dj = 0; dj < 2; dj++)
          for (let di = 0; di < 2; di++) {
            const ci = I * 2 + di + (J * 2 + dj) * prev.n;
            if (prev.h[ci]) {
              m++;
              for (let q = 0; q < 3; q++) s[q] += prev.c[ci * 3 + q];
            }
          }
        if (m) {
          h[I + J * n] = 1;
          for (let q = 0; q < 3; q++) c[(I + J * n) * 3 + q] = s[q] / m;
          put(LEVEL_X[L] + I, 64 + J, [s[0] / m, s[1] / m, s[2] / m]);
          mergeDust.push({ L, I, J, col: [s[0] / m, s[1] / m, s[2] / m], m });
        }
      }
    prev = { n, c, h };
  }
  // dust released by each merge, from the mosaic
  const mosPos = (L, I, J) => {
    const k = 1 << (6 - L);
    const g = [(I + 0.5) * k - 32, (J + 0.5) * k - 32];
    return [0, 1, 2].map((q) => o.mosaic.origin[q] + (o.mosaic.A[q] * g[0] + o.mosaic.B[q] * g[1]) * o.mosaic.pitch);
  };
  mergeDust.forEach((md) => {
    const k = 6 - md.L; // merge index producing this level
    const T = o.merges[k - 1];
    const n = Math.min(6, 1 + Math.round(md.m * 0.8 * (md.L < 3 ? 2 : 1)));
    for (let q = 0; q < n; q++) {
      const p0 = mosPos(md.L, md.I, md.J);
      const spread = o.mosaic.pitch * (1 << (6 - md.L)) * 0.5;
      dust.add({ pos: p0.map((x, a) => x + (o.mosaic.A[a] * r.gauss() + o.mosaic.B[a] * r.gauss()) * spread), size: o.mosaic.pitch * (0.15 + r.next() * 0.25),
        layer: brushLayer(r.next() < 0.5 ? BRUSH.DOT : BRUSH.SQUARE, r.int(0, 2)), seed: r.next(), color: md.col.map((x) => Math.min(1, x * (0.6 + r.next() * 0.8))), mat: MAT.PAPER,
        anim: [T + r.next() * 0.3, r.gauss() * 0.3, -0.1 + r.gauss() * 0.2, r.gauss() * 0.2], extra: [r.next(), 0, 0, 0] });
    }
  });
  dust.build(gl, o.sortDir);
  const colTex = texture2D(gl, 128, 128, { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.NEAREST, data: tex });
  const M = o.mosaic;
  const uniforms = (extra = {}) => ({
    ...extra,
    bind: (p) => {
      p.tex('uShedCol', 3, colTex)
        .v3('uShO', M.origin).v3('uShA', M.A).v3('uShB', M.B).v3('uShN', M.N)
        .v4('uShP', [M.pitch, M.fill, o.flight ?? 2.0, o.detach ?? 0.35])
        .v4('uMrgA', o.merges.slice(0, 4)).v4('uMrgB', [o.merges[4], o.merges[5], o.contract[0], o.contract[1]])
        .v4('uBead', [...o.bead.pos, o.bead.r]).v4('uMrgD', [o.mergeDur ?? 0.55, o.lift ?? 0.4, 0, 0])
        .v4('uShedF', [o.collapse ?? 0.4, 0, 0, 0]);
    },
  });
  return { fig, sq, dust, colTex, uniforms, leaves: leaves.length, tq };
}
