# HANDOFF: how to continue HELD

> **Para el usuario.** Para que otra cuenta de Claude continúe:
> 1. Abre una sesión nueva de Claude Code sobre el repositorio
>    `josfanjul4-a11y/videoopus`, en la rama `claude/clever-bohr-6zv1sk`.
> 2. Escríbele: *«Lee HANDOFF.md y continúa la producción desde donde se quedó.»*
>
> Todo lo necesario está en este archivo y en BRIEF.md, PLAN.md y PROGRESS.md.

This file is for the next agent. It assumes you have **none** of the previous
conversation. The checkpoint is the commit that added this file
(`git log -1 -- HANDOFF.md`).

---

## 1. Read these first, in order

1. **`BRIEF.md`**: the user's original brief, verbatim. It is the contract:
   theme, style bible, banned tropes, constraints, the review process and the
   definition of done. Re-read it at every review pass.
2. **`refs/1.webp`, `refs/2.webp`, `refs/3.webp`**: the style references. Open
   them; the Read tool shows images. Look at them again in every pass.
3. **`PLAN.md`**: concept and pre-production. §4 is the production plan:
   - §4.1 synopsis and arc;
   - §4.2 world layout;
   - §4.3 cue table;
   - §4.4 shot list;
   - §4.5 score;
   - §4.6 technical breakdown;
   - §4.7 architecture;
   - §4.8 budgets;
   - §4.10 Haar shedding.
4. **`PROGRESS.md`**: status, session logs, the checkpoint feedback, and the
   **review log** with the pass-1 findings and their severities.
5. This file, then the work queue in §6.

## 2. Where things stand

| Item | State |
|---|---|
| Concept | **HELD**, approved at checkpoint #1. |
| Rough cut | Complete: five sections (0, I–IV), 136 s. One click to start; playback runs on the audio clock. |
| Checkpoint #2 | Story: "reads well, polish it". Music: "sounds synthetic/cheap". Performance: "smooth" on the user's machine. |
| Audio pass 1 | Done in response to that feedback. **The user has not heard it yet.** Levels: −14.52 LUFS, −1.19 dBTP, 0 clipped samples. |
| Review pass 1 | Captured and logged (PROGRESS.md, *Review log*: H1–H2, M1–M8, L1–L2). **No fixes applied yet.** H1 is fully designed in §6.1. |
| Build | `held.html` (~260 KB, the deliverable) and `dist/held.artifact.html` (the variant for claude.ai artifacts). |

- **Title:** HELD.
- **Synopsis (2 sentences):** A single gold bead divides like a cell and becomes a
  glowing embryo, then a ribbon of colour that runs, loves, gives off a child,
  loses its companion, cools and finally rises into an old figure who looks
  back over it all. When the heart stops, the figure is compressed square by
  square into a mosaic and then into one bead, and the bead is hung among
  countless others in the exact frame the film opened on.

**Remaining work, roughly in order:**
1. Fix the pass-1 findings.
2. Run review passes 2–5 or more, until two consecutive passes are clean.
3. Do the final audio pass, then checkpoint #3.
4. Get real-GPU benchmark numbers from the user.
5. Write the making-of and finish the deliverables.

## 3. About the user

- They write in **Spanish**; answer in Spanish. The repo documents are in English.
- **Remaining human checkpoint: #3, after the final audio pass.** The agent
  cannot hear, so ask the user to listen and give feedback.
- **Benchmark.** Also ask them to open the film with `#bench` and report the
  numbers; the cloud container has no GPU.
- **Artifact link.** Checkpoint #2 used a private artifact published by the
  previous account: https://claude.ai/artifact/J3V7qMCf8P2XntN8X1vcvX. A
  different account probably cannot update it. Publish a new artifact from
  `dist/held.artifact.html` and send the user the new link.
- Do **not** open a pull request unless the user asks for one.

## 4. Environment setup

**Git**
- Run `git fetch origin claude/clever-bohr-6zv1sk && git checkout claude/clever-bohr-6zv1sk`.
- If your session tells you to work on another branch, create it from this
  head (`git checkout -b <branch> origin/claude/clever-bohr-6zv1sk`) and push there.
- Use your own session's commit-attribution rules.

**Build**
- `npm install` installs esbuild, the only dependency.
- `npm run build` writes `held.html` and `dist/held.artifact.html`.
- The build fails if any http(s) URL other than w3.org appears in the output.
  This is intentional: the film must never touch the network.

**Headless browser**
- `tools/*.mjs` load Playwright from a hard-coded path:
  `require('/opt/node22/lib/node_modules/playwright')`.
- If that path does not exist, point it at `$(npm root -g)/playwright`, or
  install Playwright.
- In Claude cloud containers Chromium is preinstalled (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
  Do not run `playwright install`.
- WebGL2 runs through SwiftShader: `--use-angle=swiftshader --enable-unsafe-swiftshader`.

**Python**
- `pip install numpy scipy pillow`.

**No GPU**
- Frame *times* measured in the container mean nothing. Stills and bursts are
  exact, because `render(t)` is deterministic.
- A 1080p still takes a few seconds in SwiftShader. Use 640×360 for sweeps,
  and 1920×1080 for key frames only.

**Repository size**
- The review WAV renders (~370 MB) were committed in earlier history. As of
  this checkpoint they are untracked and ignored.
- Do not commit WAVs; commit `_info.json` files and plots only. Re-render
  audio with `tools/audio.mjs` when you need it.
- `review/raw/` is ignored too. Regenerate captures with `tools/capture.mjs`.

## 5. Code and tool map

### Page parameters (`held.html`)

| Parameter | Effect |
|---|---|
| `?t=SECONDS` | Start at t. |
| `?freeze` | Render a single still. |
| `?debug` | Overlay with time, movement and fps, drawn with the stroke font. |
| `?bench` | Frame-time percentiles per movement, plus GPU timer queries, shown at the end. |
| `?solo=tag1,tag2` | Draw only items with these tags. Tags are set in `birth.js`, `life.js` and `death.js`, e.g. `figure`, `squares`, `dust`, `grid`, `contour`, `curtain`, `bead`. |
| `?w=&h=` | Fixed canvas size. |
| `?scale=` | Resolution scale. |
| `?spike=NAME` | Run a development spike from `src/spikes.js` instead of the film. |
| `?audio` | Tools only. |
| `#debug`, `#bench` | Hash forms of the above. Use these inside the claude.ai artifact, which does not take query strings. |

Tool hooks: `window.__renderAt(t, scale)`, `window.__state()`,
`window.__renderAudio(name, chunks)`.

### Source

**Engine** (`src/`)

| File | Purpose |
|---|---|
| `main.js` | Playback shell. Start screen with the title and a ring that fills while the score renders, then CLICK. The audio clock drives t. Dynamic resolution 0.6–1.0, fullscreen on start, the debug and bench overlays. |
| `engine.js` | The frame. Matter pass: premultiplied "over" into RGBA16F, plus a composited-depth MRT. Line pass: MAX blend, softly occluded by the matter depth. Then post. Objects are sorted back to front. |
| `dabs.js` | The painterly renderer, with 64-byte instanced "dabs" (details below). |
| `brushes.js` | Brush atlas: TEXTURE_2D_ARRAY 256². R = coverage, G = height, B = cell hash, A = crack. |
| `mosaic.js` | Object-space Voronoi mosaic (the refs' "cellular paint"), palette strips (`PAL` rows) and `paletteAt()`. |
| `lines.js` | Gold hairlines. `LineBatch` has polyline, circle, line and dash, with reveal/revealHead and occlusion. |
| `silk.js` | Silk ribbons via `ribbonFromCurve`: fibres, grazing sheen, hems, reveal, flutter. |
| `discs.js` | Analytic discs: COIN, PEARL, MOON, BEAD, BUBBLE, DOT, TAG, CELL. |
| `post.js` | Bloom (13-tap downsample with a knee, tent upsample), tonemap `1−exp(−x)`, painterly background, vignette, grain, triangular dither, sRGB. |
| `sculpt.js` | SDF primitives and `sampleSurface` (Newton projection), for dabs painted on sculpted surfaces. |
| `gen.js` | Generators: `paintAlongCurve`, `splashTongues`, `dripsBelow`, `spray`, `starLines`, `beadThread`, `growTree`. |
| `figure.js` | The old figure: `headSDF`/`figureSDF`, `figureDabs`, `profileContour`. `figureSmoke` is unused. |
| `shed.js` | **Haar shedding, the invented technique.** Its header comment explains it. |
| `gl.js`, `math.js`, `rng.js`, `palette.js` | Utilities. `rng` is mulberry32 plus `fbm3`; `LIN` is the palette in linear space. |

`dabs.js` in more detail:
- Each object's motion is a GLSL `animate(inout Dab d)` hook passed at draw
  time; programs are cached per hook.
- Materials: PAINT, GOLD, GLOW, SMOKE, MARBLE, PAPER, BONE, CELLMAT.
- Draw options:
  - transform and animation: `model`, `alpha`, `sizeScale`, `p0`–`p3` (free vec4s for hooks);
  - surface: `crack`, `torn`, `jitter`, `facet`, `mosScale`;
  - palette-field colouring: `cellMix`, `field`, `fieldN`, `fieldC`, `remap`;
  - light and accents: `glowAmt`, `accentA`/`B`/`Amt`, `rim`;
  - `bind(p)` for extra uniforms.

**Film** (`src/film/`)

| File | Purpose |
|---|---|
| `cues.js` | **The master timeline**: the `C` table, `BEATS`, `heartGain`, `faderDb`, `pulse`, `MOVEMENTS`. Picture, camera, music and SFX all read it. |
| `world.js` | Time laid out as space along +X: `presentX(t)`, `lifeAt(x)`, the partner and child curves, `FIG`, `MOSAIC`, `BEAD_END`. |
| `camera.js` | The single continuous camera, a Hermite spline through keys. |
| `birth.js` | Movements 0 and I; `embryo.js` builds the embryo. |
| `life.js` | Movement II. |
| `death.js` | Movements III and IV. |
| `glyphs.js` | The stroke font. |
| `film.js` | `buildFilm`: light and grade per t, and the item list. |

**Audio** (`src/audio/`)

| File | Purpose |
|---|---|
| `synth.js` | Instruments and SFX. |
| `engine.js` | The graph; parallel windowed `OfflineAudioContext` render with just-in-time scheduling and sample-grid snapping; mastering hook; player. |
| `master.js` | BS.1770-4 loudness, true peak, limiter. |
| `theme.js` | The theme: E♭ major, 3/4. Its signature is the rising major sixth B♭4→G5. |
| `score.js` | The whole score, built from the cue table. At the death, phrase B stops on D5; the AI completes it on E♭5 in the frame where the bead forms (121.4 s). |
| `testscore.js`, `insttest.js` | Development scores. |

**Timeline:**
- 0 The Bead: 0–12 s.
- I Quickening: 12–38 s (ref 3).
- II The Long Line: 38–90 s (ref 1).
- III Shedding: 90–111 s (ref 2).
- IV Kept: 111–136 s.

Key times are in `C` in `cues.js`.

### Tools

```sh
npm run build
npm run serve                     # http-server on :8080, for manual viewing

# stills (file names: <out>_<t padded>.png) and bursts (<out>_<frame>.png)
node tools/capture.mjs --t 0:136:4 --w 640 --h 360 --out review/raw/p2/s
node tools/capture.mjs --t 97,107,114 --w 1920 --h 1080 --out review/raw/p2/k
node tools/capture.mjs --burst 120.5:121.6 --fps 60 --w 640 --h 360 --out review/raw/p2/b_bead
node tools/capture.mjs --q "solo=figure,contour" --t 97 --w 1920 --h 1080 --out review/raw/solo

# contact sheet, optionally with the refs appended (brace globs don't work: use [0-9] classes)
python3 tools/contact.py review/pass2_sheet.jpg 'review/raw/p2/s_*.png' --cols 6 --width 320 --refs

# score: offline render in Chromium → float WAVs (mix, music stem, SFX stem) + _info.json
node tools/audio.mjs --score film --out review/audio/film
python3 tools/audio_check.py review/audio/film --plot review/audio/film.png
#   --cues cues.json checks each SFX cue against the music stem. The cue file
#   ([{"t": 13.2, "name": "heartFirst"}, ...]) is not written yet: build it
#   from the SFX events in src/audio/score.js (the E(...) calls on B.sfx).

node tools/playtest.mjs           # real playback path: start → render → click → audio-clocked t
```

## 6. Work queue, in priority order

### 6.1 H1: the old figure, movement III (designed, not started)

Target: ref 2 (marble, smoke, silk and gold leaf, streaming to the right).
Files: `src/figure.js`, `src/film/death.js`, `src/dabs.js`, `src/silk.js`,
`src/shed.js`, `src/film/film.js`, `src/film/camera.js`.

Current state:
- The figure is `figureDabs(r, 26000, FIG)` (head, neck and shoulders from
  an SDF) plus nine `paintAlongCurve` drapery strands of 700 dabs each.
- Everything goes through `buildShed` with chart
  `{origin: [FIG[0]−0.55, FIG[1]+0.05, 0], size: 3.0}`.
- The figure's draw uses `crack 0.3, torn 0.3, jitter 0.35` in the `t >= 88`
  lighting block of `film.js`.

Plan:

1. **Split the figure.**
   - (a) Head, neck and shoulders stay as dabs. These are what Haar
     shedding compresses into squares.
   - (b) The body becomes silk veils, smoke and spray. These are not shed
     into squares; they unravel and dissolve with the sweep, before the
     head.
2. **Paint the head in two layers.**
   - **Underpainting:** about 2–3k large soft BLOB dabs (0.06–0.12; 0.03 on
     the face). No torn edges or cracks, low jitter, MARBLE. Colour comes
     from large-scale noise: lit bone planes, slate and ash shadows.
   - **Strokes:** about 10–14k STROKE/SMEAR dabs on cross-contours, as
     `figureDabs` does now. Size 0.015–0.045, torn about 0.2, crack about
     0.15, jitter about 0.2.
   - **Drawing the layers separately:** each layer needs its own uniforms.
     Give the dab descriptors a `group` field and have `buildShed` return
     one DabSet per group, with the same leaf mapping and quantisation time
     `tq` for all groups. Then draw each group with its own options.
   - **Gold leaf:** put the clusters on the lit front edge (brow, chin,
     front of the neck, chest). Keep it off the back of the head and the
     jaw, where it reads as rust. Keep the facial features clean, and keep
     the closed-eye stroke.
3. **Make the dabs silhouette-aware.** Camera-facing quads stick out past
   the silhouette at grazing angles; that is what makes the outline jagged.
   - Add an opt-in uniform `uSil` in `VS_MAIN` of `src/dabs.js`, right
     after `animate(d);` (~line 163).
   - Add the setter `.f1('uSil', u.sil ?? 0)` near the other setters
     (~line 380).
   - `d.pos` is in object space, so push along the object-space normal
     before the model transform:
     ```glsl
     if (uSil > 0.0) {
       vec3 nv0 = mat3(uView) * (mat3(uModel) * d.normal);
       float facing = dot(nv0, nv0) > 1e-4 ? abs(normalize(nv0).z) : 1.0;
       d.pos -= d.normal * d.size * (1.0 - facing) * 0.6 * uSil;
       d.size *= mix(1.0 - 0.65 * uSil, 1.0, smoothstep(0.0, 0.5, facing));
     }
     ```
4. **Change the light** in the `t >= 88` block of `film.js`.
   - Put the key at the left front, where the figure faces, instead of
     behind it: `keyDir ≈ [-0.75, 0.45, 0.25]`.
   - Use a neutral-cool key colour `≈ [1.55, 1.55, 1.6]` instead of the
     warm `[1.9, 1.65, 1.3]`, and `amb ≈ [0.03, 0.035, 0.05]`.
   - The gold leaf and the pulsing chest glow carry the warmth.
   - Goal: the face's profile edge is the brightest part (ref 2's lit edge),
     and the back of the head falls into blue-grey shadow.
5. **Build the body from veils.**
   - Replace the drapery strands and the six thin wisps (they read as
     straws) with 5–7 wide silk veils.
   - Veils: width 0.3–0.8, folds from twist, flowing from the shoulders and
     the back of the head down and to the right (+x, −y).
   - Add soft SMOKE dabs along the veils, a spray of tiny bone and gold
     flecks drifting right, and a few drips hanging below (vertical gravity).
   - Extend `src/silk.js` with options for:
     - hem strength (lower);
     - body opacity;
     - diffuse shading by the key light;
     - ragged, noise-cut edges;
     - a **square dissolve**: cells in (s, v) space vanish past a threshold
       that the sweep drives, so the veils break into squares, the only
       digital fragmentation the brief allows.
   - Defaults must leave the existing silk in movements I and II unchanged.
6. **Tighten the chart.**
   - Chart origin `[FIG[0]−0.5, FIG[1]+0.7, 0]`, size `1.4` (cell ≈ 0.022).
     The 64×64 grid then covers the bust, and the mosaic becomes a detailed
     head-and-shoulders portrait that fits the frame (fixes M8).
   - New sweep: the trailing edge (u ≈ 0.8) goes first at `C.shed[0]` and
     the face goes last at about 109.6 s:
     `tq = C.shed[0] + clamp((0.8 − u)/0.75, 0, 1)·4.2 + gauss·0.15 + face·0.8`,
     with the face term re-centred on the new chart (face at u ≈ 0.07–0.25,
     v ≈ 0.39–0.71).
   - Order of dissolution: veils first (~103.8–107.5), then the shoulders,
     the back of the head and the neck, and the face last.
   - The mosaic spans 64 × pitch (0.058) = 3.7 units. Check that the camera
     keys at 108–123 in `camera.js` still frame it well; raise the pitch if
     the portrait looks small.
7. **Make the quadtree grid adaptive** (M7).
   - Build the 103.5–105.5 grid from the actual leaf occupancy. Subdivide a
     node only if it contains figure dabs: to level 3 in general, and to
     level 5 where the detail is (the face).
   - Draw each level's new lines in turn, as now.
   - Style: hairline (0.7–0.8 px), dimmer (intensity about 0.25–0.35),
     with small diamond dots at the crossings, like ref 2.
8. **Make the rise (88–95) read as the ribbon streaming up into the form.**
   The rough cut logged it as "a messy brown particle cloud".
   - Choose each dab's start point coherently from its rest height: lower
     dabs start nearer the ribbon's end.
   - Move the dabs along a curve: first along +x, then up.
   - Order: underpainting first, then strokes, then gold.
   - `ANIM_FIGURE` in `death.js` does the rise; the start offsets are packed
     into `extra`.
9. **Verify.**
   - Full-resolution stills at 91, 94, 97, 100, 102, 104, 106, 108, 110, 112
     and 114, compared with ref 2 at the same scale.
   - Bursts at 100.8–101.2, 104.8–105.6 and 109.5–110.5.

### 6.2 H2: Quickening (`src/film/birth.js`, 12–36 s, ref 3)

- **Silk wraps:** keep 2–3 of the 6. Make them wider and more transparent,
  with weak hems (use the hem option from §6.1.5), so they stop drawing a
  wire cage over the embryo.
- **Teal haze:** remove it, or turn it into one very soft, large wash behind
  the embryo. No blotches.
- **Blood tissue:** turn the separate red dots into a few coherent masses
  hugging the embryo (bigger dabs, torn edges, palette field), and use less
  of it.
- **Bubbles:** fewer, with more size variation and depth separation.

### 6.3 The remaining pass-1 findings

| ID | Fix |
|---|---|
| M1 | In `camera.js`, keys 63.2–70.6: pull back less (distance ≈ 22–26 instead of 40), so the life fills about 70 % of the frame width. In `life.js`, make the three midpoint arcs brighter and draw them more slowly. |
| M2 | In `life.js`: fewer drips, with varied lengths, some thinner and some beaded. Age slabs: fewer and shorter, broken into squares rather than full columns, lower alpha. No regular spacing. |
| M3 | In `death.js`, the curtain: vary each thread's brightness, width, depth, bead count and fade, and stagger the timing. Add a few big near threads out of focus and many faint far ones. |
| M4 | In `life.js`, the paint: bigger coherent masses (splash tongues, marbled sheets) that follow a flow, fewer small dabs, more black. Check the fraction of pixels below luma 20 against the refs (51–56 %). |
| M5 | In `world.js` (`childAt`) and `life.js`: the child's path should curve and wander like the life's ribbon, in its own colours, instead of rising as a straight stick. |
| M6 | In `cues.js` (`faderDb` knots at 50–60) and `score.js`: bring the love section down 2–3 dB or thin its orchestration, so the climax (114–121.4) is the loudest part. Re-render and check the short-term loudness curve. |
| M7, M8 | Covered by §6.1. |
| L1 | Tame the birth star's blown white core: lower its emissive or the bloom gain at 36–37 s. |
| L2 | Add a few settling dust squares around the bead. |

### 6.4 Review passes 2 to 5 or more (Phase 4 of the brief)

Each pass:

1. Run `npm run build`.
2. Capture a still every 4 s at 640×360 and make a contact sheet with `--refs`.
3. Capture full-resolution key stills at 5, 8.8, 20, 30, 36.3, 44, 55, 61, 67,
   75, 86, 97, 107, 114, 121.5, 125.5, 128.7 and 133.5 s, plus any new key
   moments.
4. Capture 60 fps bursts around the transitions and look for popping,
   flicker above 3 Hz, aliasing and banding:
   - 5.9–6.3 (first cleavage);
   - 35.5–36.5 (birth);
   - 62.8–63.4 (all at once);
   - 100.8–101.2 (last beat);
   - 104.8–105.6 (shedding starts);
   - 120.5–121.6 (the bead forms);
   - 129.4–130 (return and split).
5. Render and check the audio:
   - about −14 LUFS integrated;
   - true peak below −1 dBTP, and no clipping;
   - silences only where intended;
   - every SFX cue audible (write the cue JSON first; see §5 Tools).
6. Review as director, cinematographer and engineer. Log every flaw in the
   review log in PROGRESS.md with a severity, fix it, commit, and repeat.

**Done when:**
- two consecutive passes find no high or medium issue;
- frame time is under 16.7 ms in every movement, measured by the user with
  `#bench`;
- the audio checks pass;
- every shot in PLAN.md is implemented.

### 6.5 Final audio pass, then checkpoint #3

- Fix the balance (M6) and polish the timbres.
- Check that the theme returns at the climax (phrase B completed on E♭5 at
  121.4 s).
- Publish the artifact again (a new one if you are on a different account).
- Ask the user, in Spanish, to:
  - listen with headphones and give feedback;
  - open the film with `#bench` and report the numbers per movement.
- Work their feedback in.

### 6.6 Deliverables

- **`MAKING-OF.md`**, kept short:
  - The hardest problems:
    - paint that read as confetti, solved with the object-space mosaic;
    - legibility of the embryo and the figure (C-curled SDF, strokes
      along `cross(n, view)`, chiaroscuro and the gold profile contour);
    - silk that looked like frost;
    - the score's render cost and seams (just-in-time scheduling,
      sample-grid snapping).
  - The invented technique, Haar shedding: what it is, why it was needed,
    and how it works (the header of `src/shed.js`, PLAN §4.10).
- The title, the two-sentence synopsis above, and `held.html`.
- Update PLAN.md and PROGRESS.md, then commit and push.

## 7. Conventions and lessons (read before changing code)

- **Determinism:** each frame is a pure function of t.
  - No accumulated state: every `animate()` hook is closed-form in `uTime`.
  - In the audio, every event has its own seeded RNG (`rng(7919*(id+1))`),
    so the parallel windows render identically.
- **One timeline:** add new events to `C` in `cues.js`, and read them from
  there in both the picture and the score.
- **Hook uniform names:** give them a per-module prefix (the shed uses
  `uSh*`). Name clashes break programs silently.
- **GLSL:** write float literals (`40.0`). An int literal inside vector
  maths is a compile error.
- **Gold lines** are 1–1.5 px hairlines at 1080p. Check them in 4× crops.
- **Black and density:** the background is #050407, dithered. Watch the
  share of pixels below luma 20; the refs sit at 51–56 %.
- **Paint look:** it comes from the object-space mosaic plus the palette
  field. Per-stamp cells read as confetti; spike S2 rejected them.
- **Audio renderer:**
  - never schedule all events up front (it is 2–3× slower);
  - keep the sample-grid snapping;
  - the pre-roll is 12 s, and raising it is not a fix for seams.
- **No external assets or URLs:** the build rejects URLs. Text is drawn
  with the stroke font.
- **Safety:** no flashing above 3 Hz and no full-screen white.
- **`tools/contact.py`** does not expand brace globs.
- **Keep PROGRESS.md current every session.** The brief requires it.
