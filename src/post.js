// Post (technique T13) and background (T12).
//
// Order: bloom from (paint + lines) → exposure → soft-shoulder tonemap →
// grade → painterly black background under everything → vignette → grain →
// triangular dither → sRGB. The dither runs last, on every pixel, so dark
// gradients never band in 8-bit output.

import { program, texture2D, framebuffer, bindTarget, FULLSCREEN_VS, drawFullscreen } from './gl.js';

const DOWN_FS = `
in vec2 vUV;
uniform sampler2D uSrc;
uniform sampler2D uSrc2;
uniform vec2 uTexel;
uniform float uFirst;
uniform float uLineGain;
out vec4 o;
vec3 fetch(vec2 uv) {
  vec3 c = texture(uSrc, uv).rgb;
  if (uFirst > 0.5) c += texture(uSrc2, uv).rgb * uLineGain;
  return c;
}
void main() {
  // 13-tap downsample (Jimenez 2014)
  vec2 t = uTexel;
  vec3 a = fetch(vUV + t * vec2(-2, -2)), b = fetch(vUV + t * vec2(0, -2)), c = fetch(vUV + t * vec2(2, -2));
  vec3 d = fetch(vUV + t * vec2(-1, -1)), e = fetch(vUV + t * vec2(1, -1));
  vec3 f = fetch(vUV + t * vec2(-2, 0)), g = fetch(vUV), h = fetch(vUV + t * vec2(2, 0));
  vec3 i = fetch(vUV + t * vec2(-1, 1)), j = fetch(vUV + t * vec2(1, 1));
  vec3 k = fetch(vUV + t * vec2(-2, 2)), l = fetch(vUV + t * vec2(0, 2)), m = fetch(vUV + t * vec2(2, 2));
  vec3 s = (d + e + i + j) * 0.125 + (a + c + k + m) * 0.03125 + (b + f + h + l) * 0.0625 + g * 0.125;
  if (uFirst > 0.5) {
    // soft knee: only the brighter part of the image blooms strongly
    float br = max(s.r, max(s.g, s.b));
    s *= smoothstep(0.30, 1.6, br);
    s = min(s, vec3(40.0));
  }
  o = vec4(s, 1.0);
}`;

const UP_FS = `
in vec2 vUV;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uWeight;
out vec4 o;
void main() {
  vec2 t = uTexel;
  vec3 s = texture(uSrc, vUV + t * vec2(-1, -1)).rgb + texture(uSrc, vUV + t * vec2(1, -1)).rgb
         + texture(uSrc, vUV + t * vec2(-1, 1)).rgb + texture(uSrc, vUV + t * vec2(1, 1)).rgb
         + 2.0 * (texture(uSrc, vUV + t * vec2(0, -1)).rgb + texture(uSrc, vUV + t * vec2(0, 1)).rgb
                + texture(uSrc, vUV + t * vec2(-1, 0)).rgb + texture(uSrc, vUV + t * vec2(1, 0)).rgb)
         + 4.0 * texture(uSrc, vUV).rgb;
  o = vec4(s / 16.0 * uWeight, 1.0);
}`;

const BG_GEN_FS = `
in vec2 vUV;
out vec4 o;
float h21(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * vn(p); p = p * 2.07 + 13.1; a *= 0.5; } return s; }
void main() {
  // equirect: u = longitude, v = latitude; brush drag is vertical
  vec2 p = vec2(vUV.x * 64.0, vUV.y * 12.0);
  float drag = fbm(vec2(p.x * 1.0, p.y * 0.35));
  float fine = fbm(vec2(p.x * 6.0, p.y * 1.2) + 7.0);
  float stain = smoothstep(0.55, 0.85, fbm(vUV * vec2(9.0, 4.0) + 3.0));
  float cool = smoothstep(0.45, 0.8, fbm(vUV * vec2(5.0, 3.0) + 11.0));
  float v = 0.55 + 0.45 * (drag - 0.5) + 0.25 * (fine - 0.5);
  // r: brightness variation, g: warm stain, b: cool stain
  o = vec4(v, stain, cool, 1.0);
}`;

const COMP_FS = `
in vec2 vUV;
uniform sampler2D uScene;   // premultiplied HDR paint
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform sampler2D uBg;
uniform vec2 uOutRes;
uniform float uLineGain, uBloomGain, uExposure, uSaturation, uGrain, uVignette, uFrame;
uniform vec3 uBlack;        // display-space background colour (#050407 by default)
uniform vec3 uBgTint;       // tint of the painterly texture variation
uniform float uBgAmt;       // strength of the painterly texture (0 = flat black)
uniform vec3 uCamRight, uCamUp, uCamFwd;
uniform vec2 uTanHalf;      // tan(fov/2) * aspect, tan(fov/2)
uniform float uFade;        // global fade to black (1 = full picture)
uniform vec3 uGradeLift, uGradeGain;
out vec4 o;

float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }

void main() {
  vec4 sc = texture(uScene, vUV);
  vec3 li = texture(uLines, vUV).rgb;
  vec3 bl = texture(uBloom, vUV).rgb;
  vec3 hdr = sc.rgb + li * uLineGain + bl * uBloomGain;
  hdr *= uExposure;
  // soft shoulder, linear toe: keeps the blacks exact and rolls highlights into cream
  vec3 m = 1.0 - exp(-hdr);
  float lum = dot(m, vec3(0.2126, 0.7152, 0.0722));
  m = max(mix(vec3(lum), m, uSaturation), 0.0);
  m = uGradeLift + m * uGradeGain;
  // background: view-direction painterly texture, sits under everything
  vec2 ndc = vUV * 2.0 - 1.0;
  vec3 dir = normalize(uCamFwd + uCamRight * ndc.x * uTanHalf.x + uCamUp * ndc.y * uTanHalf.y);
  vec2 eq = vec2(atan(dir.x, -dir.z) / 6.2831853 + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265 + 0.5);
  vec4 bgt = texture(uBg, eq);
  vec3 black = toLin(uBlack);
  vec3 bg = black * (1.0 + uBgAmt * 1.6 * (bgt.r - 0.55));
  bg += uBgAmt * (uBgTint * bgt.g * 0.004 + vec3(0.0006, 0.0010, 0.0018) * bgt.b);
  float cover = clamp(max(sc.a, max(max(m.r, m.g), m.b) * 4.0), 0.0, 1.0);
  vec3 col = m + bg * (1.0 - cover);
  // vignette
  vec2 q = vUV - 0.5;
  col *= 1.0 - uVignette * dot(q, q) * 1.6;
  col *= uFade;
  // grain (luminance only, strongest in the midtones)
  float gl = dot(col, vec3(0.333));
  float gn = (h12(gl_FragCoord.xy + fract(uFrame * 0.618) * 1000.0) - 0.5);
  col *= 1.0 + gn * uGrain * smoothstep(0.0, 0.05, gl) * (1.0 - smoothstep(0.4, 1.0, gl));
  vec3 s = toSRGB(clamp(col, 0.0, 1.0));
  // triangular-pdf dither, 1 LSB
  float d1 = ign(gl_FragCoord.xy + uFrame * 5.588238);
  float d2 = h12(gl_FragCoord.xy * 1.37 + uFrame);
  s += (d1 + d2 - 1.0) / 255.0;
  o = vec4(s, 1.0);
}`;

const COPY_FS = `
in vec2 vUV; uniform sampler2D uSrc; out vec4 o; void main() { o = texture(uSrc, vUV); }`;

export function createPost(gl) {
  const down = program(gl, FULLSCREEN_VS, DOWN_FS, 'bloom.down');
  const up = program(gl, FULLSCREEN_VS, UP_FS, 'bloom.up');
  const comp = program(gl, FULLSCREEN_VS, COMP_FS, 'composite');
  const bgGen = program(gl, FULLSCREEN_VS, BG_GEN_FS, 'bg.gen');

  // painterly background texture, generated once
  const bgTex = texture2D(gl, 2048, 1024, { internal: gl.RGBA16F, type: gl.HALF_FLOAT, filter: gl.LINEAR, wrap: gl.REPEAT });
  const bgFB = framebuffer(gl, 2048, 1024, [bgTex]);
  bindTarget(gl, bgFB);
  gl.disable(gl.BLEND);
  bgGen.use();
  drawFullscreen(gl);
  bindTarget(gl, null);

  let chain = [];
  let cw = 0, ch = 0;
  function resize(w, h) {
    if (w === cw && h === ch) return;
    chain.forEach((l) => { gl.deleteTexture(l.tex); gl.deleteFramebuffer(l.fb.fb); });
    chain = [];
    let lw = Math.max(1, w >> 1), lh = Math.max(1, h >> 1);
    for (let i = 0; i < 7 && lw >= 4 && lh >= 4; i++) {
      const tex = texture2D(gl, lw, lh, { filter: gl.LINEAR });
      chain.push({ tex, fb: framebuffer(gl, lw, lh, [tex]), w: lw, h: lh });
      lw = Math.max(1, lw >> 1);
      lh = Math.max(1, lh >> 1);
    }
    cw = w;
    ch = h;
  }

  // p: { lineGain, bloomGain, bloomRadius, exposure, saturation, grain, vignette, frame, black:[r,g,b] sRGB 0..1, bgTint, bgAmt,
  //      cam:{right,up,fwd,tanHalf:[x,y]}, fade, lift, gain }
  function run(sceneTex, lineTex, p, outW, outH) {
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    // bloom down
    down.use().f1('uLineGain', p.lineGain);
    for (let i = 0; i < chain.length; i++) {
      const src = i === 0 ? sceneTex : chain[i - 1].tex;
      const sw = i === 0 ? sceneTex.w : chain[i - 1].w, sh = i === 0 ? sceneTex.h : chain[i - 1].h;
      bindTarget(gl, chain[i].fb);
      down.tex('uSrc', 0, src).tex('uSrc2', 1, lineTex).f2('uTexel', 1 / sw, 1 / sh).f1('uFirst', i === 0 ? 1 : 0);
      drawFullscreen(gl);
    }
    // bloom up (additive)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    up.use();
    const radius = p.bloomRadius ?? 0.85;
    for (let i = chain.length - 1; i > 0; i--) {
      bindTarget(gl, chain[i - 1].fb);
      up.tex('uSrc', 0, chain[i].tex).f2('uTexel', 1 / chain[i].w, 1 / chain[i].h).f1('uWeight', radius);
      drawFullscreen(gl);
    }
    gl.disable(gl.BLEND);
    // composite to canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, outW, outH);
    const c = p.cam;
    comp.use()
      .tex('uScene', 0, sceneTex).tex('uLines', 1, lineTex).tex('uBloom', 2, chain[0].tex).tex('uBg', 3, bgTex)
      .f2('uOutRes', outW, outH)
      .f1('uLineGain', p.lineGain).f1('uBloomGain', p.bloomGain).f1('uExposure', p.exposure).f1('uSaturation', p.saturation)
      .f1('uGrain', p.grain).f1('uVignette', p.vignette).f1('uFrame', p.frame)
      .v3('uBlack', p.black).v3('uBgTint', p.bgTint).f1('uBgAmt', p.bgAmt)
      .v3('uCamRight', c.right).v3('uCamUp', c.up).v3('uCamFwd', c.fwd).v2('uTanHalf', c.tanHalf)
      .f1('uFade', p.fade).v3('uGradeLift', p.lift).v3('uGradeGain', p.gain);
    drawFullscreen(gl);
  }

  return { resize, run, bgTex };
}
