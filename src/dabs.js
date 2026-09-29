// Painterly dab renderer (technique T1).
//
// A dab is one instanced quad in 3D carrying a brush stamp from the atlas.
// Dabs face the camera like strokes on a canvas, but they live at real 3D
// positions, so the paint has true parallax. Each object's dabs are sorted
// back to front at build time along the direction it is mostly seen from;
// objects are sorted per frame. Blending is premultiplied "over", which gives
// the layered look of paint laid on paint.
//
// Two render targets are written: colour (premultiplied HDR) and a composited
// depth (depth * alpha, alpha), which the line renderer uses to hide gold
// lines behind paint.
//
// Motion: every object type supplies an animate() function in GLSL. Motion is a
// closed-form function of uTime and the dab's static attributes, never of
// accumulated state, so any frame can be rendered from t alone.

import { program, instancedVAO } from './gl.js';

export const MAT = { PAINT: 0, GOLD: 1, GLOW: 2, SMOKE: 3, MARBLE: 4, PAPER: 5, BONE: 6, CELLMAT: 7 };

const STRIDE = 64;

export class DabSet {
  constructor(capacity = 1024) {
    this.cap = capacity;
    this.n = 0;
    this.buf = new ArrayBuffer(capacity * STRIDE);
    this.f = new Float32Array(this.buf);
    this.u8 = new Uint8Array(this.buf);
    this.i8 = new Int8Array(this.buf);
    this.min = [Infinity, Infinity, Infinity];
    this.max = [-Infinity, -Infinity, -Infinity];
  }
  grow() {
    const nb = new ArrayBuffer(this.cap * 2 * STRIDE);
    new Uint8Array(nb).set(this.u8);
    this.cap *= 2;
    this.buf = nb;
    this.f = new Float32Array(nb);
    this.u8 = new Uint8Array(nb);
    this.i8 = new Int8Array(nb);
  }
  // d: { pos:[x,y,z], size, rot=0, aspect=1, layer, seed=rand, anim:[4], color:[r,g,b] linear 0..1 (may exceed 1 for glow, clamped), mat=0,
  //      normal:[x,y,z], tangent:[x,y,z], extra:[4] 0..1 }
  add(d) {
    if (this.n >= this.cap) this.grow();
    const i = this.n++;
    const fo = i * 16, bo = i * STRIDE;
    const f = this.f;
    f[fo] = d.pos[0]; f[fo + 1] = d.pos[1]; f[fo + 2] = d.pos[2]; f[fo + 3] = d.size;
    f[fo + 4] = d.rot ?? 0; f[fo + 5] = d.aspect ?? 1; f[fo + 6] = d.layer ?? 0; f[fo + 7] = d.seed ?? 0;
    const an = d.anim ?? [0, 0, 0, 0];
    f[fo + 8] = an[0]; f[fo + 9] = an[1]; f[fo + 10] = an[2]; f[fo + 11] = an[3];
    const c = d.color, u = this.u8, s = this.i8;
    // colour is stored in a perceptual encoding (sqrt) to keep dark shades precise
    u[bo + 48] = Math.round(Math.sqrt(Math.min(1, Math.max(0, c[0]))) * 255);
    u[bo + 49] = Math.round(Math.sqrt(Math.min(1, Math.max(0, c[1]))) * 255);
    u[bo + 50] = Math.round(Math.sqrt(Math.min(1, Math.max(0, c[2]))) * 255);
    u[bo + 51] = d.mat ?? 0;
    const n = d.normal ?? [0, 0, 0];
    s[bo + 52] = Math.round(Math.max(-1, Math.min(1, n[0])) * 127);
    s[bo + 53] = Math.round(Math.max(-1, Math.min(1, n[1])) * 127);
    s[bo + 54] = Math.round(Math.max(-1, Math.min(1, n[2])) * 127);
    s[bo + 55] = Math.round(Math.max(-1, Math.min(1, d.nw ?? 0)) * 127);
    const t = d.tangent ?? [0, 0, 0];
    s[bo + 56] = Math.round(Math.max(-1, Math.min(1, t[0])) * 127);
    s[bo + 57] = Math.round(Math.max(-1, Math.min(1, t[1])) * 127);
    s[bo + 58] = Math.round(Math.max(-1, Math.min(1, t[2])) * 127);
    s[bo + 59] = Math.round(Math.max(-1, Math.min(1, d.tw ?? 0)) * 127);
    const e = d.extra ?? [0, 0, 0, 0];
    u[bo + 60] = Math.round(Math.min(1, Math.max(0, e[0])) * 255);
    u[bo + 61] = Math.round(Math.min(1, Math.max(0, e[1])) * 255);
    u[bo + 62] = Math.round(Math.min(1, Math.max(0, e[2])) * 255);
    u[bo + 63] = Math.round(Math.min(1, Math.max(0, e[3])) * 255);
    for (let k = 0; k < 3; k++) {
      if (d.pos[k] < this.min[k]) this.min[k] = d.pos[k];
      if (d.pos[k] > this.max[k]) this.max[k] = d.pos[k];
    }
    return i;
  }
  // Sort back to front for a camera looking along viewDir.
  sort(viewDir) {
    const n = this.n, f = this.f;
    const keys = new Float32Array(n);
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      keys[i] = f[i * 16] * viewDir[0] + f[i * 16 + 1] * viewDir[1] + f[i * 16 + 2] * viewDir[2];
      idx[i] = i;
    }
    idx.sort((a, b) => keys[b] - keys[a]);
    const nb = new ArrayBuffer(n * STRIDE);
    const src = new Uint8Array(this.buf), dst = new Uint8Array(nb);
    for (let i = 0; i < n; i++) dst.set(src.subarray(idx[i] * STRIDE, idx[i] * STRIDE + STRIDE), i * STRIDE);
    this.buf = nb;
    this.f = new Float32Array(nb);
    this.u8 = new Uint8Array(nb);
    this.i8 = new Int8Array(nb);
    this.cap = n;
    return this;
  }
  build(gl, viewDir = null) {
    if (viewDir) this.sort(viewDir);
    const F = gl.FLOAT, UB = gl.UNSIGNED_BYTE, B = gl.BYTE;
    const data = new Uint8Array(this.buf, 0, this.n * STRIDE);
    this.gpu = instancedVAO(gl, data, STRIDE, [
      { size: 4, type: F, offset: 0 },
      { size: 4, type: F, offset: 16 },
      { size: 4, type: F, offset: 32 },
      { size: 4, type: UB, normalized: true, offset: 48 },
      { size: 4, type: B, normalized: true, offset: 52 },
      { size: 4, type: B, normalized: true, offset: 56 },
      { size: 4, type: UB, normalized: true, offset: 60 },
    ]);
    this.count = this.n;
    this.center = [(this.min[0] + this.max[0]) / 2, (this.min[1] + this.max[1]) / 2, (this.min[2] + this.max[2]) / 2];
    return this;
  }
}

// ---------------------------------------------------------------------------

const VS_HEAD = `
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPosSize;
layout(location=2) in vec4 aShape;    // rot, aspect, layer, seed
layout(location=3) in vec4 aAnim;
layout(location=4) in vec4 aColor;    // sqrt-encoded rgb, material/255
layout(location=5) in vec4 aNormal;
layout(location=6) in vec4 aTangent;
layout(location=7) in vec4 aExtra;
uniform mat4 uView, uProj, uModel;
uniform float uTime;
uniform vec2 uRes;
uniform float uFocus, uAperture;
uniform float uAlpha;
uniform float uSizeScale;
uniform vec4 uP0, uP1, uP2, uP3;
struct Dab {
  vec3 pos; float size; float alpha; float rot; float aspect; vec3 color; float emissive; vec3 normal; float layer;
  vec3 tangent; float lod; float shape;
};
float hashf(float n) { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }
`;

const VS_MAIN = `
uniform vec3 uMosA, uMosB;     // object-fixed plane axes for the mosaic
uniform float uMosScale;        // mosaic cells per world unit
out vec2 vUV;
out vec3 vColor;
out float vMat, vLayer, vSeed, vAlpha, vDepth, vEmis, vLod, vSizePx;
out vec3 vN, vT;
out vec3 vVP;
out vec2 vMos;
out float vShape;
void main() {
  Dab d;
  vec3 rest = aPosSize.xyz;
  d.pos = rest; d.size = aPosSize.w * uSizeScale; d.alpha = 1.0; d.rot = aShape.x; d.aspect = aShape.y;
  d.color = aColor.rgb * aColor.rgb; d.emissive = 0.0; d.normal = aNormal.xyz; d.layer = aShape.z;
  d.tangent = aTangent.xyz; d.lod = 0.0; d.shape = 0.0;
  float restSize = d.size;
  animate(d);
  vec4 wp = uModel * vec4(d.pos, 1.0);
  vec4 vp = uView * wp;
  float z = -vp.z;
  if (d.alpha <= 0.002 || z < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  // pixel size of the dab and depth-of-field circle of confusion
  float pxPerUnit = uProj[1][1] * 0.5 * uRes.y / z;
  float sizePx = d.size * pxPerUnit;
  float cocPx = uAperture * abs(z - uFocus) / z * uRes.y;
  float grow = sizePx + cocPx;
  float a = d.alpha * min(1.0, (sizePx * sizePx + 1.0) / (grow * grow + 1.0));
  // sub-pixel dabs fade out rather than shimmer
  float minPx = 1.25;
  if (grow < minPx) { a *= (grow * grow) / (minPx * minPx); grow = minPx; }
  float scale = grow / max(sizePx, 1e-4);
  // orientation: along the projected tangent if there is one
  float rot = d.rot, rotM = d.rot;
  if (dot(d.tangent, d.tangent) > 0.01) {
    vec3 tw = mat3(uModel) * d.tangent;
    vec3 tv = mat3(uView) * tw;
    rot += atan(tv.y, tv.x);
    rotM += atan(dot(d.tangent, uMosB), dot(d.tangent, uMosA));
  }
  float c = cos(rot), s = sin(rot);
  vec2 corner = vec2(aCorner.x * d.aspect, aCorner.y);
  vec2 off = corner * d.size * scale;
  off = vec2(c * off.x - s * off.y, s * off.x + c * off.y);
  vp.xy += off;
  vVP = vp.xyz;
  gl_Position = uProj * vp;
  // object-space mosaic coordinate: stable in time, continuous across dabs
  float cm = cos(rotM), sm = sin(rotM);
  vec2 lo = corner * restSize;
  lo = vec2(cm * lo.x - sm * lo.y, sm * lo.x + cm * lo.y);
  vMos = (vec2(dot(rest, uMosA), dot(rest, uMosB)) + lo) * uMosScale;
  vUV = aCorner * 0.5 + 0.5;
  vShape = d.shape;
  vColor = d.color;
  vMat = aColor.a * 255.0;
  vLayer = d.layer;
  vSeed = aShape.w;
  vAlpha = a;
  vDepth = z;
  vEmis = d.emissive;
  vSizePx = grow;
  vLod = log2(max(1.0, scale)) + d.lod;
  vec3 nv = mat3(uView) * (mat3(uModel) * d.normal);
  vN = dot(nv, nv) > 0.01 ? normalize(nv) : vec3(0.0, 0.0, 1.0);
  vT = vec3(c, s, 0.0);
}`;

const FS = `
in vec2 vUV;
in vec3 vColor;
in float vMat, vLayer, vSeed, vAlpha, vDepth, vEmis, vLod, vSizePx;
in vec3 vN, vT;
in vec3 vVP;
in vec2 vMos;
in float vShape;
uniform sampler2DArray uBrush;
uniform sampler2D uMosaic, uPalette;
uniform vec3 uKeyDir, uKeyCol, uAmb, uRimCol;
uniform vec4 uGlowPos;   // view space xyz, radius
uniform vec3 uGlowCol;
uniform vec3 uAccentA, uAccentB;
uniform float uAccentAmt, uCrack, uJitter;
uniform vec4 uField;      // dir.xy, scale, offset (u along the palette strip)
uniform vec4 uFieldN;     // noise freq, noise amp, per-cell spread, palette row
uniform vec3 uFieldC;     // radial centre (plane coords), mode (0 linear, 1 radial)
uniform float uCellMix;   // 0 = dab colour, 1 = palette field colour
uniform float uFacet;     // per-cell facet tilt
uniform float uTorn;      // edges follow the cell borders
uniform float uMosScaleF;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oDepth;

vec3 toLin(vec3 c) { return c * c * (c * 0.2 + 0.8); }
float sinNoise(vec2 p) {
  return 0.5 * sin(p.x * 1.7 + sin(p.y * 1.3 + 1.1) * 1.9) + 0.35 * sin(p.y * 2.3 + sin(p.x * 1.9 + 2.3) * 1.7) + 0.15 * sin((p.x + p.y) * 3.7);
}

void main() {
  vec4 b = texture(uBrush, vec3(vUV, vLayer), vLod);
  // mosaic cell at this fragment (object space)
  vec4 m = texture(uMosaic, vMos / 40.0);
  float cellH = fract(m.r + vSeed * uCellMix * 0.0);
  // torn edges: a patch is either in or out of the stroke, decided per cell
  float cov = b.r;
  if (vShape > 0.5) {
    // analytic square-to-circle (superellipse, exponent vShape) for shed flakes
    vec2 q = abs(vUV * 2.0 - 1.0);
    float n = vShape;
    float d = pow(pow(q.x, n) + pow(q.y, n), 1.0 / n);
    float w = fwidth(d) * 1.2 + 1e-4;
    cov = smoothstep(1.0 + w * 0.5, 1.0 - w * 0.5, d);
    // paper fold marks along a diagonal, like ref 2's squares
    float fold = 1.0 - smoothstep(0.0, 0.045, abs(q.x - q.y) * 0.7071);
    b = vec4(cov, 0.5 + 0.1 * step(vUV.x, vUV.y), b.b, fold * step(22.0, n) * 0.55);
  }
  if (uTorn > 0.0) {
    float thr = mix(0.5, 0.15 + 0.7 * cellH, uTorn);
    float w = fwidth(cov) + 0.02;
    cov = mix(cov, smoothstep(thr - w, thr + w, cov), uTorn);
  }
  float a = cov * vAlpha;
  if (a < 0.003) discard;
  // impasto normal from the stamp's height channel, flattened on small dabs
  float e = 1.5 / 256.0 * exp2(vLod);
  float hx = texture(uBrush, vec3(vUV + vec2(e, 0.0), vLayer), vLod).g - texture(uBrush, vec3(vUV - vec2(e, 0.0), vLayer), vLod).g;
  float hy = texture(uBrush, vec3(vUV + vec2(0.0, e), vLayer), vLod).g - texture(uBrush, vec3(vUV - vec2(0.0, e), vLayer), vLod).g;
  float relief = 3.0 * smoothstep(6.0, 40.0, vSizePx);
  vec2 g = vec2(hx, hy) * relief;
  vec2 gv = vec2(vT.x * g.x - vT.y * g.y, vT.y * g.x + vT.x * g.y);
  // each patch is a slightly tilted facet
  vec2 facet = (vec2(fract(cellH * 17.3), fract(cellH * 31.7)) - 0.5) * uFacet;
  vec3 n = normalize(vN + vec3(-gv + facet, 0.0) * (vMat == 3.0 ? 0.0 : 1.0));
  // colour: dab colour or the palette field at the patch centre
  vec3 col = vColor;
  if (uCellMix > 0.0) {
    vec2 centre = (vMos + (m.ba - 0.5) * 4.0) / uMosScaleF;
    float u;
    if (uFieldC.z < 0.5) u = dot(centre, uField.xy) * uField.z + uField.w;
    else u = length(centre - uFieldC.xy) * uField.z + uField.w;
    u += uFieldN.y * (sinNoise(centre * uFieldN.x) + 0.6 * sinNoise(centre * uFieldN.x * 2.9 + 4.1)) + (cellH - 0.5) * uFieldN.z;
    vec3 pc = toLin(texture(uPalette, vec2(clamp(u, 0.002, 0.998), (uFieldN.w + 0.5) / 16.0)).rgb);
    col = mix(col, pc, uCellMix);
  }
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float j2 = fract(cellH * 5.37 + vSeed * 0.31);
  col = max(mix(vec3(lum), col, 1.0 + (j2 - 0.5) * 0.45 * uJitter), 0.0);
  col *= 1.0 + (fract(cellH * 3.1) - 0.5) * 0.5 * uJitter;
  if (cellH > 1.0 - uAccentAmt) col = mix(col, uAccentA, 0.7);
  else if (cellH < uAccentAmt * 0.6) col = mix(col, uAccentB, 0.6);
  float crack = max(m.g, b.a * 0.4) * uCrack;
  vec3 L = uKeyDir;
  vec3 V = vec3(0.0, 0.0, 1.0);
  float ndl = dot(n, L);
  vec3 outc;
  if (vMat == 1.0) {
    // gold leaf: metallic, bright when it catches the key light
    vec3 H = normalize(L + V);
    float nh = max(dot(n, H), 0.0);
    outc = col * (0.12 + 0.6 * pow(nh, 3.0)) * uKeyCol + col * pow(nh, 24.0) * 1.8 * uKeyCol + col * uAmb * 0.7;
  } else if (vMat == 2.0) {
    // inner light: emissive with a warm subsurface ramp
    float wrap = clamp((ndl + 0.6) / 1.6, 0.0, 1.0);
    outc = col * (uAmb + uKeyCol * wrap * 0.5) + col * vEmis;
  } else if (vMat == 3.0) {
    // smoke: soft, no relief
    outc = col * (uAmb * 1.4 + uKeyCol * 0.35) + col * vEmis;
    crack = 0.0;
  } else {
    float wrap = vMat == 4.0 ? clamp((ndl + 0.12) / 1.12, 0.0, 1.0) : clamp((ndl + 0.4) / 1.4, 0.0, 1.0);
    vec3 H = normalize(L + V);
    float gloss = vMat == 5.0 ? 0.0 : pow(max(dot(n, H), 0.0), 30.0) * (vMat == 4.0 ? 0.35 : 0.18);
    outc = col * (uAmb + uKeyCol * wrap) + uKeyCol * gloss * lum;
    outc += col * vEmis;
  }
  // local glow (embryo, star) lights nearby paint
  float gd = length(uGlowPos.xyz - vVP) / max(uGlowPos.w, 1e-3);
  outc += col * uGlowCol / (1.0 + gd * gd);
  // rim: edges catch the light, as in the references
  float edge = smoothstep(0.0, 0.5, cov) * (1.0 - smoothstep(0.5, 1.0, cov));
  outc += uRimCol * edge * 0.6;
  outc *= 1.0 - crack * 0.9;
  oColor = vec4(outc * a, a);
  oDepth = vec4(vDepth * a, 0.0, 0.0, a);
}`;

export const ANIM_STATIC = `
void animate(inout Dab d) {
  // aAnim.x = appear time, aAnim.y = fade-in duration
  // aAnim.y <= 0 means always visible
  float t0 = aAnim.x, dur = aAnim.y;
  d.alpha *= uAlpha * (dur > 0.0 ? smoothstep(t0, t0 + dur, uTime) : 1.0);
}`;

const cache = new Map();

export function createDabRenderer(gl, atlas, mosaicTex, paletteTex) {
  const get = (animCode) => {
    if (!cache.has(animCode)) cache.set(animCode, program(gl, VS_HEAD + animCode + VS_MAIN, FS, 'dabs'));
    return cache.get(animCode);
  };
  return {
    program: get,
    // frame: { view, proj, res, focus, aperture, time, light:{ keyDir, keyCol, amb, rim, glowPos, glowCol } }
    draw(set, animCode, frame, u = {}) {
      if (!set.gpu || set.count === 0) return;
      const p = get(animCode).use();
      const L = frame.light;
      p.m4('uView', frame.view).m4('uProj', frame.proj).m4('uModel', u.model ?? frame.identity)
        .f1('uTime', frame.time).f2('uRes', frame.res[0], frame.res[1])
        .f1('uFocus', frame.focus).f1('uAperture', frame.aperture)
        .f1('uAlpha', u.alpha ?? 1).f1('uSizeScale', u.sizeScale ?? 1)
        .v4('uP0', u.p0 ?? [0, 0, 0, 0]).v4('uP1', u.p1 ?? [0, 0, 0, 0]).v4('uP2', u.p2 ?? [0, 0, 0, 0]).v4('uP3', u.p3 ?? [0, 0, 0, 0])
        .v3('uKeyDir', L.keyDir).v3('uKeyCol', L.keyCol).v3('uAmb', L.amb).v3('uRimCol', u.rim ?? L.rim)
        .v4('uGlowPos', L.glowPos).v3('uGlowCol', L.glowCol)
        .v3('uAccentA', u.accentA ?? [1, 1, 1]).v3('uAccentB', u.accentB ?? [0, 0, 0])
        .f1('uAccentAmt', u.accentAmt ?? 0).f1('uCrack', u.crack ?? 1).f1('uJitter', u.jitter ?? 1)
        .v3('uMosA', u.mosA ?? [1, 0, 0]).v3('uMosB', u.mosB ?? [0, 1, 0]).f1('uMosScale', u.mosScale ?? 30).f1('uMosScaleF', u.mosScale ?? 30)
        .v4('uField', u.field ?? [1, 0, 0.1, 0.5]).v4('uFieldN', u.fieldN ?? [1, 0, 0.1, 0]).v3('uFieldC', u.fieldC ?? [0, 0, 0])
        .f1('uCellMix', u.cellMix ?? 0).f1('uFacet', u.facet ?? 0.35).f1('uTorn', u.torn ?? 0.6)
        .tex('uBrush', 0, atlas.tex, gl.TEXTURE_2D_ARRAY).tex('uMosaic', 1, mosaicTex).tex('uPalette', 2, paletteTex);
      if (u.bind) u.bind(p);
      gl.bindVertexArray(set.gpu.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, set.count);
      gl.bindVertexArray(null);
    },
  };
}
