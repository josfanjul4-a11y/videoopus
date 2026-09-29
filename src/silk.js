// Silk ribbons (technique T5).
//
// A ribbon is a triangle strip around an authored centreline with a twist.
// The shading is what makes it silk: many fine bright fibres running along the
// length, low overall opacity, and a sheen that brightens where the band is
// seen edge-on (grazing view), which is where silk looks dense and glowing in
// ref 3. The strip is drawn in the matter pass with premultiplied blending and
// writes composited depth like paint does.
//
// Motion (flutter, reveal) is a function of t in the vertex shader.

import { program } from './gl.js';

const VS = `
layout(location=0) in vec4 aPos;     // xyz, s (0..1 along)
layout(location=1) in vec4 aSide;    // across-offset direction (world), v (-1..1)
layout(location=2) in vec4 aNrm;     // band normal (world), width
uniform mat4 uView, uProj, uModel;
uniform float uTime;
uniform vec4 uFlutter;   // amplitude, spatial freq, temporal freq, phase
uniform vec4 uReveal;    // s0 (tail), s1 (head), head glow width, fade
out float vS, vV, vFacing, vDepth;
out vec3 vVP;
void main() {
  float s = aPos.w, v = aSide.w;
  vec3 p = aPos.xyz + aSide.xyz * v * aNrm.w * 0.5;
  // flutter: a travelling wave along the band, stronger at the edges
  float w = sin(s * uFlutter.y - uTime * uFlutter.z + uFlutter.w) + 0.5 * sin(s * uFlutter.y * 2.3 + uTime * uFlutter.z * 0.7 + v * 1.7);
  p += aNrm.xyz * w * uFlutter.x * (0.4 + 0.6 * abs(v));
  vec4 vp = uView * uModel * vec4(p, 1.0);
  vec3 n = normalize(mat3(uView) * mat3(uModel) * aNrm.xyz);
  vec3 vd = normalize(-vp.xyz);
  vFacing = abs(dot(n, vd));
  vS = s;
  vV = v;
  vDepth = -vp.z;
  vVP = vp.xyz;
  gl_Position = uProj * vp;
}`;

const FS = `
in float vS, vV, vFacing, vDepth;
in vec3 vVP;
uniform vec3 uColA, uColB;     // body tint, fibre highlight
uniform float uAlpha, uFibres, uSheen, uLength;
uniform vec4 uReveal;
uniform vec4 uGlowPos; uniform vec3 uGlowCol;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oDepth;
float h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
void main() {
  float head = uReveal.y, tail = uReveal.x;
  if (vS > head || vS < tail) discard;
  float av = abs(vV);
  // fine straight fibres: many faint parallel lines across the width
  float x = (vV * 0.5 + 0.5) * uFibres * 3.0;
  float fi = floor(x);
  float ff = fract(x);
  float fib = exp(-pow((ff - 0.5) / (0.12 + 0.1 * h11(fi)), 2.0)) * (0.3 + 0.7 * h11(fi + 7.0));
  // a smooth sheen across the band and at grazing angles
  float graze = pow(1.0 - vFacing, 2.5);
  float across = 0.6 + 0.4 * cos(vV * 3.14159 * 0.5);
  // thin bright hems along both edges
  float fw = fwidth(vV) * 1.5 + 1e-4;
  float hem = smoothstep(1.0 - fw * 3.0, 1.0 - fw, av) * (1.0 - smoothstep(1.0 - fw, 1.0, av));
  float edgeAA = 1.0 - smoothstep(1.0 - fw, 1.0, av);
  float a = (0.07 * across + 0.22 * graze * uSheen + fib * 0.1 + hem * 0.55) * edgeAA * uAlpha;
  float hd = exp(-max(head - vS, 0.0) / max(uReveal.z, 1e-4));
  a *= mix(1.0, 1.0 + 3.0 * hd, step(head, 0.9999));
  a *= smoothstep(tail, tail + uReveal.w, vS);
  vec3 col = mix(uColA, uColB, clamp(graze * 0.8 + hem + fib * 0.3, 0.0, 1.0));
  float gd = length(uGlowPos.xyz - vVP) / max(uGlowPos.w, 1e-3);
  col += uGlowCol * 0.35 / (1.0 + gd * gd);
  col *= 1.0 + 2.5 * hd * step(head, 0.9999);
  a = clamp(a, 0.0, 1.0);
  oColor = vec4(col * a, a * 0.8);
  oDepth = vec4(vDepth * a * 0.5, 0.0, 0.0, a * 0.5);
}`;

// centre(s) -> [x,y,z]; side(s) -> unit vector across the band; normal(s) -> band normal; width(s)
export class Ribbon {
  constructor({ samples = 400, centre, side, normal, width, length = 1 }) {
    const data = new Float32Array(samples * 2 * 12);
    let o = 0;
    for (let i = 0; i < samples; i++) {
      const s = i / (samples - 1);
      const c = centre(s), sd = side(s), n = normal(s), w = width(s);
      for (const v of [-1, 1]) {
        data.set([c[0], c[1], c[2], s, sd[0], sd[1], sd[2], v, n[0], n[1], n[2], w], o);
        o += 12;
      }
    }
    this.data = data;
    this.count = samples * 2;
    this.length = length;
    const mid = centre(0.5);
    this.center = mid;
  }
  build(gl) {
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.STATIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16);
      gl.vertexAttribDivisor(i, 0);
    }
    gl.bindVertexArray(null);
    this.data = null;
    return this;
  }
}

// Frame a ribbon around a centreline function using a twisting frame.
// centre(s) -> [x,y,z]; twist(s) -> angle; up: reference vector
export function ribbonFromCurve({ centre, twist = () => 0, width, samples = 400, up = [0, 1, 0], length = 1 }) {
  const eps = 1 / (samples * 4);
  const frame = (s) => {
    const a = centre(Math.max(0, s - eps)), b = centre(Math.min(1, s + eps));
    let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const tl = Math.hypot(...t) || 1;
    t = t.map((x) => x / tl);
    // side = normalize(up x t), n = t x side
    let sd = [up[1] * t[2] - up[2] * t[1], up[2] * t[0] - up[0] * t[2], up[0] * t[1] - up[1] * t[0]];
    const sl = Math.hypot(...sd) || 1;
    sd = sd.map((x) => x / sl);
    let n = [t[1] * sd[2] - t[2] * sd[1], t[2] * sd[0] - t[0] * sd[2], t[0] * sd[1] - t[1] * sd[0]];
    const th = twist(s), c = Math.cos(th), si = Math.sin(th);
    const side = sd.map((x, i) => x * c + n[i] * si);
    const nrm = n.map((x, i) => x * c - sd[i] * si);
    return { side, nrm };
  };
  return new Ribbon({ samples, centre, side: (s) => frame(s).side, normal: (s) => frame(s).nrm, width, length });
}

export function createSilkRenderer(gl) {
  const prog = program(gl, VS, FS, 'silk');
  return {
    // u: { model, alpha, colA, colB, fibres, sheen, flutter:[amp,freq,tfreq,phase], reveal:[tail, head, headW, tailFade] }
    draw(rib, frame, u = {}) {
      if (!rib.vao || (u.alpha ?? 1) <= 0.001) return;
      const L = frame.light;
      prog.use()
        .m4('uView', frame.view).m4('uProj', frame.proj).m4('uModel', u.model ?? frame.identity)
        .f1('uTime', frame.time)
        .v4('uFlutter', u.flutter ?? [0.02, 8, 1.5, 0])
        .v4('uReveal', u.reveal ?? [0, 1, 0.01, 0.0001])
        .v3('uColA', u.colA ?? [0.8, 0.7, 0.55]).v3('uColB', u.colB ?? [1.4, 1.25, 1.0])
        .f1('uAlpha', u.alpha ?? 1).f1('uFibres', u.fibres ?? 14).f1('uSheen', u.sheen ?? 1).f1('uLength', rib.length)
        .v4('uGlowPos', L.glowPos).v3('uGlowCol', L.glowCol);
      gl.bindVertexArray(rib.vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, rib.count);
      gl.bindVertexArray(null);
    },
  };
}
