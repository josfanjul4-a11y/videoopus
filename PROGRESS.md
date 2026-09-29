# PROGRESS

Session log for the production of **HELD**. Newest session at the bottom.
Every session records what was done, what was decided, what is broken, and
what comes next. Review findings are logged with severity (high / medium /
low) in the review section once Phase 4 starts.

## Status

| Phase | State |
|---|---|
| 1 Concept | Done. **HELD** approved at checkpoint #1. |
| 2 Pre-production | Plan written (PLAN.md §4). Spikes done; see the table in session 1. |
| 3 Production | First complete rough cut built (session 1). Waiting on human checkpoint #2. |
| 4 Review loop | Not started |

Human checkpoints: (1) after the concept, (2) after the first complete rough cut,
(3) after the final audio pass.

## Environment notes

- Container: 4 CPUs, 15 GB RAM, **no GPU**. Headless Chromium (Playwright,
  `/opt/pw-browsers/chromium`) renders WebGL2 through SwiftShader, a CPU
  rasteriser. Stills and deterministic frame bursts can be captured here.
  **Frame times measured here say nothing about a 2022 laptop GPU.** Real
  timing needs the in-page benchmark (planned: `?bench`) run on real hardware.
- Tools: Node 22, Python 3.11 with numpy, scipy and Pillow (installed by pip),
  Playwright 1.56 (global), http-server (global), Playwright's own ffmpeg build.
- References copied from the task attachments into `refs/1.webp`,
  `refs/2.webp` and `refs/3.webp` (1254×1254 each).

## Session 1 (2026-09-29)

- Repository was empty. Created `refs/`, `PLAN.md` and `PROGRESS.md`.
- Studied the three references at full size and in 2× crops. Measured each:
  about 51–56 % of pixels sit below luma 20, and the median luma is 12–19.
  Key finding: the paint is *cellular* (irregular flat patches with dark
  cracks), not smooth strokes. Notes are in PLAN.md §0.
- Phase 1: 20 interpretations, an elimination table and scores. Chosen:
  **HELD** (a life opened from, and folded back into, a single bead). The
  invented-technique candidate is *Haar shedding*: the compression discards
  detail and turns that discarded detail into the square fragments, and the
  same operation run in reverse is the opening cell cleavage.
- Next: human checkpoint #1 on the concept, then Phase 2 (timed shot list,
  score, technical breakdown, budgets) and spikes for the riskiest techniques
  (Haar shedding, the cellular paint look, hairline gold lines in 3D).

### Session 1, continued: checkpoint #1 and Phase 2

- **Checkpoint #1:** the user chose **HELD** (recommended option).
- PLAN.md §4 written: cue table, shot list, score design, technical
  breakdown, architecture, budgets, spike criteria, Haar-shedding details.
- Tooling: `tools/build.mjs` (esbuild bundle → `held.html`, fails on any URL),
  `tools/capture.mjs` (stills and bursts through `window.__renderAt(t)`),
  `tools/contact.py` (contact sheets, optionally next to the refs),
  `tools/audio.mjs` (offline render → float WAV mix + music/SFX stems),
  `tools/audio_check.py` (BS.1770-4 loudness, true peak, silences, per-cue
  masking check against the stems).
- Engine: matter pass (premultiplied dabs + composited depth for line
  occlusion), line pass (MAX blend, analytic AA), post (bloom with a knee,
  exponential shoulder, painterly background, grain, triangular dither).

**Spike results**

| Spike | Result | Evidence / notes |
|---|---|---|
| S1 lines, background, post | pass | lines measure ~1.5 px with clean AA and no joint beads (4× crop). Bloom veil lifted blacks to (8,6,8); fixed with a bloom knee |
| S2 cellular paint | pass, direction set | Per-stamp cells read as **confetti** (rejected). An **object-space mosaic** continuous across dabs, with colour from a palette field at each patch centre, reads as ref 1's paint. Style frame: `review/spikes/s2_style_frame_ref1.jpg` |
| S3 Haar shedding | pass (mechanism) | Figure → squares → mosaic in the life's colours → 6 merges → bead, all closed-form in *t*. Bug found and fixed (the colour pyramid wrote coarse levels to the wrong texel). Needs art direction at the real framing |
| S4 figure / embryo | partial | Figure legible only after two changes: **chiaroscuro** (key light from behind-left) and a **gold contour of the profile** (the AI's line tracing the face). Body as flowing drapery instead of an SDF torso. Beauty not there yet. Embryo not spiked yet: production item |
| S5 silk | pass | reads as glowing silk in the style frame; smoke wisps need thinner, twistier variants |
| S6 audio | pass on levels, fail on speed | test score: −14.03 LUFS, −1.19 dBTP, 0 clipped samples (Python agrees with the in-page meter). Render 11.5 s for 57 s of audio here. **Parallel OfflineAudioContexts give 3.7× on 4 cores**, so the score will render in parallel chunks at page load |

**Open issues carried into production**

| Sev | Issue |
|---|---|
| high | Figure is legible but not beautiful (pebbly surface, log-like shoulders, flat silk strips). |
| high | Embryo not yet built. |
| high | Audio render time: implement parallel chunking with per-event seeded RNG. |
| medium | Style frame is denser than the refs (41 % of pixels below luma 20 vs 51–56 %). Compose with more black. |
| medium | Paint edges too gravel-like; want longer flowing contours at mass edges. |
| low | Wash layer is barely visible; tune or drop. |

### Session 1, continued: production to the first complete rough cut

- `src/film/`: `cues.js` (master timeline, heartbeat schedule, heart gain,
  dynamics curve), `world.js` (time as space: the present's x(t) integrated
  from a speed curve, the life, partner and child curves), `camera.js` (one
  Hermite camera through keyframes; the life's tracking keys are generated
  from the present), `birth.js` (movements 0 and I), `life.js` (II),
  `death.js` (III and IV), `embryo.js`, `glyphs.js` (stroke font), `film.js`.
- `src/audio/score.js`: the full score from the same cue table. Renderer now
  splits the film into parallel windows (10 s pre-roll, per-event seeded RNG,
  a context proxy that shifts every scheduled time), plus one context for
  long drones; a dynamics curve is applied after the render, then mastering.
- Playback shell: start screen (title, a ring filling while the score
  renders, then CLICK), audio clock drives t, dynamic resolution, `?debug`
  overlay drawn with the stroke font, `?bench` per-movement frame times
  (GPU timer query where available), `?solo=tags` for inspection.
- Checks: `tools/playtest.mjs` (start → render → click → playback: no errors,
  film time follows audio). Film score: **−14.62 LUFS, −1.19 dBTP, 0 clipped**.
  Rough-cut contact sheet: `review/rough_cut_1.jpg`.

**Art-direction fixes made while building (logged for the making-of)**

- Embryo read as a "snowman", then as a box: rebuilt as a C-curled SDF
  (big head bent forward, tapering body, limb buds) and strokes oriented by
  `cross(n, view)` so they follow the silhouette (horizontal strokes made
  flat tops). Glow light excluded from the embryo's own dabs (it blew out).
- Silk read as feathers/frost: rewritten as mostly transparent bands with
  fine straight fibres, grazing sheen and thin antialiased hems.
- Curtain of kept lives was a wall of gold: thinned to 150 threads, dimmed
  during the return so the last frame matches the first.

**Known issues at rough cut 1** (to be logged into the review loop)

| Sev | Issue |
|---|---|
| high | Score render takes ~26–31 s on this 4-vCPU container (start-screen wait). Target < 10 s on a 2022 laptop; needs measuring there and more optimisation. |
| high | Figure (III) is legible but reads as a plaster bust; needs ref 2's marble, smoke, gold-leaf richness. |
| high | Real-GPU frame times unknown: run `held.html?bench` on real hardware. |
| medium | Quickening frames are cluttered (silk hems, tissue dots, bubbles, haze). |
| medium | Midpoint pull-back (63–71) is too far: the life is a thin strip, the arcs are faint. |
| medium | Drips and age slabs form a "barcode" / skyline; the age slabs dominate at 84–88 s. |
| medium | Figure rise (90–93) is a messy brown particle cloud. |
| medium | Love section is about as loud as the climax (−9 vs −8 LUFS short-term). |
| low | Integrated loudness −14.62 (inside ±1 LU but could sit closer to −14). |
