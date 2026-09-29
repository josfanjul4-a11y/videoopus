// Thin WebGL2 helpers: programs, textures, framebuffers, instanced buffers.

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 is required');
  const ext = {
    cbf: gl.getExtension('EXT_color_buffer_float'),
    fbl: gl.getExtension('EXT_float_blend'),
    timer: gl.getExtension('EXT_disjoint_timer_query_webgl2'),
    aniso: gl.getExtension('EXT_texture_filter_anisotropic'),
  };
  if (!ext.cbf) throw new Error('EXT_color_buffer_float is required');
  return { gl, ext };
}

const HEADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
`;

function compile(gl, type, src, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    const lines = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}| ${l}`).join('\n');
    console.error(`[${label}] shader compile error\n${log}\n${lines}`);
    throw new Error(`shader compile failed: ${label}: ${log}`);
  }
  return sh;
}

// A program with its uniform locations resolved lazily and cached.
export function program(gl, vs, fs, label = 'prog', defines = '') {
  const p = gl.createProgram();
  const v = compile(gl, gl.VERTEX_SHADER, HEADER + defines + vs, label + '.vs');
  const f = compile(gl, gl.FRAGMENT_SHADER, HEADER + defines + fs, label + '.fs');
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`link failed: ${label}: ${gl.getProgramInfoLog(p)}`);
  }
  gl.deleteShader(v);
  gl.deleteShader(f);
  const locs = new Map();
  const loc = (name) => {
    if (!locs.has(name)) locs.set(name, gl.getUniformLocation(p, name));
    return locs.get(name);
  };
  const api = {
    p,
    label,
    use() {
      gl.useProgram(p);
      return api;
    },
    f1(n, x) { const l = loc(n); if (l) gl.uniform1f(l, x); return api; },
    f2(n, x, y) { const l = loc(n); if (l) gl.uniform2f(l, x, y); return api; },
    f3(n, x, y, z) { const l = loc(n); if (l) gl.uniform3f(l, x, y, z); return api; },
    f4(n, x, y, z, w) { const l = loc(n); if (l) gl.uniform4f(l, x, y, z, w); return api; },
    v2(n, a) { const l = loc(n); if (l) gl.uniform2fv(l, a); return api; },
    v3(n, a) { const l = loc(n); if (l) gl.uniform3fv(l, a); return api; },
    v4(n, a) { const l = loc(n); if (l) gl.uniform4fv(l, a); return api; },
    i1(n, x) { const l = loc(n); if (l) gl.uniform1i(l, x); return api; },
    m4(n, m) { const l = loc(n); if (l) gl.uniformMatrix4fv(l, false, m); return api; },
    m3(n, m) { const l = loc(n); if (l) gl.uniformMatrix3fv(l, false, m); return api; },
    tex(n, unit, texture, target = gl.TEXTURE_2D) {
      const l = loc(n);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, texture);
      if (l) gl.uniform1i(l, unit);
      return api;
    },
  };
  return api;
}

export function texture2D(gl, w, h, { internal = gl.RGBA16F, format = gl.RGBA, type = gl.HALF_FLOAT, filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE, data = null } = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter === gl.LINEAR_MIPMAP_LINEAR ? gl.LINEAR : filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  t.w = w;
  t.h = h;
  return t;
}

// Framebuffer with any number of colour attachments and an optional depth texture.
export function framebuffer(gl, w, h, colors, depth = null) {
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  const bufs = [];
  colors.forEach((tex, i) => {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0);
    bufs.push(gl.COLOR_ATTACHMENT0 + i);
  });
  if (depth) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
  gl.drawBuffers(bufs);
  const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer incomplete: 0x' + st.toString(16));
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fb, w, h, colors, depth, bufs };
}

export function bindTarget(gl, target) {
  if (!target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.viewport(0, 0, target.w, target.h);
  }
}

// Static quad corners used by every instanced renderer: (-1,-1) .. (1,1).
let quadBuf = null;
export function quadCorners(gl) {
  if (!quadBuf) {
    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  }
  return quadBuf;
}

// Build a VAO for an instanced quad renderer.
// layout: [{ name, size, type, normalized, offset }] within one interleaved
// instance buffer of `stride` bytes; attribute locations start at 1
// (location 0 is the quad corner).
export function instancedVAO(gl, data, stride, layout) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadCorners(gl));
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  layout.forEach((a, i) => {
    const locn = i + 1;
    gl.enableVertexAttribArray(locn);
    if (a.int) gl.vertexAttribIPointer(locn, a.size, a.type, stride, a.offset);
    else gl.vertexAttribPointer(locn, a.size, a.type ?? gl.FLOAT, a.normalized ?? false, stride, a.offset);
    gl.vertexAttribDivisor(locn, 1);
  });
  gl.bindVertexArray(null);
  return { vao, buf, count: data.byteLength / stride };
}

// Full-screen triangle (no buffers needed: gl_VertexID based).
export const FULLSCREEN_VS = `
out vec2 vUV;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUV = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

let emptyVAO = null;
export function drawFullscreen(gl) {
  if (!emptyVAO) emptyVAO = gl.createVertexArray();
  gl.bindVertexArray(emptyVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}
