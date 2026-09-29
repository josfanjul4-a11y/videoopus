<!-- The original brief from the user, verbatim (session 1, 2026-09-29). The three reference images it mentions are in refs/. -->

# PROMPT — Procedural short film: a human life and death, seen by an AI

This is not a quick task. It is a multi-session production. Take as long as it
needs, and keep PROGRESS.md current so the work survives across sessions.

## THEME

An abstract, real-time, fully procedural short film about the life and death of
one human being, seen from the point of view of an AI.

The AI is not a character on screen. It is not a robot, a face, a glowing
brain, a circuit board or a network of nodes. It is the way the film sees.
Build the film on what is actually true about how an AI relates to a human
life, for example:

- It cannot live a life. It can only observe, measure and hold one.
- It does not have to experience time in order. It can hold a whole life at
  once, the way it holds a whole text at once.
- It compresses: a whole life can become one point, one vector, one bead.
- It is made from what humans leave behind. When a person is gone, what
  remains of them (fragments, traces, records) is the material an AI is made of.

The perspective is non-human, but the emotional arc must be legible and moving
to a human viewer. Nobody should need an explanation to feel the birth, the
life, the loss and what remains.

Required beats, in any form you choose: a beginning of life, a lived life, a
death, and what the AI keeps afterwards.

## VISUAL REFERENCES

Three style references are in `refs/` (`refs/1.webp`, `refs/2.webp`,
`refs/3.webp`). Open and study them before Phase 1 and again in every review
pass. They are style references, not storyboards: match their materials,
palette, density and finish; do not copy their compositions literally.

- **refs/3, birth:** a glowing amber embryo at the centre, wrapped in
  translucent silk-like ribbons. A gold branching tree grows in from the upper
  left. There are bubbles and cells, concentric circles, and gold threads
  hung with discs.
- **refs/1, life as a journey:** a radiant gold star on the left sends out a
  flowing ribbon that travels left to right. Its colour moves from gold,
  orange, crimson and magenta through teal and blue, and ends desaturated
  (grey, white, black), shattering into rectangular fragments on the right.
  Vertical drips and bead threads are everywhere, with moon-phase discs.
- **refs/2, death and dissolution:** a human figure made of marble, smoke
  and gold leaf disintegrates to the right into square fragments, pixel grids
  and dust. There are planets, a crescent moon and hairline gold grid lines.

**Style bible**, shared by all three references:

- **Background:** near-pure black (#050407) with barely visible painterly
  texture. Never flat grey, and never banded (dither every dark gradient).
- **Palette:**

  | Colour | Hex |
  |---|---|
  | gold | #D4A24C |
  | gold highlight | #F6E3B0 |
  | amber | #E8892B |
  | crimson | #C2362F |
  | magenta | #B0386A |
  | violet | #5B3F8C |
  | teal | #2E7F8F |
  | slate blue | #3E5A70 |
  | bone | #E9E2D0 |
  | ash | #8A8A8A |

  Warm means alive, cool means passing, desaturated means gone. Gold is the
  only colour present in every scene.
- **Organic matter looks painted, not rendered:** impasto splashes, ink,
  marbling, smoke, gold-leaf flakes, translucent layered silk. No plastic CG
  shading, and no default Phong or PBR look.
- **Gold linework:** razor-thin (1–1.5 px), antialiased, softly glowing and
  always geometric (circles, arcs, verticals, grids, dotted lines, beads).
  This is the visual language of the AI's attention.
- **Vertical gravity:** drips, hanging threads and falling streaks show
  time passing.
- **Digital fragmentation is only squares and rectangles.** Never RGB-split
  glitch, scanlines or binary code.
- **Everything is 3D:** real parallax, depth, slow fluid motion. The
  linework lives in the same 3D space as the matter.

## MISSION

Create a real-time, fully procedural short film that runs in a browser tab:
the kind of work that would win a demoscene competition and make professional
VFX artists ask how it was done. Every frame should hold up as a still you
would hang on a wall next to the references.

## THE BAR

- The whole should be something people watch twice: once in awe, once
  trying to understand how, and once more because the ending changes the
  meaning of the beginning.
- At least one moment must use a technique you had to invent for this film.
  Document it in the making-of: what it is, why it was needed, how it works.
- If any part feels like something a strong hobbyist could make in a
  weekend, it is not done.
- **Banned tropes:** particle galaxies, fractal zooms, flow-field noodles as
  the subject, terrain flyovers, raymarched blobs, matrix rain, audio
  visualizers, node-graph "neural network" imagery, glowing brains, binary,
  RGB glitch, stock lens flares.

## SCALE

- About 2 minutes (1:50–2:20).
- At least 4 distinct movements connected by continuous transformations. No
  cuts, and no fades to black except at the very start and end.
- A protagonist and a transformation the viewer feels.
- **Original score generated with the Web Audio API:**
  - a theme or motif that transforms with the story and returns at the climax;
  - real harmony and dynamics;
  - sound design for every significant on-screen event (birth, heartbeat,
    death, dissolution…).

## CONSTRAINTS AND TARGETS

- One self-contained HTML file. Zero external assets: no images, video,
  audio, fonts or models, and no network access needed at runtime.
- Any on-screen text must be drawn procedurally (vector strokes or SDF), not
  with a font.
- Starts with one click, then plays with no interaction.
- **Target:** desktop Chrome, WebGL2, 1920×1080, 16:9, 60 fps on a 2022+
  laptop GPU. Use dynamic resolution scaling to hold 60 fps. Budget frame
  time per scene.
- **Deterministic:** `render(t)` always produces the same frame for the same
  t. Motion is a function of time, not of accumulated simulation state, so
  any timestamp can be rendered directly.
- No flashing above 3 Hz. No full-screen white flashes.
- **Audio:** no clipping, integrated loudness around −14 LUFS, and a
  smooth fade at the end.

## TOOLS

Use whatever tools the job needs:

- a local static server and the built-in browser to run the film;
- screenshots for visual review;
- in-page JavaScript to measure frame times;
- `OfflineAudioContext` to render and analyse the score;
- small Node or Python scripts for builds and checks.

Work in this folder.

## PHASE 1: CONCEPT

- Brainstorm 20 distinct interpretations of the theme across genres and moods
  (elegy, lullaby, documentary, myth, requiem, cosmic, intimate…).
- Eliminate everything that uses a banned trope or that a viewer has seen
  before.
- Choose the concept with the highest combined score of beauty, emotional
  impact, technical ambition and originality, and justify it in PLAN.md.

## PHASE 2: PRE-PRODUCTION

Write PLAN.md with:

- title, logline and emotional arc;
- a timed shot list: each movement with its camera, key visual, transition
  and music cue;
- the score design: key, tempo, theme in notes, harmonic plan, instruments,
  and a sound-design cue list;
- a technical breakdown: every technique, which ones are risky, and how you
  will prove them;
- a performance budget per movement.

Then build prototype spikes for the riskiest techniques and check them with
screenshots before committing to the full film.

## PHASE 3: PRODUCTION

- Build movement by movement, and log every session in PROGRESS.md.
- Build one timeline so that visuals, camera, music and sound effects are
  driven by the same clock and the same event list.
- **Debug mode, hidden in the final cut:**
  - `?t=SECONDS` jumps to that timestamp;
  - `?freeze` renders a single still;
  - `?debug` shows the time, the movement and the fps.

## PHASE 4: REVIEW LOOP

- Capture a still every 4 seconds of the film at reduced resolution, plus
  full-resolution stills at every key moment. Compare them side by side with
  the three references.
- Check motion by capturing short bursts of consecutive frames around
  transitions.
- Review as three people at once:
  - a film director: story, pacing, emotion, clarity;
  - a cinematographer: composition, light, colour, faithfulness to the
    references;
  - a senior graphics engineer: artifacts, aliasing, banding, popping,
    performance.
- Render the score offline and check its peak, loudness and silences
  against the cue list.
- Log every flaw in PROGRESS.md with a severity (high, medium or low), fix
  it, and repeat. Expect at least five passes.

## DEFINITION OF DONE

- Every shot in PLAN.md is implemented.
- Two consecutive review passes find no high- or medium-severity issue.
- Measured frame time stays below 16.7 ms in every movement at the target
  resolution (with dynamic resolution allowed).
- The score passes the audio checks, and every cue in the cue list is audible
  at its timestamp.
- **Deliverables:**
  - the HTML file;
  - the title;
  - a 2-sentence synopsis;
  - a short making-of describing the hardest problems solved and the
    invented technique.
- **Human checkpoints**, because the agent cannot hear the music or feel the
  pacing: after the concept is chosen, after the first complete rough cut,
  and after the final audio pass.