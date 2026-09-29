// Object-space mosaic and palette strips (the heart of T1's cellular look).
//
// Looking closely at the references, a paint mass is one continuous mosaic:
// irregular flat patches separated by dark cracks, running straight across
// individual strokes. So the cells cannot belong to the brush stamps (that
// reads as confetti). Instead, one tileable Voronoi mosaic is sampled in
// object space by every dab of a mass. A dab contributes only shape (coverage)
// and relief (height); the colour of each patch comes from a palette strip
// evaluated at the patch's centre, plus per-patch jitter.
//
// Mosaic texel: R = cell hash, G = crack (1 on borders), BA = offset from the
// texel to the cell centre (in cell units, 0.5 = zero).

import { program, texture2D, framebuffer, bindTarget, FULLSCREEN_VS, drawFullscreen } from './gl.js';
import { HEX } from './palette.js';

export const MOSAIC_SIZE = 1024;
export const MOSAIC_CELLS = 40; // cells across one tile

const FS = `
in vec2 vUV;
out vec4 o;
uniform float uCells;
vec2 h22(vec2 p, float period) {
  p = mod(p, period);
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float h1(vec2 p, float period) { p = mod(p, period); return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// Voronoi with ids of the two nearest cells. Returns F1 vector and border distance.
void vor(vec2 p, float period, float jit, out vec2 r1, out vec2 id1, out vec2 id2, out float border) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    vec2 g = vec2(x, y);
    vec2 o = h22(i + g, period);
    vec2 r = g + 0.5 + (o - 0.5) * jit - f;
    float d = length(r);
    if (d < d1) { d2 = d1; id2 = id1; d1 = d; r1 = r; id1 = i + g; } else if (d < d2) { d2 = d; id2 = i + g; }
  }
  border = d2 - d1;
}
void main() {
  // coarse patches; about half of them are broken into finer patches
  vec2 pc = vUV * uCells;
  vec2 r1, a1, a2; float bc;
  vor(pc, uCells, 0.95, r1, a1, a2, bc);
  float hc = h1(mod(a1, uCells), uCells);
  float sub = step(0.52, hc);
  vec2 pf = vUV * uCells * 2.6;
  vec2 r2, b1, b2; float bf;
  vor(pf, uCells * 2.6, 0.9, r2, b1, b2, bf);
  float hf = h1(mod(b1, uCells * 2.6) + 7.0, uCells * 2.6);
  // some borders are invisible: the crack strength depends on the pair of cells
  float pairC = h1(mod(a1 + a2 * 1.37, uCells) + 3.0, uCells);
  float pairF = h1(mod(b1 + b2 * 1.37, uCells * 2.6) + 5.0, uCells * 2.6);
  float crackC = (1.0 - smoothstep(0.015, 0.075, bc)) * step(0.22, pairC) * (0.55 + 0.45 * pairC);
  float crackF = (1.0 - smoothstep(0.02, 0.1, bf)) * step(0.35, pairF) * (0.4 + 0.5 * pairF);
  float crack = max(crackC, crackF * sub);
  float hash = mix(hc, fract(hc * 3.7 + hf), sub);
  // offset to the patch centre (coarse cell units), packed around 0.5
  vec2 toC = mix(r1, r2 / 2.6, sub);
  vec2 off = clamp(toC * 0.25 + 0.5, 0.0, 1.0);
  o = vec4(hash, crack, off);
}`;

export function createMosaic(gl) {
  const tex = texture2D(gl, MOSAIC_SIZE, MOSAIC_SIZE, { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR, wrap: gl.REPEAT });
  const fb = framebuffer(gl, MOSAIC_SIZE, MOSAIC_SIZE, [tex]);
  const prog = program(gl, FULLSCREEN_VS, FS, 'mosaic');
  bindTarget(gl, fb);
  gl.disable(gl.BLEND);
  prog.use().f1('uCells', MOSAIC_CELLS);
  drawFullscreen(gl);
  bindTarget(gl, null);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  return tex;
}

// Palette strips: each row is a gradient of stops (hex, position).
export const PAL = {
  LIFE: 0,      // the whole life, birth (0) to death (1)
  EMBRYO: 1,    // core (0) to edge (1)
  FIGURE: 2,    // marble, smoke, gold leaf
  PARTNER: 3,   // violet-teal companion
  CHILD: 4,     // fresh gold
  WARM: 5,      // gold / amber / crimson splashes
  COOL: 6,      // teal / slate / bone
  GREY: 7,      // bone / ash / black shatter
  CELLS: 8,     // blood cells behind the embryo
};
const H = HEX;
const ROWS = [
  [[H.goldHi, 0], [H.gold, 0.08], [H.amber, 0.2], [H.crimson, 0.34], [H.magenta, 0.44], [H.violet, 0.52], [H.teal, 0.62], [H.slate, 0.74], [H.bone, 0.86], [H.ash, 0.94], ['#2a2a2e', 1]],
  [['#FFF4D6', 0], [H.goldHi, 0.18], [H.amber, 0.45], ['#D0561F', 0.7], [H.crimson, 0.85], ['#5a1a1c', 1]],
  [[H.bone, 0], ['#C9C3B4', 0.2], [H.gold, 0.35], ['#8A8F96', 0.5], [H.slate, 0.68], ['#1c2630', 0.85], ['#0c0e12', 1]],
  [[H.violet, 0], ['#7a5aa8', 0.25], [H.teal, 0.55], [H.slate, 0.8], ['#1a2230', 1]],
  [[H.goldHi, 0], [H.gold, 0.4], [H.amber, 0.8], [H.crimson, 1]],
  [[H.goldHi, 0], [H.gold, 0.25], [H.amber, 0.5], [H.crimson, 0.75], [H.magenta, 1]],
  [[H.bone, 0], ['#7fb7c0', 0.3], [H.teal, 0.55], [H.slate, 0.8], ['#1a2632', 1]],
  [[H.bone, 0], ['#bdbdb8', 0.3], [H.ash, 0.6], ['#3a3a3c', 0.85], ['#0a0a0c', 1]],
  [['#E4803A', 0], [H.crimson, 0.35], ['#7a1e22', 0.7], ['#3a0e14', 1]],
];

export function createPaletteTexture(gl) {
  const W = 256, Hh = 16;
  const data = new Uint8Array(W * Hh * 4);
  const parse = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  ROWS.forEach((stops, row) => {
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      let k = 0;
      while (k < stops.length - 2 && u > stops[k + 1][1]) k++;
      const [ha, pa] = stops[k], [hb, pb] = stops[k + 1];
      const t = Math.min(1, Math.max(0, (u - pa) / Math.max(1e-6, pb - pa)));
      const a = parse(ha), b = parse(hb);
      for (let c = 0; c < 3; c++) data[(row * W + x) * 4 + c] = Math.round(a[c] + (b[c] - a[c]) * t);
      data[(row * W + x) * 4 + 3] = 255;
    }
  });
  const tex = texture2D(gl, W, Hh, { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR, data });
  return tex;
}
