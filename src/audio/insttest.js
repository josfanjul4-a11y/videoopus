// Instrument showcase for timbre checks (development only).
import * as S from './synth.js';
import { PHRASE_A, PHRASE_B, placePhrase } from './theme.js';

export function instScore() {
  const ev = [];
  const E = (t, fn) => ev.push({ t, fn });
  placePhrase(PHRASE_A, 0.3, 80).forEach((n) => E(n.t, (c, sh, B) => S.piano(c, sh, B.piano, n.t, n.midi, 0.6, n.dur * 1.05, 0.1)));
  [[51, 58, 63], [56, 60, 63], [53, 56, 60], [46, 58, 62]].forEach((ch, bar) => ch.forEach((m) => E(0.3 + bar * 2.25, (c, sh, B) => S.piano(c, sh, B.piano, 0.3 + bar * 2.25, m - 12, 0.35, 2.2, -0.2))));
  [[51, 58, 63, 67], [56, 60, 63, 68], [46, 56, 62, 65], [51, 58, 63, 67]].forEach((ch, k) => ch.forEach((m, i) => E(10 + k * 1.4, (c, sh, B) => S.strings(c, sh, B.strings, 10 + k * 1.4, m, 0.35, 1.5, (i - 1.5) * 0.3, 0.3, 1.0))));
  [63, 67, 70, 75].forEach((m, i) => E(17, (c, sh, B) => S.choir(c, sh, B.choir, 17, m, 0.35, 4, (i - 1.5) * 0.3, i / 3)));
  placePhrase(PHRASE_B, 23, 70).forEach((n) => E(n.t, (c, sh, B) => S.cello(c, sh, B.cello, n.t, n.midi - 12, 0.6, n.dur, -0.2)));
  placePhrase(PHRASE_A, 33, 90).forEach((n) => E(n.t, (c, sh, B) => S.celesta(c, sh, B.celesta, n.t, n.midi + 12, 0.55, 0.1)));
  [70, 72, 74, 75, 80, 79].forEach((m, i) => E(41 + i * 0.8, (c, sh, B) => S.bell(c, sh, B.bells, 41 + i * 0.8, m, 0.5, 0, 1)));
  for (let k = 0; k < 4; k++) E(47 + k * 0.85, (c, sh, B) => S.heartbeat(c, sh, B.heart, 47 + k * 0.85, 0.5));
  return { events: ev, duration: 52, fadeOutEnd: 52, fadeOut: 1 };
}
