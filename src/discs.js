// Beads, coins, pearls, moon-phase discs, bubbles (techniques T7, T8).
//
// Instanced camera-facing discs shaded analytically: a coin is a flat gold
// disc with fine concentric grooves; a pearl and the bead are spheres; a moon
// is a textured disc split by a terminator; a bubble is a thin bright rim
// around an almost empty interior. All are antialiased by distance.

import { program, instancedVAO } from './gl.js';

export const DISC = { COIN: 0, PEARL: 1, MOON: 2, BEAD: 3, BUBBLE: 4, DOT: 5, TAG: 6 };

const VS = `
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPosR;      // xyz, radius
layout(location=2) in vec4 aParam;     // type, p1, p2, seed
layout(location=3) in vec4 aAnim;      // appear time, fade, sway amplitude, sway phase
uniform mat4 uView, uProj, uModel;
uniform float uTime, uAlpha;
uniform vec2 uRes;
uniform float uFocus, uAperture;
uniform vec4 uP0;                      // sway frequency, vertical slide, -, -
out vec2 vQ;
out float vType, vP1, vP2, vSeed, vAlpha, vDepth, vPx;
out vec3 vVP;
void main() {
  vec3 p = aPosR.xyz;
  float t0 = aAnim.x;
  float a = uAlpha * smoothstep(t0, t0 + max(aAnim.y, 1e-3), uTime);
  // gentle pendulum sway of hanging things
  p.x += aAnim.z * sin(uTime * uP0.x + aAnim.w);
  p.y += uP0.y;
  vec4 vp = uView * uModel * vec4(p, 1.0);
  float z = -vp.z;
  if (a <= 0.002 || z < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float pxPerUnit = uProj[1][1] * 0.5 * uRes.y / z;
  float rPx = aPosR.w * pxPerUnit;
  float coc = uAperture * abs(z - uFocus) / z * uRes.y;
  float grow = (rPx + 0.5 * coc + 1.0) / max(rPx, 1e-4);
  a *= min(1.0, (rPx * rPx + 1.0) / ((rPx + 0.5 * coc) * (rPx + 0.5 * coc) + 1.0));
  if (rPx < 0.7) a *= rPx / 0.7;
  vp.xy += aCorner * aPosR.w * grow;
  vQ = aCorner * grow;
  vType = aParam.x; vP1 = aParam.y; vP2 = aParam.z; vSeed = aParam.w;
  vAlpha = a;
  vDepth = z;
  vPx = max(rPx, 0.7) / grow;
  vPx = rPx;
  vVP = vp.xyz;
  gl_Position = uProj * vp;
}`;

const FS = `
in vec2 vQ;
in float vType, vP1, vP2, vSeed, vAlpha, vDepth, vPx;
in vec3 vVP;
uniform vec3 uGold, uGoldHi, uBone, uKeyDir, uKeyCol, uAmb;
uniform vec4 uGlowPos; uniform vec3 uGlowCol;
uniform float uCore;     // bead's inner warmth
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oDepth;
float h(float x) { return fract(sin(x * 91.7 + vSeed * 13.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(12.9898, 78.233)) + vSeed) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1, 0), vec2(12.9898, 78.233)) + vSeed) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0, 1), vec2(12.9898, 78.233)) + vSeed) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1, 1), vec2(12.9898, 78.233)) + vSeed) * 43758.5453);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
void main() {
  float r = length(vQ);
  float aa = 1.0 / max(vPx, 0.5);
  float cov = clamp((1.0 - r) / aa + 0.5, 0.0, 1.0);
  if (cov <= 0.0) discard;
  vec3 col; float a = cov;
  vec3 L = uKeyDir;
  int type = int(vType + 0.5);
  if (type == 0) {
    // gold coin: fine concentric grooves, brushed, a band of light
    float grooves = 0.5 + 0.5 * sin(r * (60.0 + 40.0 * h(1.0)) + vn(vQ * 3.0) * 2.0);
    float ang = atan(vQ.y, vQ.x);
    float band = pow(max(0.0, cos(ang - (2.3 + vP1))), 3.0);
    float lum = 0.25 + 0.35 * grooves + 0.9 * band * (0.5 + 0.5 * grooves);
    float rim = smoothstep(0.86, 0.94, r) * (1.0 - smoothstep(0.96, 1.0, r));
    col = uGold * lum * uKeyCol + uGoldHi * rim * 0.6 + uGold * uAmb;
    col *= 0.75 + 0.5 * vn(vQ * 9.0);
  } else if (type == 1 || type == 3) {
    // sphere: pearl (cream) or the bead (gold glass with a warm core)
    vec3 n = vec3(vQ, sqrt(max(0.0, 1.0 - r * r)));
    float ndl = max(dot(n, L), 0.0);
    vec3 H = normalize(L + vec3(0, 0, 1));
    float spec = pow(max(dot(n, H), 0.0), 60.0);
    float fres = pow(1.0 - n.z, 3.0);
    if (type == 1) {
      col = uBone * (uAmb * 2.0 + uKeyCol * (0.25 + 0.75 * ndl)) + vec3(spec) * 0.8 + uBone * fres * 0.3;
    } else {
      vec3 glass = uGold * (0.18 + 0.5 * ndl) + uGoldHi * spec * 2.5 + uGoldHi * fres * 1.2;
      float core = exp(-r * r * 3.5) * uCore;
      col = glass + vec3(1.0, 0.55, 0.22) * core * 2.2;
    }
  } else if (type == 2) {
    // moon-phase disc: textured, split light and dark by a terminator
    float tex = 0.6 + 0.4 * vn(vQ * 5.0 + 3.0) - 0.25 * smoothstep(0.1, 0.0, abs(vn(vQ * 8.0) - 0.5));
    float ph = vP1;                                  // terminator position -1..1
    float sx = vQ.x / max(sqrt(max(0.0, 1.0 - vQ.y * vQ.y)), 1e-3);
    float lit = smoothstep(ph - 0.06, ph + 0.06, sx * sign(vP2 + 0.001));
    col = mix(vec3(0.02), uBone * tex * 0.9, lit);
    col += uGold * 0.04;
  } else if (type == 4) {
    // bubble: thin bright rim, faint interior, one glint
    float rim = smoothstep(0.80, 0.97, r) * (1.0 - smoothstep(0.985, 1.0, r));
    float inner = 0.06 + 0.1 * smoothstep(0.4, 0.95, r);
    float glint = exp(-dot(vQ - vec2(-0.38, 0.42), vQ - vec2(-0.38, 0.42)) * 60.0);
    a = cov * clamp(inner + rim * 0.9 + glint * 0.8, 0.0, 1.0);
    col = mix(uGold, uGoldHi, 0.5) * (0.5 + rim * 1.4 + glint * 2.0);
    col += vec3(0.6, 0.35, 0.5) * 0.15 * smoothstep(0.5, 0.9, r) * (1.0 - rim);
  } else if (type == 5) {
    // glowing dot
    float core = exp(-r * r * 4.0);
    col = uGoldHi * (0.6 + 1.4 * core);
    a = cov * (0.5 + 0.5 * core);
  } else {
    // tag: a small rectangle chip hung on a thread
    vec2 q = abs(vQ);
    float d = max(q.x * 1.6, q.y) ;
    a = clamp((0.95 - d) / aa + 0.5, 0.0, 1.0);
    if (a <= 0.0) discard;
    col = mix(uBone, uGold, h(2.0)) * (0.35 + 0.4 * vn(vQ * 6.0)) * uKeyCol;
  }
  float gd = length(uGlowPos.xyz - vVP) / max(uGlowPos.w, 1e-3);
  col += col * uGlowCol / (1.0 + gd * gd);
  a *= vAlpha;
  oColor = vec4(col * a, a);
  oDepth = vec4(vDepth * a, 0.0, 0.0, a);
}`;

export class DiscSet {
  constructor() {
    this.items = [];
  }
  // d: { pos, r, type, p1=0, p2=0, seed=0, t0=-1e9, fade=0.001, sway=0, phase=0 }
  add(d) {
    this.items.push([...d.pos, d.r, d.type, d.p1 ?? 0, d.p2 ?? 0, d.seed ?? 0, d.t0 ?? -1e9, d.fade ?? 0.001, d.sway ?? 0, d.phase ?? 0]);
    return this;
  }
  build(gl) {
    const data = new Float32Array(this.items.length * 12);
    let cx = 0, cy = 0, cz = 0;
    this.items.forEach((it, i) => {
      data.set(it, i * 12);
      cx += it[0]; cy += it[1]; cz += it[2];
    });
    const n = Math.max(1, this.items.length);
    this.center = [cx / n, cy / n, cz / n];
    this.gpu = instancedVAO(gl, data, 48, [
      { size: 4, offset: 0 },
      { size: 4, offset: 16 },
      { size: 4, offset: 32 },
    ]);
    this.count = this.items.length;
    this.items = null;
    return this;
  }
}

export function createDiscRenderer(gl) {
  const prog = program(gl, VS, FS, 'discs');
  return {
    draw(set, frame, u = {}) {
      if (!set.gpu || !set.count || (u.alpha ?? 1) <= 0.001) return;
      const L = frame.light;
      prog.use()
        .m4('uView', frame.view).m4('uProj', frame.proj).m4('uModel', u.model ?? frame.identity)
        .f1('uTime', frame.time).f1('uAlpha', u.alpha ?? 1).f2('uRes', frame.res[0], frame.res[1])
        .f1('uFocus', frame.focus).f1('uAperture', frame.aperture).v4('uP0', u.p0 ?? [0.6, 0, 0, 0])
        .v3('uGold', u.gold ?? [0.66, 0.36, 0.07]).v3('uGoldHi', u.goldHi ?? [0.92, 0.77, 0.43]).v3('uBone', u.bone ?? [0.81, 0.76, 0.63])
        .v3('uKeyDir', L.keyDir).v3('uKeyCol', L.keyCol).v3('uAmb', L.amb)
        .v4('uGlowPos', L.glowPos).v3('uGlowCol', L.glowCol).f1('uCore', u.core ?? 0.3);
      gl.bindVertexArray(set.gpu.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, set.count);
      gl.bindVertexArray(null);
    },
  };
}
