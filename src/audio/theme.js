// The theme of HELD, in E♭ major, 3/4. Durations in beats.
// Its signature is the rising major sixth B♭4 → G5.
//
// Phrase A (the question, ends on the dominant):
//   B♭4 G5. F5 | E♭5 D5 E♭5 | F5. G5 F5 | B♭4 (3)
// Phrase B (the answer, ends on the tonic):
//   B♭4 C5 D5 | E♭5. A♭5 G5 | F5 E♭5 D5 | E♭5 (3)
// At the death, phrase B stops after bar 7 on D5 (the leading tone over B♭7).
// At the climax the AI completes it: E♭5 lands on the frame the bead forms.

export const N = { Eb3: 51, F3: 53, G3: 55, Ab3: 56, Bb3: 58, C4: 60, D4: 62, Eb4: 63, F4: 65, G4: 67, Ab4: 68, Bb4: 70, C5: 72, D5: 74, Eb5: 75, F5: 77, G5: 79, Ab5: 80, Bb5: 82, C6: 84, Eb2: 39, Bb1: 34, Ab2: 44, C3: 48, Bb2: 46, F2: 41, G2: 43, D3: 50 };

// [midi, beats]
export const PHRASE_A = [[70, 1], [79, 1.5], [77, 0.5], [75, 1], [74, 1], [75, 1], [77, 1.5], [79, 0.5], [77, 1], [70, 3]];
export const PHRASE_B = [[70, 1], [72, 1], [74, 1], [75, 1.5], [80, 0.5], [79, 1], [77, 1], [75, 1], [74, 1], [75, 3]];
// harmony per bar (3 beats): chord tones as midi (voiced in the middle register)
export const HARM_A = [
  [51, 58, 63, 67],        // E♭
  [56, 60, 63, 67],        // A♭maj7
  [53, 56, 60, 63],        // Fm7
  [46, 58, 62, 65],        // B♭
];
export const HARM_B = [
  [51, 58, 63, 67],        // E♭
  [56, 60, 63, 67],        // A♭
  [46, 56, 62, 65],        // B♭7
  [51, 58, 63, 67],        // E♭
];

// Place a phrase in time: returns [{t, midi, dur}] (dur in seconds).
export function placePhrase(phrase, t0, bpm, transpose = 0) {
  const spb = 60 / bpm;
  const out = [];
  let b = 0;
  for (const [m, beats] of phrase) {
    out.push({ t: t0 + b * spb, midi: m + transpose, dur: beats * spb, beat: b });
    b += beats;
  }
  return out;
}
