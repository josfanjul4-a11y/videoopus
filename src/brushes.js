// Brush atlas (part of technique T1): every painted mark in the film is a
// stamp from this atlas, generated at load time by a shader, so no image data
// ships with the file.
//
// The references' paint is cellular: seen up close, a splash is a mosaic of
// small flat patches separated by dark hairline cracks (crackle glaze, torn
// paper, dried mud). Each stamp therefore stores, per texel:
//   R  coverage (alpha of the mark)
//   G  impasto height (lit by a raking light in the dab shader)
//   B  cell id hash (the dab shader turns it into per-patch colour jitter)
//   A  crack mask (dark hairlines between patches)
//
// Stamp layer = type * VARIANTS + variant.

import { program, FULLSCREEN_VS, drawFullscreen } from './gl.js';

export const BRUSH = {
  BLOB: 0,     // impasto blob with cells
  BLOB2: 1,    // elongated blob, fewer, bigger cells
  SPLAT: 2,    // splatter: main blob + satellite drops
  SMEAR: 3,    // palette-knife smear
  CRACKLE: 4,  // dense mosaic patch
  FLECK: 5,    // irregular polygon flake (gold leaf)
  SQUARE: 6,   // paper square flake with inner fold marks (ref 2)
  DRIP: 7,     // vertical drip with a bulb (use with a small aspect)
  SLAB: 8,     // tall marbled rectangle (use with a small aspect)
  SMOKE: 9,    // soft fibrous wisp
  STROKE: 10,  // bristle stroke, fibrous
  CELL: 11,    // round cell with membrane
  DOT: 12,     // soft dot (dust)
  SPECKS: 13,  // cluster of tiny specks
  RECT: 14,    // hard-edged rectangle chip (tag / fragment)
};
export const BRUSH_TYPES = 15;
export const VARIANTS = 3;
export const BRUSH_SIZE = 256;

const FS = `
in vec2 vUV;
uniform int uType;
uniform float uSeed;
out vec4 oColor;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21) + uSeed * 0.137); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p) { float n = h21(p); return vec2(n, h21(p + n + 17.17)); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }

// Voronoi: returns (F1, F2 - F1, cell hash)
vec3 voronoi(vec2 p, float jitter) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 o = h22(i + g) * jitter + (1.0 - jitter) * 0.5;
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = h21(i + g + 3.1); } else if (d < d2) { d2 = d; }
  }
  d1 = sqrt(d1); d2 = sqrt(d2);
  return vec3(d1, d2 - d1, id);
}

// Irregular blob outline: signed distance-ish in stamp units (negative inside)
float blobShape(vec2 p, float r, float wob, float freq) {
  float a = atan(p.y, p.x);
  float n = fbm(vec2(cos(a), sin(a)) * freq + uSeed) - 0.5;
  return length(p) - r * (1.0 + wob * n);
}

void main() {
  vec2 uv = vUV;             // 0..1
  vec2 p = uv * 2.0 - 1.0;   // -1..1
  float px = 2.0 / ${BRUSH_SIZE}.0;   // one texel in p units
  float cov = 0.0, h = 0.0, cell = 0.5, crack = 0.0;

  if (uType == 0 || uType == 1 || uType == 2) {
    // impasto blobs and splatter
    vec2 q = p;
    if (uType == 1) q.x *= 0.62;
    vec2 w = vec2(fbm(q * 2.3 + uSeed), fbm(q * 2.3 - uSeed + 5.0)) - 0.5;
    float d = blobShape(q + w * 0.25, 0.70, 0.55, 1.6);
    cov = smoothstep(px * 1.5, -px * 1.5, d);
    float cells = uType == 1 ? 3.2 : 4.6;
    vec3 v = voronoi((q + w * 0.35) * cells + uSeed * 3.0, 0.9);
    cell = v.z;
    crack = 1.0 - smoothstep(0.0, 0.07, v.y);
    float dome = clamp(-d * 2.2, 0.0, 1.0);
    float bristle = sin((q.x * 0.35 + q.y) * 70.0 + fbm(q * 6.0) * 6.0) * 0.5 + 0.5;
    h = dome * (0.55 + 0.45 * v.z) + bristle * 0.12 * dome - crack * 0.25;
    if (uType == 2) {
      // satellite droplets
      float drops = 0.0;
      for (int k = 0; k < 14; k++) {
        float fk = float(k);
        float ang = h21(vec2(fk, 1.0)) * 6.2831;
        float rad = 0.62 + 0.32 * h21(vec2(fk, 2.0));
        float sz = 0.02 + 0.07 * h21(vec2(fk, 3.0)) * h21(vec2(fk, 4.0));
        vec2 c = vec2(cos(ang), sin(ang)) * rad;
        float dd = length(p - c) - sz;
        drops = max(drops, smoothstep(px * 1.5, -px * 1.5, dd));
      }
      // shrink the main blob and add droplets
      float dm = blobShape(q + w * 0.25, 0.48, 0.6, 1.8);
      float cm = smoothstep(px * 1.5, -px * 1.5, dm);
      cov = max(cm, drops);
      h = max(h * cm, drops * 0.6);
    }
  } else if (uType == 3) {
    // palette-knife smear: long, one sharp edge, ridges along the length
    vec2 q = p;
    float top = 0.28 + 0.06 * (fbm(vec2(q.x * 3.0, uSeed)) - 0.5);
    float bot = -0.30 + 0.18 * (fbm(vec2(q.x * 5.0, uSeed + 3.0)) - 0.5);
    float ends = smoothstep(0.95, 0.75 + 0.1 * fbm(q * 4.0), abs(q.x + 0.1 * q.y));
    cov = smoothstep(top + px, top - px, q.y) * smoothstep(bot - px * 3.0, bot + px * 3.0, q.y) * ends;
    vec3 v = voronoi(vec2(q.x * 2.2, q.y * 6.0) + uSeed * 2.0, 0.8);
    cell = v.z;
    crack = (1.0 - smoothstep(0.0, 0.06, v.y)) * 0.8;
    float ridge = sin(q.y * 90.0 + fbm(q * vec2(2.0, 9.0)) * 5.0) * 0.5 + 0.5;
    h = 0.5 + 0.3 * ridge + 0.4 * smoothstep(top - 0.12, top, q.y) - crack * 0.2;
  } else if (uType == 4) {
    // dense crackle mosaic patch
    vec2 w = vec2(fbm(p * 2.0 + uSeed), fbm(p * 2.0 + 7.0 - uSeed)) - 0.5;
    float d = blobShape(p + w * 0.3, 0.78, 0.35, 2.4);
    cov = smoothstep(px * 1.5, -px * 1.5, d);
    vec3 v = voronoi((p + w * 0.2) * 7.5 + uSeed * 4.0, 1.0);
    cell = v.z;
    crack = 1.0 - smoothstep(0.0, 0.10, v.y);
    // some cells missing: holes in the mosaic
    cov *= step(0.12, fract(v.z * 13.1));
    h = 0.5 + 0.35 * v.z - crack * 0.3 + 0.1 * fbm(p * 20.0);
  } else if (uType == 5) {
    // gold leaf fleck: irregular convex polygon, crinkled
    float a = atan(p.y, p.x);
    float r = 0.0;
    float sides = 5.0 + floor(h21(vec2(uSeed, 9.0)) * 3.0);
    float seg = 6.2831 / sides;
    float k = floor((a + 3.14159) / seg);
    float a0 = k * seg - 3.14159, a1 = a0 + seg;
    float r0 = 0.55 + 0.4 * h21(vec2(k, uSeed)), r1 = 0.55 + 0.4 * h21(vec2(mod(k + 1.0, sides), uSeed));
    vec2 P0 = vec2(cos(a0), sin(a0)) * r0, P1 = vec2(cos(a1), sin(a1)) * r1;
    vec2 e = P1 - P0; vec2 n = normalize(vec2(e.y, -e.x));
    float d = dot(p - P0, n);
    cov = smoothstep(px, -px, d);
    float crinkle = fbm(p * 9.0 + uSeed) ;
    h = 0.5 + 0.5 * crinkle;
    vec3 v = voronoi(p * 3.0 + uSeed, 1.0);
    cell = v.z;
    crack = (1.0 - smoothstep(0.0, 0.05, v.y)) * 0.5;
  } else if (uType == 6) {
    // paper square with chipped edges and inner fold marks (ref 2)
    vec2 q = p / 0.86;
    float chip = (fbm(q * 7.0 + uSeed) - 0.5) * 0.06;
    float d = max(abs(q.x), abs(q.y)) - 1.0 + chip;
    cov = smoothstep(px * 1.2, -px * 1.2, d);
    // facets: split by one or two diagonals, like a folded paper square
    float s1 = q.x + q.y, s2 = q.x - q.y;
    float kind = floor(h21(vec2(uSeed, 3.3)) * 3.0);
    float facet = kind < 1.0 ? step(0.0, s1) : (kind < 2.0 ? step(0.0, s1) * 0.5 + step(0.0, s2) * 0.25 : step(0.0, q.x) * 0.5 + step(0.0, s2) * 0.3);
    cell = 0.25 + 0.5 * facet;
    float lineW = 0.02;
    float marks = kind < 1.0 ? 1.0 - smoothstep(0.0, lineW, abs(s1) * 0.7071) : max(1.0 - smoothstep(0.0, lineW, abs(s1) * 0.7071), 1.0 - smoothstep(0.0, lineW, abs(s2) * 0.7071));
    marks *= step(max(abs(q.x), abs(q.y)), 0.7);
    crack = marks * 0.7 + (1.0 - smoothstep(0.0, 0.05, -d)) * 0.35;
    h = 0.5 + 0.08 * fbm(q * 30.0) + 0.12 * facet;
  } else if (uType == 7) {
    // drip: a column that thins downward and ends in a bulb (top of stamp = attach point)
    float y = uv.y;            // 1 = top
    float wtop = 0.34 + 0.08 * (fbm(vec2(y * 3.0, uSeed)) - 0.5);
    float wid = mix(0.10, wtop, smoothstep(0.1, 1.0, y));
    float xoff = (fbm(vec2(y * 2.0, uSeed + 4.0)) - 0.5) * 0.08;
    float body = smoothstep(wid + px, wid - px, abs(p.x - xoff)) * step(0.12, y);
    float bulb = smoothstep(px, -px, length(vec2((p.x - xoff) * 1.0, (y - 0.14) * 3.0)) - 0.16);
    cov = max(body, bulb);
    vec3 v = voronoi(vec2(p.x * 4.0, y * 14.0) + uSeed, 0.8);
    cell = v.z;
    crack = (1.0 - smoothstep(0.0, 0.08, v.y)) * 0.6;
    h = 0.5 + 0.3 * (1.0 - abs(p.x - xoff) / max(wid, 0.05)) - crack * 0.2;
  } else if (uType == 8) {
    // slab: tall rectangle with marbling
    vec2 q = p;
    float edge = (fbm(vec2(q.y * 4.0, uSeed)) - 0.5) * 0.08;
    float d = max(abs(q.x) - 0.82 - edge, abs(q.y) - 0.96);
    cov = smoothstep(px * 1.5, -px * 1.5, d);
    vec2 w = vec2(fbm(q * vec2(1.5, 0.6) + uSeed), fbm(q * vec2(1.5, 0.6) + uSeed + 9.0));
    float marble = sin((q.x * 2.0 + q.y * 0.5 + w.x * 3.0) * 6.0);
    cell = 0.5 + 0.35 * marble;
    crack = (1.0 - smoothstep(0.0, 0.08, abs(marble))) * 0.6;
    vec3 v = voronoi(q * vec2(3.0, 1.5) + uSeed, 1.0);
    crack = max(crack, (1.0 - smoothstep(0.0, 0.04, v.y)) * 0.35);
    h = 0.5 + 0.1 * marble;
  } else if (uType == 9) {
    // smoke wisp: soft, fibrous, elongated along x
    vec2 q = p;
    float env = exp(-q.y * q.y * 7.0) * smoothstep(1.0, 0.3, abs(q.x));
    float fib = fbm(vec2(q.x * 2.0, q.y * 18.0) + uSeed);
    float fib2 = fbm(vec2(q.x * 1.0, q.y * 6.0) - uSeed);
    cov = env * smoothstep(0.35, 0.8, fib * 0.7 + fib2 * 0.6) * 0.8;
    h = 0.5;
    cell = fib;
    crack = 0.0;
  } else if (uType == 10) {
    // bristle stroke: elongated, ragged ends, fine grooves along x
    vec2 q = p;
    float thick = 0.42 + 0.1 * (fbm(vec2(q.x * 2.0, uSeed)) - 0.5);
    float ends = smoothstep(1.0, 0.6 + 0.3 * fbm(vec2(q.y * 8.0, uSeed)), abs(q.x));
    cov = smoothstep(thick + px * 2.0, thick - px * 2.0, abs(q.y + 0.1 * sin(q.x * 2.0 + uSeed))) * ends;
    float grooves = fbm(vec2(q.x * 1.5, q.y * 40.0) + uSeed);
    cov *= smoothstep(0.2, 0.45, grooves + 0.25);
    h = 0.4 + 0.6 * grooves;
    vec3 v = voronoi(vec2(q.x * 1.5, q.y * 5.0) + uSeed, 0.9);
    cell = v.z;
    crack = (1.0 - smoothstep(0.0, 0.05, v.y)) * 0.4;
  } else if (uType == 11) {
    // round cell with a membrane and organelles
    float r = length(p);
    float d = r - 0.82 - 0.04 * (fbm(p * 3.0 + uSeed) - 0.5);
    cov = smoothstep(px * 1.5, -px * 1.5, d);
    float rim = smoothstep(-0.18, -0.02, d);
    vec3 v = voronoi(p * 5.0 + uSeed, 1.0);
    float org = (1.0 - smoothstep(0.08, 0.14, v.x)) * step(0.6, v.z);
    cell = 0.4 + 0.3 * rim + 0.2 * org;
    crack = rim * 0.5;
    h = 0.6 - 0.3 * r * r + 0.2 * org;
  } else if (uType == 12) {
    // soft dot
    float r = length(p);
    cov = exp(-r * r * 6.0) * 0.6 + smoothstep(0.35 + px, 0.35 - px, r) * 0.4;
    h = 1.0 - r;
    cell = 0.5;
  } else if (uType == 13) {
    // specks cluster
    float s = 0.0;
    for (int k = 0; k < 12; k++) {
      float fk = float(k);
      vec2 c = (vec2(h21(vec2(fk, 7.0)), h21(vec2(fk, 8.0))) * 2.0 - 1.0) * 0.8;
      float sz = 0.03 + 0.06 * h21(vec2(fk, 9.0)) * h21(vec2(fk, 10.0));
      s = max(s, smoothstep(px * 1.5, -px * 1.5, length(p - c) - sz));
    }
    cov = s;
    h = s;
    cell = h21(floor(p * 6.0));
  } else if (uType == 14) {
    // hard rectangle chip
    vec2 q = p;
    float chip = (fbm(q * 9.0 + uSeed) - 0.5) * 0.05;
    float d = max(abs(q.x) - 0.9, abs(q.y) - 0.9) + chip;
    cov = smoothstep(px, -px, d);
    vec3 v = voronoi(q * 2.5 + uSeed, 1.0);
    cell = v.z;
    crack = (1.0 - smoothstep(0.0, 0.04, v.y)) * 0.45;
    h = 0.5 + 0.2 * v.z;
  }
  oColor = vec4(clamp(cov, 0.0, 1.0), clamp(h, 0.0, 1.0), cell, clamp(crack, 0.0, 1.0));
}`;

export function createBrushAtlas(gl) {
  const layers = BRUSH_TYPES * VARIANTS;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  const levels = Math.log2(BRUSH_SIZE) + 1;
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.RGBA8, BRUSH_SIZE, BRUSH_SIZE, layers);
  const prog = program(gl, FULLSCREEN_VS, FS, 'brushes');
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, BRUSH_SIZE, BRUSH_SIZE);
  gl.disable(gl.BLEND);
  prog.use();
  for (let t = 0; t < BRUSH_TYPES; t++) {
    for (let v = 0; v < VARIANTS; v++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex, 0, t * VARIANTS + v);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      prog.i1('uType', t).f1('uSeed', 1.7 + v * 13.37 + t * 0.71);
      drawFullscreen(gl);
    }
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { tex, layers };
}

export const brushLayer = (type, variant) => type * VARIANTS + (variant % VARIANTS);
