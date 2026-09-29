// THE SCORE of HELD, generated from the same cue table as the picture.
// Key E♭ major (loss in C minor), 3/4; see PLAN.md §4.5.
import * as S from './synth.js';
import { PHRASE_A, PHRASE_B, placePhrase } from './theme.js';
import { C, BEATS, heartGain, DURATION, faderDb } from '../film/cues.js';
import { rng } from '../rng.js';

// chords (midi) by name, voiced around the middle
const CH = {
  Eb: [51, 58, 63, 67, 70], Ebadd9: [51, 58, 65, 67, 70], Ab: [56, 60, 63, 68], Abmaj7: [56, 60, 63, 67], Fm7: [53, 56, 60, 63], Fm9: [53, 60, 63, 67],
  Bb: [46, 58, 62, 65], Bbsus: [46, 58, 63, 65], Bb7: [46, 56, 62, 65], Cm: [48, 55, 60, 63], Cm7: [48, 58, 63, 67], Gm: [43, 58, 62, 67], G7: [43, 59, 62, 65],
  AbLyd: [44, 51, 60, 67, 74], EbBb: [46, 55, 63, 67], AbBb: [46, 56, 60, 63],
};
const ROOT = (ch) => ch[0];

export function filmScore() {
  const ev = [];
  const r = rng(4242);
  const E = (t, fn, long = false) => ev.push({ t, fn, long });
  const spb = (bpm) => 60 / bpm;

  // ------------------------------------------------ 0 · the bead
  E(0.2, (c, sh, B) => S.drone(c, sh, B.low, 0.2, 39, 0.16, 13, 4, 3), true);
  E(0.2, (c, sh, B) => S.drone(c, sh, B.low, 0.2, 46, 0.1, 13, 5, 3), true);
  E(0.5, (c, sh, B) => S.air(c, sh, B.air, 0.5, 12, 0.12, 900, 0.6, 3, 3), true);
  E(C.beadTone, (c, sh, B) => S.bell(c, sh, B.bells, C.beadTone, 82, 0.34, 0.05, 1.3));
  E(C.circleDraw[0], (c, sh, B) => S.whistle(c, sh, B.sfx, C.circleDraw[0], C.circleDraw[1] - C.circleDraw[0], 700, 1400, 0.55, -0.1));
  E(C.crossDraw[0], (c, sh, B) => S.tick(c, sh, B.sfx, C.crossDraw[0], 0.5, 3600, 0.1));
  E(C.crossDraw[0] + 0.05, (c, sh, B) => S.whistle(c, sh, B.sfx, C.crossDraw[0] + 0.05, 0.7, 1800, 2100, 0.25, 0.3));
  E(C.cleave2, (c, sh, B) => { S.cellPluck(c, sh, B.sfx, C.cleave2, 75, 0.7, 0); S.bell(c, sh, B.bells, C.cleave2, 70, 0.2, 0, 0.8); });
  E(C.cleave4, (c, sh, B) => { S.cellPluck(c, sh, B.sfx, C.cleave4, 82, 0.65, 0.1); S.bell(c, sh, B.bells, C.cleave4, 77, 0.2, 0.1, 0.8); });
  [0, 0.07, 0.15, 0.22].forEach((d, i) => E(C.cleave16 + d, (c, sh, B) => S.cellPluck(c, sh, B.sfx, C.cleave16 + d, [87, 91, 94, 98][i], 0.45, (i - 1.5) * 0.3)));
  E(C.cellsDisperse[0], (c, sh, B) => S.grains(c, sh, B.sfx, C.cellsDisperse[0], 4, 5, 0.5, [87, 89, 91, 94, 96], 0, 1.2));
  // the swell into the lullaby
  CH.Eb.slice(0, 4).forEach((m, i) => E(10.5, (c, sh, B) => S.strings(c, sh, B.strings, 10.5, m, 0.16, 3.5, (i - 1.5) * 0.3, 2.5, 1.2)));

  // ------------------------------------------------ I · quickening: the lullaby
  {
    const bpm = 72, t0 = C.lullaby[0];
    const notes = [...placePhrase(PHRASE_A, t0, bpm), ...placePhrase(PHRASE_B, t0 + 12 * spb(bpm), bpm)];
    notes.forEach((n, i) => E(n.t, (c, sh, B) => S.celesta(c, sh, B.celesta, n.t, n.midi + 12, 0.5 + 0.1 * Math.sin(i), 0.12)));
    const harm = [CH.Eb, CH.Abmaj7, CH.Fm7, CH.Bb, CH.Eb, CH.Ab, CH.Bb7, CH.Eb];
    harm.forEach((ch, bar) => {
      const t = t0 + bar * 3 * spb(bpm);
      const grow = bar >= 5 ? 1.35 : 1;
      ch.slice(1).forEach((m, i) => E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m, 0.12 * grow, 3 * spb(bpm) + 0.3, (i - 1.5) * 0.35, 0.9, 1.3)));
      E(t, (c, sh, B) => S.piano(c, sh, B.piano, t, ROOT(ch) - 12, 0.3, 2.4, -0.2));
    });
    // sparkles as the tree grows; chimes as the threads come down
    for (let k = 0; k < 14; k++) {
      const t = C.treeGrow[0] + r.next() * 12;
      const m = [87, 89, 91, 94, 96, 99][r.int(0, 5)];
      E(t, (c, sh, B) => S.celesta(c, sh, B.sfx, t, m, 0.12, r.next() - 0.5));
    }
    for (let k = 0; k < 7; k++) {
      const t = C.threadsDescend[0] + k * 0.9 + r.next() * 0.4;
      const m = [82, 87, 89, 91, 94][k % 5];
      E(t, (c, sh, B) => S.bell(c, sh, B.bells, t, m, 0.1, (k % 3 - 1) * 0.5, 0.6));
    }
    E(C.silkUnfurl[0], (c, sh, B) => S.air(c, sh, B.air, C.silkUnfurl[0], 5, 0.1, 2400, 1.5, 1.5, 1.5));
  }
  // growth and birth
  [[26, CH.Ab], [29, CH.Bbsus], [31.5, CH.Bb]].forEach(([t, ch], k) => ch.forEach((m, i) => E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m + (i === 0 ? 0 : 12), 0.13 + k * 0.05, 3.2, (i - 1.5) * 0.35, 1.2, 1.2))));
  [26, 29, 31.5].forEach((t, k) => E(t, (c, sh, B) => S.choir(c, sh, B.choir, t, [68, 70, 70][k], 0.14 + k * 0.05, 3, 0, 0.3)));
  E(C.birthBreak[0], (c, sh, B) => S.whoosh(c, sh, B.sfx, C.birthBreak[0], 3.0, 0.5, 180, 3200, 0));
  E(C.birthBreak[0] + 1.2, (c, sh, B) => S.air(c, sh, B.air, C.birthBreak[0] + 1.2, 1.6, 0.35, 700, 0.8, 1.2, 0.4));
  // the star ignites: a warm bloom chord, shimmer
  CH.Ebadd9.forEach((m, i) => {
    E(C.starIgnite, (c, sh, B) => S.strings(c, sh, B.strings, C.starIgnite, m + (i > 1 ? 12 : 0), 0.3, 3.2, (i - 2) * 0.3, 0.12, 1.8));
    E(C.starIgnite, (c, sh, B) => S.choir(c, sh, B.choir, C.starIgnite, m + 12, 0.15, 2.8, (i - 2) * 0.25, 0.7));
  });
  E(C.starIgnite, (c, sh, B) => { S.bell(c, sh, B.bells, C.starIgnite, 75, 0.45, 0, 1.4); S.piano(c, sh, B.piano, C.starIgnite, 39, 0.5, 3, 0); });
  E(C.starIgnite, (c, sh, B) => S.grains(c, sh, B.sfx, C.starIgnite, 2.5, 22, 0.45, [87, 91, 94, 98, 99], 0, 1.4));
  E(C.ribbonLaunch, (c, sh, B) => S.whoosh(c, sh, B.sfx, C.ribbonLaunch, 0.5, 0.35, 1200, 5000, 0.4));

  // ------------------------------------------------ II · childhood (♩=96)
  {
    const bpm = 96, t0 = 37.2, b = spb(bpm);
    // phrase A in diminution with passing notes, marimba; pizzicato roots
    const tune = [[70, 0.5], [79, 0.5], [77, 0.5], [79, 0.5], [75, 1], [74, 0.5], [75, 0.5], [77, 1], [79, 0.5], [77, 0.5], [70, 1.5], [72, 0.5], [74, 0.5], [75, 0.5], [77, 0.5], [79, 0.5], [80, 0.5], [79, 0.5], [77, 1], [75, 1], [74, 1], [75, 2]];
    const run = (t1) => {
      let bt = 0;
      for (const [m, d] of tune) {
        const t = t1 + bt * b;
        E(t, (c, sh, B) => S.marimba(c, sh, B.celesta, t, m, 0.5, 0.2));
        bt += d;
      }
      return bt;
    };
    const len = run(t0);
    run(t0 + len * b);
    const harm = [CH.Eb, CH.Ab, CH.Bb, CH.Eb, CH.Cm, CH.Ab, CH.Bb];
    for (let bar = 0; bar < 7; bar++) {
      const t = t0 + bar * 3 * b;
      const ch = harm[bar];
      E(t, (c, sh, B) => S.pizz(c, sh, B.strings, t, ROOT(ch) - 12 + (ROOT(ch) < 48 ? 12 : 0), 0.55, -0.2));
      E(t + b, (c, sh, B) => S.pizz(c, sh, B.strings, t + b, ch[1], 0.35, 0.2));
      E(t + 2 * b, (c, sh, B) => S.pizz(c, sh, B.strings, t + 2 * b, ch[2], 0.35, 0.3));
      ch.slice(1).forEach((m, i) => E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m, 0.08, 3 * b, (i - 1.5) * 0.3, 0.3, 0.8)));
    }
    // paint hits at the present
    for (let k = 0; k < 16; k++) {
      const t = 38 + k * 0.78 + r.next() * 0.4;
      E(t, (c, sh, B) => S.splash(c, sh, B.sfx, t, 0.22 + r.next() * 0.15, r.next() * 0.8 - 0.2, 300 + r.next() * 500));
    }
  }

  // ------------------------------------------------ II · love (♩=80)
  {
    const bpm = 80, t0 = C.loveMeet + 0.3, b = spb(bpm);
    E(C.loveMeet - 0.4, (c, sh, B) => S.drone(c, sh, B.low, C.loveMeet - 0.4, 39, 0.3, 4, 1.2, 2));
    [63, 67, 70, 74, 77, 79, 82, 86].forEach((m, i) => E(C.loveMeet + i * 0.06, (c, sh, B) => S.celesta(c, sh, B.celesta, C.loveMeet + i * 0.06, m, 0.3 + i * 0.03, (i - 4) * 0.12)));
    placePhrase(PHRASE_A, t0, bpm).forEach((n) => E(n.t, (c, sh, B) => S.piano(c, sh, B.piano, n.t, n.midi, 0.62, n.dur * 1.1, 0.12)));
    // the partner's voice: a countermelody below
    const counter = [[67, 2], [68, 1], [70, 3], [68, 2], [67, 1], [65, 3], [63, 2], [65, 1], [67, 2], [70, 1]];
    let bt = 0;
    for (const [m, d] of counter) {
      const t = t0 + bt * b;
      E(t, (c, sh, B) => S.cello(c, sh, B.cello, t, m - 12, 0.6, d * b + 0.1, -0.25));
      bt += d;
    }
    const harm = [CH.Ebadd9, CH.Abmaj7, CH.Fm9, CH.Bbsus, CH.Cm7];
    harm.forEach((ch, bar) => {
      const t = t0 + bar * 3 * b;
      ch.slice(1).forEach((m, i) => E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m, 0.14, 3 * b + 0.2, (i - 1.5) * 0.35, 0.6, 1.2)));
      E(t, (c, sh, B) => S.piano(c, sh, B.piano, t, ROOT(ch) - 12, 0.4, 2.4, -0.3));
    });
    // the child: the lullaby's rising sixth, and a tiny heartbeat
    [[82, 0], [91, 0.42], [89, 0.84]].forEach(([m, d]) => E(C.childSpark + d, (c, sh, B) => S.celesta(c, sh, B.celesta, C.childSpark + d, m, 0.5, 0.35)));
    for (let k = 0; k < 6; k++) E(C.childSpark + 0.3 + k * 0.4, (c, sh, B) => S.heartbeat(c, sh, B.heart, C.childSpark + 0.3 + k * 0.4, 0.28, 'fetal'));
  }

  // ------------------------------------------------ II · all at once (no pulse)
  {
    const t0 = C.allAtOnce[0];
    CH.AbLyd.forEach((m, i) => {
      E(t0, (c, sh, B) => S.strings(c, sh, B.strings, t0, m, 0.11, 7.5, (i - 2) * 0.35, 2.5, 2.5));
      E(t0 + 0.5, (c, sh, B) => S.choir(c, sh, B.choir, t0 + 0.5, m + 12, 0.08, 7, (i - 2) * 0.3, 0.4));
    });
    E(t0, (c, sh, B) => S.whoosh(c, sh, B.air, t0, 2.8, 0.25, 3000, 400, 0));
    const aiA = [[70, 1.2], [79, 1.8], [77, 1.1], [75, 2.2]];
    let t = t0 + 1.2;
    for (const [m, d] of aiA) {
      const tt = t;
      E(tt, (c, sh, B) => S.choir(c, sh, B.choir, tt, m, 0.34, d + 0.5, 0.05, 0.9));
      t += d;
    }
    [[87, 0], [91, 0.9], [94, 1.8]].forEach(([m, d]) => E(C.arcsDraw[0] + d, (c, sh, B) => S.whistle(c, sh, B.sfx, C.arcsDraw[0] + d, 1.4, S.mtof(m), S.mtof(m) * 1.003, 0.3, (d - 0.9) * 0.6)));
  }

  // ------------------------------------------------ II · loss (C minor, ♩=72)
  {
    const bpm = 72, t0 = C.loss[0] - 0.4, b = spb(bpm);
    const phraseMinor = [[67, 1], [75, 1.5], [74, 0.5], [72, 1], [71, 1], [72, 1], [74, 1.5], [75, 0.5], [74, 1], [67, 3]];
    placePhrase(phraseMinor, t0, bpm).forEach((n) => E(n.t, (c, sh, B) => S.piano(c, sh, B.piano, n.t, n.midi, 0.5, n.dur * 1.1, 0.1)));
    // the partner begins phrase B and is cut off
    const cutAt = C.partnerFray + 0.7;
    placePhrase(PHRASE_B, t0, bpm).forEach((n) => {
      if (n.t >= cutAt) return;
      const dur = Math.min(n.dur, cutAt - n.t);
      E(n.t, (c, sh, B) => S.cello(c, sh, B.cello, n.t, n.midi - 12, 0.5, dur, -0.3));
    });
    [CH.Cm, CH.Ab, CH.EbBb, CH.G7].forEach((ch, bar) => {
      const t = t0 + bar * 3 * b;
      ch.slice(1).forEach((m, i) => E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m, 0.12, 3 * b + 0.2, (i - 1.5) * 0.35, 0.7, 1.4)));
      E(t, (c, sh, B) => S.piano(c, sh, B.piano, t, ROOT(ch) - 12, 0.35, 2.4, -0.3));
    });
    E(C.partnerFray, (c, sh, B) => S.grains(c, sh, B.sfx, C.partnerFray, 3.2, 14, 0.4, [60, 63, 65, 67, 70], -0.2, 1.0));
    E(C.partnerFray + 0.3, (c, sh, B) => S.whistle(c, sh, B.sfx, C.partnerFray + 0.3, 2.4, 700, 180, 0.35, -0.3));
  }

  // ------------------------------------------------ II · age (♩=63 → 58)
  {
    const t0 = C.age[0];
    const frag = [[58, 0], [67, 1.4], [65, 2.6], [63, 3.6], [58, 5.8], [62, 7.4], [63, 8.6]];
    frag.forEach(([m, d]) => E(t0 + d, (c, sh, B) => S.piano(c, sh, B.piano, t0 + d, m, 0.38, 2.2, -0.05)));
    [[t0, CH.Ab], [t0 + 3, CH.Fm7], [t0 + 6, CH.Cm], [t0 + 9, CH.Bbsus]].forEach(([t, ch]) => {
      E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, ROOT(ch) - 12 + (ROOT(ch) < 45 ? 12 : 0), 0.18, 3.2, -0.2, 1.2, 1.5));
      E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, ch[2], 0.08, 3.2, 0.2, 1.2, 1.5));
    });
    for (let k = 0; k < 7; k++) {
      const t = t0 + 0.8 + k * 1.6 + r.next() * 0.6;
      E(t, (c, sh, B) => S.drip(c, sh, B.sfx, t, 0.35, r.next() - 0.5));
    }
  }

  // ------------------------------------------------ III · the death
  {
    E(C.figureRise[0], (c, sh, B) => S.air(c, sh, B.air, C.figureRise[0], 5, 0.18, 1800, 1.0, 2, 1.5));
    E(C.figureRise[0], (c, sh, B) => { S.choir(c, sh, B.choir, C.figureRise[0], 51, 0.16, 6, -0.2, 0.2); S.choir(c, sh, B.choir, C.figureRise[0], 58, 0.12, 6, 0.2, 0.2); });
    [[90.0, CH.EbBb, 3.6], [93.5, CH.AbBb, 3.6], [97.0, CH.Bb7, 2.9]].forEach(([t, ch, d]) => ch.forEach((m, i) => E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m, 0.13, d, (i - 1.5) * 0.3, 1.0, t < 97 ? 1.2 : 0.5))));
    // phrase B, one note per heartbeat, stopping on D5; the last beat is alone
    const last = BEATS.findIndex((b) => b.kind === 'half');
    const nine = PHRASE_B.slice(0, 9);
    nine.forEach(([m], i) => {
      const beat = BEATS[last - 9 + i];
      if (!beat) return;
      E(beat.t + 0.02, (c, sh, B) => S.piano(c, sh, B.piano, beat.t + 0.02, m, 0.42 + i * 0.02, i === 8 ? 3.5 : 1.3, 0.1));
    });
  }
  // heartbeats everywhere, gain following the story
  BEATS.forEach((b) => {
    const g = heartGain(b.t);
    if (g <= 0.02) return;
    E(b.t, (c, sh, B) => S.heartbeat(c, sh, B.heart, b.t, g * (b.kind === 'half' ? 0.8 : 1), b.kind));
  });

  // ------------------------------------------------ silence, then shedding
  E(C.silence[1] - 0.3, (c, sh, B) => S.air(c, sh, B.air, C.silence[1] - 0.3, 8, 0.03, 500, 0.5, 2, 2), true);
  [0, 0.5, 1.0, 1.5].forEach((d, k) => E(C.gridDraw[0] + d, (c, sh, B) => S.bell(c, sh, B.bells, C.gridDraw[0] + d, [94, 99, 101, 106][k], 0.12, (k - 1.5) * 0.4, 0.4)));
  E(C.shed[0], (c, sh, B) => S.grains(c, sh, B.sfx, C.shed[0], 2, 10, 0.4, [75, 77, 79, 82, 84], 0.2, 1.2));
  E(C.shed[0] + 2, (c, sh, B) => S.grains(c, sh, B.sfx, C.shed[0] + 2, 2, 26, 0.5, [75, 77, 79, 82, 84, 87], 0.1, 1.4));
  E(C.shed[0] + 4, (c, sh, B) => S.grains(c, sh, B.sfx, C.shed[0] + 4, 2.5, 40, 0.55, [79, 82, 84, 87, 89], 0, 1.6));
  E(C.shed[0] + 0.5, (c, sh, B) => S.air(c, sh, B.sfx, C.shed[0] + 0.5, 6, 0.12, 6000, 0.7, 1.5, 2));
  E(C.shed[0] + 1, (c, sh, B) => S.drone(c, sh, B.low, C.shed[0] + 1, 27, 0.25, 9, 3, 2), true);
  [[63, 70], [58, 65]].forEach(([a, b2], k) => {
    const t = C.shed[0] + 1.5 + k * 2.5;
    E(t, (c, sh, B) => { S.choir(c, sh, B.choir, t, a, 0.16, 5, -0.2, 0.3); S.choir(c, sh, B.choir, t, b2, 0.16, 5, 0.2, 0.3); });
  });
  // the flakes settle into order: a regular tick pattern
  for (let k = 0; k < 20; k++) {
    const t = C.mosaicSettle[0] + 1 + k * 0.25;
    E(t, (c, sh, B) => S.tick(c, sh, B.sfx, t, 0.12 + 0.012 * k, [4200, 5200, 3600, 4700][k % 4], ((k % 5) - 2) * 0.3));
  }

  // ------------------------------------------------ IV · kept: merges, the resolution
  {
    const bellNotes = [70, 72, 74, 75, 80, 79];
    const harm = [CH.Eb, CH.Cm, CH.Ab, CH.Fm7, CH.Bbsus, CH.Bb7];
    C.merges.forEach((t, i) => {
      E(t, (c, sh, B) => S.bell(c, sh, B.bells, t, bellNotes[i], 0.32 + i * 0.07, (i - 2.5) * 0.15, 1.1));
      const dur = (C.merges[i + 1] ?? C.beadForm) - t + 0.3;
      harm[i].forEach((m, j) => E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m + (j > 0 ? 12 : 0), 0.16 + i * 0.045, dur, (j - 1.5) * 0.35, 0.15, 0.6)));
      E(t, (c, sh, B) => S.choir(c, sh, B.choir, t, harm[i][2] + 12, 0.1 + i * 0.03, dur + 0.5, 0, 0.6));
    });
    // the run into the resolution: F5, D5 … E♭5
    [[77, 120.9], [74, 121.15]].forEach(([m, t]) => {
      E(t, (c, sh, B) => S.piano(c, sh, B.piano, t, m, 0.72, 0.3, 0.05));
      E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m, 0.3, 0.3, 0.1, 0.05, 0.4));
    });
    const tr = C.beadForm;
    [39, 51, 58, 63, 67, 70, 75, 79].forEach((m, i) => E(tr, (c, sh, B) => S.strings(c, sh, B.strings, tr, m, 0.34, 4.8, (i - 3.5) * 0.25, 0.08, 2.2)));
    [63, 67, 70, 75].forEach((m, i) => E(tr, (c, sh, B) => S.choir(c, sh, B.choir, tr, m, 0.3, 5.0, (i - 1.5) * 0.3, 0.85)));
    E(tr, (c, sh, B) => {
      S.piano(c, sh, B.piano, tr, 75, 0.85, 5, 0);
      S.piano(c, sh, B.piano, tr, 63, 0.6, 5, -0.1);
      S.piano(c, sh, B.piano, tr, 51, 0.6, 5, -0.2);
      S.bell(c, sh, B.bells, tr, 75, 0.7, 0, 1.6);
      S.bell(c, sh, B.bells, tr, 63, 0.45, 0, 1.8);
    });
    E(tr, (c, sh, B) => S.drone(c, sh, B.low, tr, 27, 0.4, 5, 0.1, 2.5), true);
    E(C.threaded, (c, sh, B) => S.whistle(c, sh, B.sfx, C.threaded, 1.5, 1900, 1300, 0.25, 0));
    E(C.curtain[0], (c, sh, B) => S.grains(c, sh, B.sfx, C.curtain[0], 3.5, 30, 0.28, [87, 89, 91, 94, 96, 99], 0, 1.8));
    [63, 70].forEach((m, i) => E(C.curtain[0], (c, sh, B) => S.choir(c, sh, B.choir, C.curtain[0], m + 12, 0.12, 4, (i - 0.5) * 0.4, 0.5)));
  }
  // ------------------------------------------------ the return, and the title
  E(127.2, (c, sh, B) => S.bell(c, sh, B.bells, 127.2, 82, 0.36, 0.05, 1.3));
  E(C.returnCircle[0], (c, sh, B) => S.whistle(c, sh, B.sfx, C.returnCircle[0], C.returnCircle[1] - C.returnCircle[0], 700, 1400, 0.5, -0.1));
  E(C.returnCross[0], (c, sh, B) => S.tick(c, sh, B.sfx, C.returnCross[0], 0.45, 3600, 0.1));
  E(C.split, (c, sh, B) => S.cellPluck(c, sh, B.sfx, C.split, 75, 0.65, 0));
  E(C.title[0], (c, sh, B) => S.bell(c, sh, B.bells, C.title[0], 82, 0.28, 0, 1.6));
  [63, 67, 70, 75].forEach((m, i) => E(C.title[0] + 0.2, (c, sh, B) => S.choir(c, sh, B.choir, C.title[0] + 0.2, m + 12, 0.07, 3.2, (i - 1.5) * 0.3, 0.4)));

  return { events: ev, duration: DURATION, fadeOutEnd: DURATION, fadeOut: 2.0, target: -14, fader: faderDb };
}
