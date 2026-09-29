// A short test score for the audio spike: exercises every instrument and the
// mastering chain. Not part of the film.
import * as S from './synth.js';
import { PHRASE_A, PHRASE_B, HARM_A, HARM_B, placePhrase } from './theme.js';

export function testScore() {
  const ev = [];
  const E = (t, fn) => ev.push({ t, fn });
  // 0-2: bead bell
  E(0.5, (c, sh, B) => S.bell(c, sh, B.bells, 0.5, 82, 0.5, 0.1, 1.2));
  E(0.3, (c, sh, B) => S.drone(c, sh, B.low, 0.3, 39, 0.25, 22, 3, 3));
  E(1.0, (c, sh, B) => S.whistle(c, sh, B.sfx, 1.0, 2.2, 700, 1400, 0.4, -0.2));
  // lullaby on celesta with pad and fetal heartbeat
  const bpm = 72, t0 = 3.0, spb = 60 / bpm;
  [...placePhrase(PHRASE_A, t0, bpm), ...placePhrase(PHRASE_B, t0 + 12 * spb, bpm)].forEach((n) => E(n.t, (c, sh, B) => S.celesta(c, sh, B.celesta, n.t, n.midi + 12, 0.55, 0.15)));
  [...HARM_A, ...HARM_B].forEach((ch, bar) => {
    const t = t0 + bar * 3 * spb;
    ch.forEach((m, i) => E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m, 0.3, 3 * spb, (i - 1.5) * 0.3, 0.5, 1.0)));
  });
  for (let t = t0; t < t0 + 24 * spb; t += 60 / 144) E(t, (c, sh, B) => S.heartbeat(c, sh, B.heart, t, 0.5, 'fetal'));
  // death: piano plays phrase B at 56 bpm and stops on D5; heartbeat slows and stops
  const td = 25.0;
  placePhrase(PHRASE_B, td, 56).slice(0, 9).forEach((n) => E(n.t, (c, sh, B) => S.piano(c, sh, B.piano, n.t, n.midi, 0.55, n.dur * 1.2, 0.1)));
  [[51, 58, 63], [56, 60, 63], [46, 56, 62]].forEach((ch, bar) => ch.forEach((m) => E(td + bar * 3 * 60 / 56, (c, sh, B) => S.piano(c, sh, B.piano, td + bar * 3 * 60 / 56, m - 12, 0.35, 3, -0.2))));
  let hb = td, gap = 60 / 56;
  while (hb < td + 9) {
    const t = hb;
    E(t, (c, sh, B) => S.heartbeat(c, sh, B.heart, t, 0.8));
    gap *= 1.08;
    hb += gap;
  }
  E(hb, (c, sh, B) => S.heartbeat(c, sh, B.heart, hb, 0.6, 'half'));
  // silence, then shedding grains
  const ts = hb + 2.5;
  E(ts, (c, sh, B) => S.grains(c, sh, B.sfx, ts, 4, 30, 0.6, [75, 77, 79, 82, 84]));
  E(ts, (c, sh, B) => S.choir(c, sh, B.choir, ts, 63, 0.3, 6, 0, 0.2));
  E(ts, (c, sh, B) => S.choir(c, sh, B.choir, ts, 70, 0.3, 6, 0.2, 0.2));
  // merges: bells on phrase B's opening notes, accelerating
  const merges = [ts + 4, ts + 5.6, ts + 6.8, ts + 7.8, ts + 8.6, ts + 9.2];
  [70, 72, 74, 75, 80, 79].forEach((m, i) => E(merges[i], (c, sh, B) => S.bell(c, sh, B.bells, merges[i], m, 0.5 + i * 0.07, (i - 2.5) * 0.2)));
  // climax: tutti cadence F5 E♭5 D5 | E♭5
  const tc = merges[5] + 0.6;
  [[77, 0], [75, 0.35], [74, 0.7], [75, 1.05]].forEach(([m, dt]) => {
    const t = tc + dt;
    E(t, (c, sh, B) => S.piano(c, sh, B.piano, t, m, 0.75, dt > 1 ? 4 : 0.4, 0));
    E(t, (c, sh, B) => S.strings(c, sh, B.strings, t, m, 0.5, dt > 1 ? 5 : 0.4, 0.1, 0.08, 1.5));
  });
  const tr = tc + 1.05;
  [51, 58, 63, 67, 70, 75].forEach((m, i) => {
    E(tr, (c, sh, B) => S.strings(c, sh, B.strings, tr, m, 0.55, 5, (i - 2.5) * 0.25, 0.2, 2));
    E(tr, (c, sh, B) => S.choir(c, sh, B.choir, tr, m + 12, 0.35, 5, (i - 2.5) * 0.2, 0.8));
  });
  E(tr, (c, sh, B) => S.bell(c, sh, B.bells, tr, 75, 0.8, 0, 1.5));
  E(tr, (c, sh, B) => S.drone(c, sh, B.low, tr, 39, 0.5, 5, 0.1, 2));
  return { events: ev, duration: tr + 8, fadeOutEnd: tr + 8, fadeOut: 2.5 };
}
