// Hairline gold linework (technique T2).
//
// Every line in the film (circles, arcs, threads, grids, the tree, ruler
// ticks, the title) is a polyline in 3D. Each segment is one instance: a quad
// expanded in screen space to the line's pixel width plus a 1 px AA fringe.
// Coverage is analytic (distance to the segment in pixels), so a 1.2 px line
// stays 1.2 px at any distance. Lines are drawn into their own buffer with MAX
// blending, which keeps overlapping segment ends from forming bright beads at
// the joints. They are depth-tested softly against the matter: the fragment
// reads the matter's composited depth and coverage and fades when behind it.
//
// Per-vertex data of a polyline point: position, arc-length u in [0, 1],
// width in px, intensity. Draw-on reveal and dashes are functions of u.

import { program, instancedVAO } from './gl.js';

const VS = `
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aP0;   // xyz, u0
layout(location=2) in vec4 aP1;   // xyz, u1
layout(location=3) in vec4 aW;    // width0 px, width1 px, intensity0, intensity1
layout(location=4) in vec4 aStyle;// dash period (in u), dash duty, dash phase, colour mix (0 gold .. 1 goldHi)
uniform mat4 uView, uProj;
uniform mat4 uModel;
uniform vec2 uRes;          // render target size in px
uniform float uWidthScale;  // resolution scale (px widths are authored at 1080p)
uniform float uFocus, uAperture;
out vec2 vPx;       // fragment position in px along/across the segment
out float vLen;     // segment length in px
out float vHalfW;   // half width px
out float vU;       // arc length
out float vInt;
out vec4 vStyle;
out float vDepth;
out float vBlur;
void main() {
  vec4 w0 = uModel * vec4(aP0.xyz, 1.0);
  vec4 w1 = uModel * vec4(aP1.xyz, 1.0);
  vec4 v0 = uView * w0, v1 = uView * w1;
  // clip segment against the near plane
  float near = -0.02;
  if (v0.z > near && v1.z > near) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  if (v0.z > near) v0 = mix(v1, v0, (v1.z - near) / (v1.z - v0.z));
  if (v1.z > near) v1 = mix(v0, v1, (v0.z - near) / (v0.z - v1.z));
  vec4 c0 = uProj * v0, c1 = uProj * v1;
  vec2 s0 = (c0.xy / c0.w * 0.5 + 0.5) * uRes;
  vec2 s1 = (c1.xy / c1.w * 0.5 + 0.5) * uRes;
  vec2 d = s1 - s0;
  float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float t = aCorner.x * 0.5 + 0.5;          // 0 at p0, 1 at p1
  float zv = -mix(v0.z, v1.z, t);
  // point-based depth of field: out-of-focus lines widen and dim
  float coc = uAperture * abs(zv - uFocus) / max(zv, 1e-3);
  float hw = 0.5 * mix(aW.x, aW.y, t) * uWidthScale;
  float blur = coc * uRes.y;
  float halfW = hw + 0.5 * blur;
  float ext = halfW + 1.0;                  // AA fringe
  vec2 sp = mix(s0, s1, t) + dir * (aCorner.x * ext) + nrm * (aCorner.y * ext);
  vPx = vec2(t * len + aCorner.x * ext, aCorner.y * ext);
  vLen = len;
  vHalfW = halfW;
  vU = mix(aP0.w, aP1.w, t);
  vInt = mix(aW.z, aW.w, t) * (hw / max(halfW, 1e-3));
  vStyle = aStyle;
  vDepth = zv;
  vBlur = blur;
  float zc = mix(c0.z / c0.w, c1.z / c1.w, t);
  gl_Position = vec4(sp / uRes * 2.0 - 1.0, zc, 1.0);
}`;

const FS = `
in vec2 vPx; in float vLen; in float vHalfW; in float vU; in float vInt; in vec4 vStyle; in float vDepth; in float vBlur;
uniform sampler2D uMatterDepth;  // r = depth*alpha, a = alpha (composited)
uniform vec2 uRes;
uniform float uReveal;      // draw-on: fraction of u that is visible
uniform float uRevealHead;  // brightness of the drawing head
uniform float uAlpha;
uniform vec3 uGold, uGoldHi;
uniform float uOcclude;     // 1 = fade behind matter
layout(location=0) out vec4 oColor;
void main() {
  // distance to segment in px
  float x = clamp(vPx.x, 0.0, vLen);
  float dist = length(vec2(vPx.x - x, vPx.y));
  float cov = clamp(vHalfW + 0.5 - dist, 0.0, 1.0);
  if (vHalfW < 0.5) cov *= vHalfW * 2.0;   // sub-pixel lines fade instead of thinning
  // soft halo just around the core (the references' lines glow a little)
  float halo = exp(-dist * dist / (2.0 * (vHalfW + 1.2) * (vHalfW + 1.2))) * 0.18;
  float a = max(cov, halo);
  // draw-on reveal
  float rv = smoothstep(uReveal + 0.002, uReveal - 0.002, vU);
  float head = exp(-abs(vU - uReveal) * 400.0) * uRevealHead * step(0.0005, uReveal) * step(uReveal, 0.9995);
  a *= rv;
  // dashes
  if (vStyle.x > 0.0) {
    float ph = fract(vU / vStyle.x + vStyle.z);
    float edge = 0.08;
    a *= smoothstep(0.0, edge, ph) * smoothstep(vStyle.y, vStyle.y - edge, ph);
  }
  // soft occlusion behind matter
  if (uOcclude > 0.0) {
    vec4 md = texture(uMatterDepth, gl_FragCoord.xy / uRes);
    float mz = md.r / max(md.a, 1e-4);
    float behind = smoothstep(0.0, 0.08 * mz, vDepth - mz);
    a *= 1.0 - uOcclude * behind * clamp(md.a * 1.15, 0.0, 1.0);
  }
  float i = vInt * uAlpha;
  vec3 col = mix(uGold, uGoldHi, vStyle.w) * i * a + uGoldHi * head * a * 3.0;
  oColor = vec4(col, a * i);
}`;

// A line batch: many polylines packed into one instanced buffer. Each polyline
// becomes segments. Reveal and alpha are per batch (uniforms), so things that
// animate independently go in separate batches.
export class LineBatch {
  constructor() {
    this.segs = [];
  }
  // pts: array of [x,y,z]; opts: width (px), width1, intensity, dash [period, duty, phase], hi (0..1)
  polyline(pts, opts = {}) {
    const n = pts.length;
    if (n < 2) return this;
    const w0 = opts.width ?? 1.2, w1 = opts.width1 ?? w0;
    const i0 = opts.intensity ?? 1, i1 = opts.intensity1 ?? i0;
    const dash = opts.dash ?? [0, 1, 0];
    const hi = opts.hi ?? 0;
    // arc length for u
    const acc = [0];
    for (let i = 1; i < n; i++) {
      const a = pts[i - 1], b = pts[i];
      acc.push(acc[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    const total = acc[n - 1] || 1;
    const u0 = opts.u0 ?? 0, u1 = opts.u1 ?? 1;
    for (let i = 0; i < n - 1; i++) {
      const ta = acc[i] / total, tb = acc[i + 1] / total;
      const wa = w0 + (w1 - w0) * ta, wb = w0 + (w1 - w0) * tb;
      const ia = i0 + (i1 - i0) * ta, ib = i0 + (i1 - i0) * tb;
      this.segs.push([
        ...pts[i], u0 + (u1 - u0) * ta,
        ...pts[i + 1], u0 + (u1 - u0) * tb,
        wa, wb, ia, ib,
        dash[0], dash[1], dash[2], hi,
      ]);
    }
    return this;
  }
  circle(center, radius, opts = {}) {
    // circle in the plane spanned by axes a and b (default XY)
    const a = opts.axisA ?? [1, 0, 0], b = opts.axisB ?? [0, 1, 0];
    const start = opts.start ?? Math.PI / 2, sweep = opts.sweep ?? -Math.PI * 2;
    const seg = opts.segments ?? Math.max(24, Math.min(256, Math.round(Math.abs(sweep) * radius * 40 + 32)));
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const th = start + (sweep * i) / seg;
      const c = Math.cos(th) * radius, s = Math.sin(th) * radius;
      pts.push([center[0] + a[0] * c + b[0] * s, center[1] + a[1] * c + b[1] * s, center[2] + a[2] * c + b[2] * s]);
    }
    return this.polyline(pts, opts);
  }
  line(p0, p1, opts = {}) {
    return this.polyline([p0, p1], opts);
  }
  build(gl) {
    const data = new Float32Array(this.segs.length * 16);
    this.segs.forEach((s, i) => data.set(s, i * 16));
    const F = gl.FLOAT;
    this.gpu = instancedVAO(gl, data, 64, [
      { size: 4, type: F, offset: 0 },
      { size: 4, type: F, offset: 16 },
      { size: 4, type: F, offset: 32 },
      { size: 4, type: F, offset: 48 },
    ]);
    this.count = this.segs.length;
    this.segs = null;
    return this;
  }
}

export function createLineRenderer(gl) {
  const prog = program(gl, VS, FS, 'lines');
  return {
    prog,
    // frame: { view, proj, res:[w,h], widthScale, focus, aperture, matterDepthTex, gold, goldHi }
    begin(frame) {
      prog.use()
        .m4('uView', frame.view)
        .m4('uProj', frame.proj)
        .f2('uRes', frame.res[0], frame.res[1])
        .f1('uWidthScale', frame.widthScale)
        .f1('uFocus', frame.focus)
        .f1('uAperture', frame.aperture)
        .v3('uGold', frame.gold)
        .v3('uGoldHi', frame.goldHi)
        .tex('uMatterDepth', 0, frame.matterDepthTex);
    },
    draw(batch, { model, reveal = 1, revealHead = 0, alpha = 1, occlude = 1 } = {}) {
      if (!batch.gpu || alpha <= 0.001 || reveal <= 0) return;
      prog.m4('uModel', model).f1('uReveal', reveal).f1('uRevealHead', revealHead).f1('uAlpha', alpha).f1('uOcclude', occlude);
      gl.bindVertexArray(batch.gpu.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, batch.count);
      gl.bindVertexArray(null);
    },
  };
}
