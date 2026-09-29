// The frame: one pure function of t.
//
//   matter pass  → scene colour (premultiplied HDR) + composited depth
//   line pass    → line buffer (MAX blend), softly occluded by the matter
//   post         → bloom, tonemap, grade, background, grain, dither → canvas
//
// A "scene" supplies the camera and grade for time t and a list of draw items.
// Matter items are sorted back to front each frame.

import { createGL, texture2D, framebuffer, bindTarget } from './gl.js';
import { createBrushAtlas } from './brushes.js';
import { createDabRenderer } from './dabs.js';
import { createLineRenderer } from './lines.js';
import { createPost } from './post.js';
import { createMosaic, createPaletteTexture } from './mosaic.js';
import { createSilkRenderer } from './silk.js';
import { createDiscRenderer } from './discs.js';
import { perspective, lookAt, v3, identity } from './math.js';
import { LIN } from './palette.js';

export function createEngine(canvas) {
  const { gl, ext } = createGL(canvas);
  const atlas = createBrushAtlas(gl);
  const mosaic = createMosaic(gl);
  const palette = createPaletteTexture(gl);
  const R = {
    gl,
    ext,
    atlas,
    mosaic,
    palette,
    dabs: createDabRenderer(gl, atlas, mosaic, palette),
    lines: createLineRenderer(gl),
    silk: createSilkRenderer(gl),
    discs: createDiscRenderer(gl),
    post: createPost(gl),
  };
  const ID = identity();
  let T = null;

  function targets(w, h) {
    if (T && T.w === w && T.h === h) return T;
    if (T) {
      [T.color, T.zc, T.lineTex].forEach((t) => gl.deleteTexture(t));
      [T.scene, T.line].forEach((f) => gl.deleteFramebuffer(f.fb));
    }
    const color = texture2D(gl, w, h, { filter: gl.LINEAR });
    const zc = texture2D(gl, w, h, { filter: gl.NEAREST });
    const lineTex = texture2D(gl, w, h, { filter: gl.LINEAR });
    T = {
      w,
      h,
      color,
      zc,
      lineTex,
      scene: framebuffer(gl, w, h, [color, zc]),
      line: framebuffer(gl, w, h, [lineTex]),
    };
    R.post.resize(w, h);
    return T;
  }

  // Render scene at time t into the canvas. scale = dynamic resolution factor.
  function render(scene, t, scale = 1) {
    const outW = gl.drawingBufferWidth, outH = gl.drawingBufferHeight;
    const w = Math.max(16, Math.round(outW * scale)), h = Math.max(16, Math.round(outH * scale));
    const tg = targets(w, h);
    const shot = scene.shot(t);             // { cam:{pos,target,fov,roll,focus,aperture}, grade:{...}, light:{...} }
    const cam = shot.cam;
    const aspect = outW / outH;
    const view = lookAt(cam.pos, cam.target, cam.up ?? [0, 1, 0], cam.roll ?? 0);
    const proj = perspective(cam.fov, aspect, cam.near ?? 0.05, cam.far ?? 600);
    const fwd = v3.norm(v3.sub(cam.target, cam.pos));
    const right = [view[0], view[4], view[8]];
    const up = [view[1], view[5], view[9]];
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
    const frame = {
      t,
      time: t,
      view,
      proj,
      identity: ID,
      res: [w, h],
      widthScale: h / 1080,
      focus: cam.focus ?? v3.dist(cam.pos, cam.target),
      aperture: cam.aperture ?? 0,
      camPos: cam.pos,
      camFwd: fwd,
      matterDepthTex: tg.zc,
      gold: LIN.gold.map((c) => c * 1.6),
      goldHi: LIN.goldHi.map((c) => c * 1.9),
      light: shot.light,
    };
    // transform the light direction and glow position into view space
    const L = shot.light;
    const toView = (d) => v3.norm([view[0] * d[0] + view[4] * d[1] + view[8] * d[2], view[1] * d[0] + view[5] * d[1] + view[9] * d[2], view[2] * d[0] + view[6] * d[1] + view[10] * d[2]]);
    const gp = L.glowWorld ?? [0, 0, 0];
    frame.light = {
      keyDir: toView(L.keyDir),
      keyCol: L.keyCol,
      amb: L.amb,
      rim: L.rim ?? [0, 0, 0],
      glowPos: [
        view[0] * gp[0] + view[4] * gp[1] + view[8] * gp[2] + view[12],
        view[1] * gp[0] + view[5] * gp[1] + view[9] * gp[2] + view[13],
        view[2] * gp[0] + view[6] * gp[1] + view[10] * gp[2] + view[14],
        L.glowRadius ?? 1,
      ],
      glowCol: L.glowCol ?? [0, 0, 0],
    };
    const items = scene.items(t, frame, R);

    // --- matter pass
    bindTarget(gl, tg.scene);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const matter = items.filter((it) => it.kind === 'matter');
    for (const it of matter) {
      const c = it.center ?? [0, 0, 0];
      it.z = v3.dot(v3.sub(c, cam.pos), fwd) + (it.bias ?? 0);
    }
    matter.sort((a, b) => b.z - a.z);
    for (const it of matter) it.draw(frame, R);

    // --- line pass
    bindTarget(gl, tg.line);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.blendFunc(gl.ONE, gl.ONE);
    R.lines.begin(frame);
    for (const it of items) if (it.kind === 'line') it.draw(frame, R);
    gl.blendEquation(gl.FUNC_ADD);
    gl.disable(gl.BLEND);

    // --- post
    const g = shot.grade;
    R.post.run(tg.color, tg.lineTex, {
      lineGain: g.lineGain ?? 1,
      bloomGain: g.bloomGain ?? 0.35,
      bloomRadius: g.bloomRadius ?? 0.85,
      exposure: g.exposure ?? 1,
      saturation: g.saturation ?? 1,
      grain: g.grain ?? 0.05,
      vignette: g.vignette ?? 0.35,
      frame: Math.round(t * 60),
      black: g.black ?? [5 / 255, 4 / 255, 7 / 255],
      bgTint: g.bgTint ?? [1.0, 0.7, 0.4],
      bgAmt: g.bgAmt ?? 0.6,
      cam: { right, up, fwd, tanHalf: [tanHalf * aspect, tanHalf] },
      fade: g.fade ?? 1,
      lift: g.lift ?? [0, 0, 0],
      gain: g.gain ?? [1, 1, 1],
    }, outW, outH);
    return { w, h, items: items.length };
  }

  return { gl, ext, R, render };
}
