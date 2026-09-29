// Seeded randomness. Nothing in the film may call Math.random(): every
// procedural choice comes from these generators so that a given build always
// produces the same film.

// mulberry32: small, fast, good enough for procedural content.
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
    // Approximately normal (Irwin-Hall, n = 4), mean 0, sd 1.
    gauss: () => (next() + next() + next() + next() - 2) * 1.7320508,
    // Weighted choice: weights is an array of numbers.
    weighted: (weights) => {
      let s = 0;
      for (const w of weights) s += w;
      let x = next() * s;
      for (let i = 0; i < weights.length; i++) {
        x -= weights[i];
        if (x <= 0) return i;
      }
      return weights.length - 1;
    },
    unitVec3: () => {
      const z = 2 * next() - 1, a2 = 2 * Math.PI * next(), s = Math.sqrt(1 - z * z);
      return [s * Math.cos(a2), s * Math.sin(a2), z];
    },
  };
  return r;
}

// Integer hash to [0, 1).
export function hash1(n) {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// Smooth 1D value noise, deterministic.
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash1(i * 374761393 + seed * 668265263);
  const b = hash1((i + 1) * 374761393 + seed * 668265263);
  return a + (b - a) * u;
}

// 3D value noise in [-1, 1] and a few octaves of it.
export function noise3(x, y, z, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const h = (a, b, c) => hash1(a * 73856093 ^ b * 19349663 ^ c * 83492791 ^ seed * 2654435761) * 2 - 1;
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(h(ix, iy, iz), h(ix + 1, iy, iz), ux), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), ux), uy),
    l(l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), ux), l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), ux), uy),
    uz
  );
}

export function fbm3(x, y, z, octaves = 4, seed = 0) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += a * noise3(x * f, y * f, z * f, seed + i * 17);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
