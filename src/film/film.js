// The film: camera, light and grade for any t, plus the draw items of every
// movement that is active at t. Everything is a function of t.
import { cameraAt } from './camera.js';
import { C, ss, pulse } from './cues.js';
import { buildBirth } from './birth.js';
import { buildLife } from './life.js';
import { buildDeath } from './death.js';
import { presentX, lifeAt, LIFE_LEN, AGE_X, FIG, BEAD_END } from './world.js';

const lerp = (a, b, x) => a + (b - a) * x;
const lerp3 = (a, b, x) => [lerp(a[0], b[0], x), lerp(a[1], b[1], x), lerp(a[2], b[2], x)];

export function buildFilm(engine, parts = {}) {
  const birth = buildBirth(engine);
  const life = buildLife(engine);
  const death = buildDeath(engine);
  const modules = [birth, life, death, ...(parts.more ?? [])];

  function shot(t) {
    const cam = cameraAt(t);
    const pl = pulse(t);
    // --- light
    let keyDir = [-0.55, 0.62, 0.55], keyCol = [1.05, 0.95, 0.82], amb = [0.06, 0.05, 0.055];
    let glowWorld = [0.02, -0.03, 0], glowRadius = 0.35, glowCol = [0, 0, 0];
    if (t < 36.5) {
      const warm = ss(t, 0.5, 5) * 0.4 + ss(t, 9, 14) * 1.2 + ss(t, C.growth[0], 35) * 1.4;
      glowCol = [2.4 * warm * (1 + 0.15 * pl), 1.4 * warm * (1 + 0.15 * pl), 0.6 * warm];
      glowRadius = 0.35 + 0.45 * ss(t, 9, 14);
    } else if (t < 92) {
      // a warm light rides the present; it cools with age
      const x = presentX(t);
      glowWorld = lifeAt(x);
      glowWorld[2] += 0.3;
      const age = ss(x, AGE_X, LIFE_LEN);
      const k = 1.3 * (1 - ss(t, 88, 92));
      glowCol = [k * (1.8 - 0.9 * age), k * (1.2 - 0.3 * age), k * (0.6 + 0.4 * age)];
      glowRadius = 1.1;
      keyDir = [-0.5, 0.7, 0.5];
      keyCol = lerp3([1.1, 0.98, 0.82], [0.85, 0.9, 1.0], age);
      amb = lerp3([0.07, 0.06, 0.06], [0.05, 0.055, 0.07], age);
    }
    if (t >= 88) {
      // the death: chiaroscuro from behind and to the left (the direction of the life)
      const k = ss(t, 88, 93);
      keyDir = lerp3(keyDir, [-0.62, 0.4, -0.68], k);
      keyCol = lerp3(keyCol, [1.9, 1.65, 1.3], k);
      amb = lerp3(amb, [0.02, 0.024, 0.036], k);
      const g = ss(t, 91, 95) * (1 - ss(t, 101, 102.5));
      glowWorld = [FIG[0] + 0.12, FIG[1] + 0.82, 0.2];
      glowCol = [1.2 * g * (0.6 + 0.6 * pl), 0.6 * g * (0.6 + 0.6 * pl), 0.25 * g];
      glowRadius = 0.5;
    }
    if (t >= 111) {
      // kept: the bead's warmth
      const k = ss(t, 111, 114);
      keyDir = lerp3(keyDir, [-0.4, 0.6, 0.7], k);
      keyCol = lerp3(keyCol, [1.1, 1.0, 0.9], k);
      amb = lerp3(amb, [0.05, 0.05, 0.055], k);
      const b = ss(t, C.contract[0], C.beadForm) * (1 - 0.6 * ss(t, 124, 128));
      glowWorld = BEAD_END;
      glowCol = [1.6 * b, 0.95 * b, 0.4 * b];
      glowRadius = 0.6;
    }
    // --- grade
    const fade = ss(t, C.fadeIn[0], C.fadeIn[1]) * (1 - ss(t, C.fadeOut[0], C.fadeOut[1]));
    const grade = {
      exposure: 1.0,
      bloomGain: 0.36,
      bloomRadius: 0.8,
      lineGain: 1.0,
      saturation: 0.95,
      grain: 0.045,
      vignette: 0.32,
      black: [5 / 255, 4 / 255, 7 / 255],
      bgTint: [1.0, 0.7, 0.4],
      bgAmt: 0.6,
      fade,
      lift: [0, 0, 0],
      gain: [1, 1, 1],
    };
    if (t < 38) {
      grade.black = lerp3([5 / 255, 4 / 255, 7 / 255], [7 / 255, 4 / 255, 5 / 255], ss(t, 8, 14) * (1 - ss(t, 34, 38)));
      grade.bloomGain = 0.34 + 0.12 * ss(t, 26, 35);
    } else if (t > 88) {
      grade.black = lerp3([5 / 255, 4 / 255, 7 / 255], [4 / 255, 5 / 255, 7 / 255], ss(t, 88, 95) * (1 - ss(t, 112, 118)));
    }
    if (t > C.fadeOut[1]) grade.fade = 1; // the title draws on black
    return {
      cam: { pos: cam.pos, target: cam.target, fov: cam.fov, aperture: cam.aperture },
      light: { keyDir, keyCol, amb, rim: [0, 0, 0], glowWorld, glowRadius, glowCol },
      grade,
    };
  }

  const solo = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('solo') : null;
  const soloTags = solo ? solo.split(',') : null;
  function items(t, frame, R) {
    const out = [];
    for (const m of modules) out.push(...m.items(t, frame, R));
    return soloTags ? out.filter((it) => soloTags.includes(it.tag)) : out;
  }
  return { shot, items };
}
