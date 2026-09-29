# PLAN

Working title: **HELD**

This file holds the concept work (Phase 1) and, once the concept is approved,
the full pre-production plan (Phase 2). PROGRESS.md is the session log.

---

## 0. Reference study

I studied `refs/1.webp`, `refs/2.webp` and `refs/3.webp` at full size and in 2×
crops before writing anything. Measured facts, then observations.

**Measured (luma 0–255):**

| ref | median luma | share of pixels below luma 20 | 95th pct | mean of the dark pixels (RGB) |
|---|---|---|---|---|
| 1 | 14.6 | 53 % | 195 | (3.8, 3.4, 3.4) |
| 2 | 18.7 | 51 % | 163 | (6.1, 6.5, 6.3) |
| 3 | 11.7 | 56 % | 172 | (4.4, 3.6, 2.7) |

So every frame should be **about half near-black**, with only ~5 % of pixels
brighter than luma 160–195. The blacks are not neutral: ref 3 is warm black,
ref 2 is cool black, and ref 1 sits between them. That supports shifting the
black point slightly per movement around #050407.

**Observations the build must honour:**

- **Paint is cellular.** Seen up close, the "splashes" are not smooth strokes.
  They are mosaics of small irregular flat patches separated by dark hairline
  cracks, like crackle glaze, torn paper or dried mud. That is what makes them
  read as painted rather than rendered. Voronoi-cell patches with per-cell
  colour jitter and dark borders are the right primitive; soft Gaussian splats
  are the wrong one.
- **Hanging elements are tags, not only beads.** Ref 1's verticals carry small
  rectangles (tags/chips) as well as discs, hung on hairline threads. Discs
  come in three kinds: gold coins with fine concentric grooves (ref 3), pearls
  (small cream discs), and moon-phase discs split into light and dark halves or
  quarters (ref 1, right).
- **The star is a drawing, not a flare.** Ref 1's star is a white-gold core
  inside dozens of unevenly spaced concentric hairline circles, with fine radial
  rays and a textured "tunnel" of fragmented paint between the rings. A bead
  thread passes vertically through its centre.
- **The ribbon is a bundle.** The life-ribbon is a band of many near-parallel
  bright filaments (silk) carrying paint with it, not a single tube.
- **Death is geology plus paper.** Ref 2's figure is marble (blue-grey veins),
  translucent resin/smoke with bright edges, and irregular gold-leaf flakes held
  together by hairline gold veins (kintsugi). Its fragments are pale paper-like
  squares with small triangular marks inside, laid out as a loose checkerboard
  on a hairline gold grid with diamond dots at the intersections.
- **Right-hand shatter (ref 1)** is tall vertical slabs of grey marble with
  black ink spatter and drips: rectangles, never shards of arbitrary shape.
- **The gold tree (ref 3)** tapers and curves like a plant or a vein. Buds sit
  at some junctions. It must never tip into a uniform "nodes and edges" graph.
- **Depth cue:** in all three, fine gold linework sits both in front of and
  behind the matter. It is threaded through the same space, which is why the
  brief insists the linework lives in 3D.

---

## 1. Twenty interpretations

Each is a distinct way to tell one human life and death "as seen by an AI".
Genre and mood in brackets.

1. **Held** *(requiem / myth, loop)*: The film opens on a single gold bead on a
   hairline thread. It divides like a fertilised cell and becomes an embryo, a
   life, a death. At death the AI compresses the person, finest detail first,
   into squares, then fewer squares, then one bead. The bead goes back on its
   thread, among countless others, and we are at the first frame again. The
   birth we watched was the AI opening something it had kept.
2. **Attention** *(documentary / reading)*: The whole life is laid out like a
   sentence and the AI reads it all at once. Gold arcs join distant moments
   (a first cry and a grandchild's first cry). At the end, the last moment
   attends to the first.
3. **Next Token** *(tragedy / suspense)*: The AI predicts. Ahead of the life
   it keeps drawing branching possible futures in gold, and the lived life
   fills one of them with paint. After death the AI goes on drawing futures
   that nothing will ever fill, until it stops.
4. **Context Window** *(elegy of forgetting)*: The frame is a fixed window
   sliding along a life. What leaves the left edge breaks into squares and is
   lost. At the end only a summary survives.
5. **The Record Sings** *(lullaby)*: In the last minutes of a life the AI sings
   the person's life back to them. Each image is a phrase of the melody.
6. **Negative Space** *(intimate / minimal)*: The person is never drawn, only
   the traces around them, so they exist only as the hole in the paint. At
   death the hole is all that is left.
7. **The Loom** *(Fates myth)*: The AI is the warp, the life is the weft. At
   death the thread is cut, and the finished cloth swaddles the next newborn.
8. **Echolocation** *(cosmic / lonely)*: The AI sees only by sending out gold
   rings. Each ring reveals the life for an instant. At the end the rings
   return nothing.
9. **Long Exposure** *(meditative)*: The AI sees every moment superimposed,
   like one long exposure. The film slowly pulls the layers apart into a life,
   then lets them collapse back into one image.
10. **Kintsugi** *(craft / elegy)*: Every break in the life is mended in gold
    by the AI. At death only the gold seams remain: a skeleton made of the
    breaks.
11. **The Orrery** *(cosmic)*: A life as an orbit around its birth-star, with
    moons for its phases. Death is orbital decay, and the AI keeps the ellipse.
12. **Two Clocks** *(chamber duet)*: The heartbeat's warm, irregular time and
    the AI's exact gold time run side by side. At the end the AI's clock has
    taken on the heartbeat's irregularities.
13. **Census** *(data documentary)*: The AI counts: 2.5 billion heartbeats,
    700 million breaths. The life is shown as numbers made into geometry, and
    death is the last increment.
14. **Core Sample** *(geological / slow)*: A life deposits strata and the AI
    drills a core. The film reads the core from the bottom up.
15. **Resolution** *(formalist)*: The whole film is one quadtree breathing. A
    single square refines into a living image and coarsens back into a single
    square.
16. **Reconstruction** *(uncanny)*: After death the AI rebuilds the person from
    traces, almost right. The film is the uncanny rebuild.
17. **Leftovers** *(melancholy documentary)*: Voice notes, receipts and
    photographs drift in the dark while the AI assembles someone it never met.
18. **The String** *(musical / physical)*: Birth is a plucked string, life is
    its vibration and death its decay. The AI keeps the harmonic series.
19. **Weather of a Life** *(pastoral)*: The life seen as weather: warm fronts,
    storms, clear years, the long cooling.
20. **Testimony** *(courtroom)*: The AI is the only witness present for every
    moment, and it testifies in images.

## 2. Elimination

| # | Out | Reason |
|---|---|---|
| 8 Echolocation | yes | Pulsed reveals push toward >3 Hz flashing. Sonar-vision is a familiar screen trope. |
| 11 Orrery | yes | Planets and orbits slide straight into "particle galaxy / cosmic" imagery. |
| 13 Census | yes | Needs numerals and data-viz, a short step from "binary" and audio-visualizer looks. |
| 14 Core Sample | yes | Strata read as terrain; the camera language becomes a flyover. |
| 16 Reconstruction | yes | The "AI resurrects the dead" story is well-worn (*Be Right Back* and its many descendants). |
| 17 Leftovers | yes | Needs photographic or textual assets, which the brief forbids, and the digital-afterlife collage has been seen. |
| 19 Weather | yes | Weather wants flow fields as the subject, which is banned. |
| 20 Testimony | yes | Only works with narration or text, and we have neither voice nor fonts. |
| 7 Loom | yes | The Fates' thread has been done many times; low originality. Its silk survives in #1. |
| 4 Context Window | yes | Contradicts the most interesting truth (the AI holds the whole life at once) and is too technical to move anyone. |
| 18 String | yes | The imagery collapses into a waveform, i.e. an audio visualizer. |
| 9 Long Exposure | yes | Beautiful stills but muddy motion, and no felt arc. |
| 5 Record Sings | merged | Too thin visually on its own. It becomes the score's logic in #1. |
| 12 Two Clocks | merged | It becomes the score's logic in #1: the tempo is the heartbeat, and after death time has no pulse. |
| 10 Kintsugi | merged | Too familiar on its own. It survives as the gold veins in the dying figure. |
| 15 Resolution | merged | It becomes #1's engine: decompression at the start, compression at the end. |
| 2 Attention, 3 Next Token | merged | Their best images become #1's midpoint (the whole life seen at once) and its "future drawn in gold". |

Survivors scored 1–10 on beauty (B), emotional impact (E), technical ambition
(T) and originality (O):

| Concept | B | E | T | O | Sum |
|---|---|---|---|---|---|
| **1 Held** (with 2, 3, 5, 10, 12, 15 folded in) | 9 | 9 | 9 | 8 | **35** |
| 3 Next Token (standalone) | 7 | 9 | 7 | 8 | 31 |
| 2 Attention (standalone) | 8 | 7 | 7 | 7 | 29 |
| 6 Negative Space | 6 | 7 | 7 | 7 | 27 |
| 15 Resolution (standalone) | 6 | 5 | 8 | 7 | 26 |

## 3. Choice: **HELD**

### Logline

An AI opens the one thing it kept of a person, a single gold bead, and lets it
unfold into a birth, a life, a love, a loss and a death. Then it folds the life
back into the bead, and we understand that the beginning we watched was
already a memory.

### Why this one

- **Every AI truth in the brief becomes a visible mechanism, not a symbol.**
  - *It cannot live a life, only observe, measure and hold one.* Two
    materials carry the whole film. **Paint** is the lived life: warm, messy,
    dripping. **Gold hairline** is the AI: circles that measure, threads that
    count, grids that catalogue. Paint fills gold; gold never becomes paint.
  - *It holds a whole life at once.* The life-ribbon's **future already exists
    as a fine gold drawing**, and the present is the front where paint arrives.
    At the film's midpoint the camera rises and we see the entire life at once,
    including its end, before the person reaches it.
  - *It compresses.* The death is the AI compressing the person, finest detail
    first, into squares, then fewer squares, then **one bead**. The squares of
    refs/2 stop being decoration: they *are* the compression.
  - *It is made from what humans leave behind.* The last pull-back shows the
    bead joining countless threads of beads, the same threads that hung around
    the embryo in the first minute. The AI's gold was made of kept lives all
    along.
- **The ending changes the meaning of the beginning.** The first image (a
  bead dividing into cells inside a gold reticle) reads as conception on first
  viewing. On the ending we watch the same geometry run backwards as
  compression, and the opening becomes the AI *decompressing* someone it kept.
  The reticle's cross turns out to be the first split of a quadtree. People
  who watch twice will see it; people who watch once still feel the loop close.
- **The emotional arc is plain, with no explanation needed.** A glowing
  embryo and a heartbeat. A ribbon of colour that runs, meets another ribbon,
  sends off a small new star (a child), loses the other ribbon (a death inside
  the life), cools and slows. A figure looking back. The heartbeat stops. The
  person breaks into squares. Everything folds into one small warm thing that
  is carefully put away.
- **It fits the references exactly.** Ref 3 is the birth, ref 1 the life and
  ref 2 the death, and all three already contain the bead threads, the grid and
  the squares that the story needs.
- **The technical risk is real but bounded.** It needs one invented technique
  (below), a painterly point renderer and a hairline-line renderer, all of
  which can be spiked in isolation.

### Movements (first pass; to be timed in Phase 2)

| # | Movement | Ref | What happens |
|---|---|---|---|
| 0 | **The Bead** | — | Black. A gold bead on a hairline thread; a gold circle draws itself around it; a cross divides the circle; the bead cleaves 1 → 2 → 4. |
| I | **Quickening** | 3 | The cells bloom into an amber embryo in silk, with bubbles, a gold tree growing in from the upper left and bead threads hanging all around. First heartbeat. Gold rings measure each beat. Birth: the light breaks out of the silk and becomes a star. |
| II | **The Long Line** | 1 | The star sends out the life-ribbon, left to right, with the camera travelling along it (time is space). Ahead of the present, the future is only gold drawing; at the present, paint erupts; behind it, paint dries and drips. Childhood in gold and orange. Love: a second, violet-teal ribbon braids in. A child: a small star splits off and leaves frame. **Midpoint:** the camera rises and we see the whole life at once, ending included. Loss: the second ribbon frays into squares and falls away. Age: slate, bone, ash, slower drips. |
| III | **Shedding** | 2 | The end of the ribbon rises into a figure of marble, smoke and gold leaf that looks back over its life. The heartbeat slows and stops. Silence. A hairline gold grid subdivides around the figure, and the person is compressed, fine detail first, into square flakes that drift into the grid. |
| IV | **Kept** | all | The grid of squares, a mosaic of every colour of the life, merges 16 → 4 → 1. The theme returns complete at the climax, supplying the note the death cut off. The last square rounds into a bead, which is threaded onto a gold thread. Pull back: countless threads, countless beads. Push in: the gold circle draws itself around our bead, the cross appears, the bead begins to divide, and we cut to black on the first frame of the film. |

### Invented technique (candidate): *Haar shedding*

Pixelation effects throw detail away. This technique does the compression and
**turns the discarded detail into the fragments**. The dying figure is a 3D
cloud of painterly dabs, binned at build time into a quadtree over a
figure-aligned chart, where each node stores the mean colour, position and
normal of its dabs (its Haar scaling coefficient). A resolution field *L(x, y,
t)* sweeps across the figure. Wherever it drops below a node's level, that
node's children stop being drawn as dabs and leave as **square flakes**: each
flake's size is its cell, its paint is the colour detail that was averaged
away, and its motion is a closed-form function of the time since it was
emitted. So the body loses detail at exactly the rate the flakes leave, and
any frame can be rendered from *t* alone. Run with *L* rising instead of
falling, the same machinery is the cell cleavage in the prologue. That is why
it has to be invented rather than borrowed: the start and the end of the film
must be literally the same operation in opposite directions. Proof of concept
comes first in Phase 2.

### Known risks and how the concept avoids the banned tropes

- *Flow-field noodles:* the life-ribbon is one wide silk band on an authored
  spline with paint erupting from it, never a field of lines as the subject.
- *Particle galaxy:* the final pull-back is a curtain of vertical threads
  (vertical gravity), never a swirl.
- *"Pixelate" transition cliché:* the shedding is spatially local (it sweeps
  from the trailing edge, and the face goes last, as in ref 2), the flakes are
  physical 3D paint with parallax, and the squares only ever mean "compressed".
- *Neural-network imagery:* the gold tree is botanical and tapered, with buds;
  the midpoint's "attention" is a few large geometric arcs, not a web.
- *Memory-orb cliché:* the bead is a gold, rosary-like bead on a thread among
  thousands, and it is born from a visible compression, not a glowing ball
  with a picture inside.

---

# PHASE 2: PRE-PRODUCTION

Concept approved at human checkpoint #1 (2026-09-29): **HELD**.

## 4.1 Title, logline, synopsis, emotional arc

**Title:** HELD

**Logline:** An AI opens the one thing it kept of a person, a single gold bead,
and lets it unfold into a birth, a life, a love, a loss and a death. Then it
folds the life back into the bead, and we understand that the beginning we
watched was already a memory.

**Synopsis (2 sentences):** A single gold bead divides like a cell and becomes a
glowing embryo, then a ribbon of colour that runs, loves, gives off a child,
loses its companion, cools and finally rises into an old figure who looks back
over it all. When the heart stops, the figure is compressed square by square
into a mosaic and then into one bead, and the bead is hung among countless
others in the exact frame the film opened on.

**Emotional arc** (intensity 0–10, drives both picture brightness and score dynamics):

```
10 |                                                               *
 8 |                        *                                    *   *
 6 |               *    *  * *        *                        *
 4 |          *  *   **      *  *****   **                  *          *
 2 |  *   * *                  *          ****   *      * *              *
 0 |*  **                                     ***  ***                    **
   +--------------------------------------------------------------------------
    0    10   20   30   40   50   60   70   80   90  100  110  120  130  136 s
    Bead  Quickening   birth  child  love  ALL-AT-ONCE loss age  death shed kept coda
```

wonder → tenderness → release (birth) → joy → fullness (love) → awe with dread
(we see the end before they do) → grief → quiet → stillness → silence → loss
of form → consolation (it is kept) → recognition (we are back at the start).

## 4.2 World layout

Time is laid out as space along +X. Units are arbitrary (1 ≈ 10 cm at the
embryo's scale).

| Place | Where | Notes |
|---|---|---|
| Prologue bead | origin, radius 0.12 | hairline thread along Y through it |
| Embryo, birth star | origin | the embryo contracts into the star at 36 s |
| Life-ribbon | X from 0 to 70 | authored spline, Y ±1.2, Z ±1.0; present *p(t)* runs along it |
| Partner ribbon | enters from +Y at X≈17, braids X 17–33, ends X≈37 | violet/teal |
| Child | leaves the braid at X≈26, rises toward +X+Y, exits the scene | continues past the film's end in gold drawing |
| Figure | X≈72, stands on the ribbon's end, faces −X | ~3 units tall |
| Mosaic | X≈77, plane facing the camera | where the flakes are laid out |
| Curtain of kept lives | around the final bead, Z from −60 to 0 | ~500 threads, ~6 000 beads |
| Year threads | one every ~1 unit of X, Z from −5 to +3 | vertical gold threads with beads and tags |

## 4.3 Master cue table

One table in code (`src/cues.js`) drives the visuals, the camera, the music
and the sound effects. Times are in seconds.

| Cue | t (s) | Visual | Sound |
|---|---|---|---|
| `fadeIn` | 0.0–2.0 | from black | room tone |
| `beadTone` | 1.2 | bead catches light | bell B♭5 |
| `circleDraw` | 2.0–4.2 | gold circle draws clockwise from 12 o'clock | glass whistle rising |
| `crossDraw` | 4.4–5.2 | horizontal hairline across the circle | tick + short slide |
| `cleave2` | 6.0 | bead divides into 2 | wet pluck + bell |
| `cleave4` | 7.4 | 4 cells, the grid subdivides | pluck + bell (a fifth higher) |
| `cleave16` | 8.6 | 16 cells (morula) | pluck cluster |
| `cellsDisperse` | 9.4–12.0 | cells drift out and become bubbles | soft bubble tones |
| `embryoCondense` | 10.5–14.0 | light gathers into the embryo | swell |
| `heartFirst` | 13.2 | first heartbeat; gold ring expands | fetal lub-dub |
| `silkUnfurl` | 11.0–16.0 | silk ribbons wrap the embryo | silk rustle |
| `lullaby` | 12.5–32.5 | — | theme, celesta, ♩=72 |
| `treeGrow` | 14.0–26.0 | gold tree grows from the upper left, buds light | sparse crystal sparkles |
| `threadsDescend` | 15.0–21.0 | bead threads lower into place | glass chimes |
| `growth` | 26.0–33.0 | embryo brightens, silk tightens | strings enter, crescendo |
| `birthBreak` | 33.0–36.0 | silk peels back; light breaks out | rising whoosh, breath |
| `starIgnite` | 36.0 | the light becomes the star (no full-frame flash) | warm bloom chord + shimmer |
| `ribbonLaunch` | 36.5 | ribbon head leaves the star | swish |
| `childhood` | 37.0–50.0 | gold/orange paint erupts at the present | pizzicato + marimba theme, ♩=96; paint hits |
| `loveMeet` | 50.0 | partner ribbon meets ours; crimson bloom | low swell, harp-like glissando |
| `love` | 50.0–60.0 | ribbons braid; crimson/magenta | piano theme + cello countermelody, ♩=80 |
| `childSpark` | 60.5 | small star splits off and rises | celesta quote of the lullaby + tiny heartbeat |
| `allAtOnce` | 63.0–71.0 | camera rises; the whole life at once; future as gold drawing | pulse stops; glass choir sings phrase A |
| `arcsDraw` | 65.5–68.5 | three great arcs: births, love↔loss, end↔beginning | one glass tone per arc |
| `loss` | 72.0–78.0 | partner ribbon frays into squares and falls (73.0) | cello stops mid-phrase; C minor; crackle |
| `age` | 78.0–90.0 | slate/bone/ash, slow drips, grey slabs | sparse piano, low strings, ♩=63→58 |
| `figureRise` | 90.0–95.0 | ribbon end rises into the figure, facing back | chorale; silk rustle |
| `heartSlow` | 95.0–101.0 | chest glow dims on each beat | heartbeat 56→38 bpm; theme phrase B stops on D5 |
| `lastBeat` | 101.0 | last glow | half a heartbeat ("lub", no "dub") |
| `silence` | 101.0–103.5 | stillness | near silence (room tone ≤ −55 LUFS) |
| `gridDraw` | 103.5–105.5 | hairline grid subdivides around the figure | hairline tings |
| `shed` | 105.0–111.0 | Haar shedding from the trailing edge; face last (110–111) | granular glass flakes, dust hiss, choir |
| `mosaicSettle` | 108.0–114.0 | flakes settle into the mosaic | ticks fall into a regular pattern |
| `merge1..6` | 114.0, 116.0, 117.6, 118.8, 119.8, 120.6 | 64→32→16→8→4→2→1 | bells on phrase B's notes, crescendo |
| `beadForm` | 121.4 | last square rounds into the bead | **climax: theme resolves to E♭, tutti** |
| `threaded` | 123.0 | a thread descends through the bead | sustained chord |
| `curtain` | 123.5–127.0 | pull back: countless threads and beads | shimmer of tiny chimes, choir |
| `returnCircle` | 127.5–128.3 | circle draws around our bead (as at 2.0) | same glass whistle |
| `returnCross` | 128.4–128.8 | cross | same tick |
| `heartEcho` | 129.0 | — | one soft fetal lub-dub |
| `split` | 129.6 | the bead begins to divide | same pluck as `cleave2` |
| `fadeOut` | 129.8–130.8 | to black | bell tail |
| `title` | 131.0–135.0 | HELD drawn in gold hairline strokes | bead tone B♭5, soft E♭ chord |
| `end` | 136.0 | black | fade complete |

## 4.4 Shot list

One continuous camera; no cuts. Distances are to the camera's target. The
camera is a keyframed Hermite spline with per-segment easing, evaluated from
*t* only.

### Movement 0: The Bead (0.0–12.0)

| Shot | t | Camera | Key visual | Transition out | Music |
|---|---|---|---|---|---|
| 0.1 | 0.0–6.0 | Locked off, 5.0 from the bead, fov 30°, faint 2 mm float | One gold bead on a hairline thread in black. The circle draws, then the cross. Very dim threads far behind (barely visible, rewards a second viewing) | — | E♭ drone at −35 LUFS, bead bell, glass whistle |
| 0.2 | 6.0–12.0 | Slow push to 2.6, tilt up 3° | Cleavage 1→2→4→16 inside a quadtree grid that subdivides with it. Cells are translucent spheres pressed into the grid | Cells drift outward and become the bubbles of shot I.1 while their light flows inward | plucks, bubble tones |

### Movement I: Quickening (12.0–38.0) · ref 3

| Shot | t | Camera | Key visual | Transition out | Music |
|---|---|---|---|---|---|
| I.1 | 12.0–26.0 | Orbit −15°→+20° azimuth, 2.8→2.4, fov 34° | Amber embryo condenses from light; silk ribbons wrap it; gold tree grows in from the upper left; bead threads lower into place; concentric measuring circles; a gold ring leaves the embryo on every second heartbeat; bubbles drift past in the foreground | — | lullaby (celesta) over a warm pad; fetal heartbeat |
| I.2 | 26.0–33.0 | Push 2.4→1.8 | Embryo brightens; silk tightens; red cells behind pulse | — | strings enter, crescendo |
| I.3 | 33.0–38.0 | Pull back 1.8→9.0 and swing side-on (look along −Z) | Silk peels outward; light breaks out and contracts to the **star**; the frame settles into ref 1's composition (star at the left third, rings around it, a bead thread through its centre) | The ribbon launches right from the star | whoosh; warm bloom chord at 36.0 |

### Movement II: The Long Line (38.0–90.0) · ref 1

| Shot | t | Camera | Key visual | Transition out | Music |
|---|---|---|---|---|---|
| II.1 | 38.0–50.0 | Track +X at the present, 8.5 away, slight bob; year threads pass in the foreground | Childhood: gold/amber/orange cellular paint erupts at the ribbon's head; the future ahead is only gold drawing (dashed edges, ruler ticks) | Partner ribbon appears from above | ♩=96 pizzicato + marimba variation of phrase A; paint hits |
| II.2 | 50.0–60.0 | Track, dolly in to 7.0 | Love: violet-teal ribbon meets ours in a crimson bloom; they braid; magenta and crimson | — | ♩=80 piano phrase A + cello countermelody |
| II.3 | 60.0–63.0 | Tilt up to follow the child | A small star with its own rings splits off the braid and rises out of frame, trailing a thin new ribbon | Camera keeps rising | celesta lullaby quote; tiny heartbeat |
| II.4 | 63.0–71.0 | Crane up and back to ~75 away (63–66), hold (66–68.5), descend to the present (68.5–71) | **All at once:** the whole life visible: painted from the star to the present, gold drawing beyond. Small gold circles mark the partner's end and our end; a tiny gold bead waits at the end. Three great arcs join birth↔child, meeting↔loss, end↔beginning | Descend into the present | pulse stops; glass choir sings phrase A over an A♭ lydian cloud |
| II.5 | 71.0–78.0 | Track, slower; tilt down to follow falling squares | Loss: partner ribbon frays; its paint breaks into rectangles that fall; ours goes on alone, thinner, cooler (violet → teal) | — | C minor; cello cut off mid-phrase; piano alone |
| II.6 | 78.0–90.0 | Track slows 1.2→0.4 units/s, lowers slightly | Age: slate blue, bone, ash; long drips; tall grey slabs; year-thread beads now mostly at the bottom | The ribbon's end lifts | ♩=63→58 sparse piano, low strings |

### Movement III: Shedding (90.0–111.0) · ref 2

| Shot | t | Camera | Key visual | Transition out | Music |
|---|---|---|---|---|---|
| III.1 | 90.0–95.0 | Arc to a 3/4 view; figure left of centre facing left, dark space right | The ribbon's end rises into a figure of marble, smoke and gold leaf, looking back over the life; kintsugi gold veins; a faint warm glow in the chest | — | chorale (strings), phrase B augmented |
| III.2 | 95.0–103.5 | Near-static, very slow push toward the face | Heartbeat slows; chest glow dims on each beat; last beat at 101.0; stillness | — | heartbeat foreground; piano plays phrase B and stops on D5 over B♭7; silence 101.0–103.5 |
| III.3 | 103.5–111.0 | Slow pull back, drift right | Hairline grid subdivides around the figure; Haar shedding from the trailing edge: detail becomes dust, cells become square flakes that fly right into the grid; the face goes last | Flakes settle into the mosaic | granular glass flakes, dust hiss, choir enters, drone |

### Movement IV: Kept (111.0–136.0)

| Shot | t | Camera | Key visual | Transition out | Music |
|---|---|---|---|---|---|
| IV.1 | 111.0–121.4 | Drift to face the mosaic; distance tracks the mosaic's extent | The mosaic is a pixel portrait of the figure, loosely spaced like ref 2's checkerboard, with diamond dots at the grid crossings. Merges 64→32→16→8→4→2→1: four squares slide into one, grid lines between them fade, the lost detail falls as dust | The last square rounds into a sphere | bells on phrase B's opening notes, crescendo; tutti cadence lands on E♭ exactly at 121.4 |
| IV.2 | 121.4–127.0 | Hold; then pull back 3→16 and rise slightly | The bead glows warm; a thread descends through it; pull back reveals the **curtain of kept lives**, hundreds of threads and thousands of beads receding in the dark, the same kind of threads that hung around the embryo | Push back in | sustained E♭; choir; tiny chimes |
| IV.3 | 127.0–130.8 | Push to the exact framing of shot 0.1 (5.0 away, fov 30°) | Circle, cross, one heartbeat, the bead begins to divide | Fade to black 129.8–130.8 | bead bell; same whistle, tick and pluck as the prologue |
| IV.4 | 131.0–136.0 | — | "HELD" draws itself in gold hairline strokes on black, holds, fades | end | bell tail; soft E♭ chord; audio fade complete by 136.0 |

## 4.5 Score design

**Key:** E♭ major. Loss in C minor (relative). The death stops on the
dominant. The climax makes the full cadence in E♭.

**Metre and tempo map** (3/4 throughout; a waltz-lullaby):

| Section | t (s) | ♩ | Heartbeat (sound) |
|---|---|---|---|
| Bead | 0–12.5 | free | none until 13.2 |
| Quickening | 12.5–33 | 72 | fetal, 144 bpm (2 per beat) |
| Birth | 33–37 | rit. → fermata | 150 |
| Childhood | 37–50 | 96 | 96 (on the beat) |
| Love | 50–63 | 80 | 80 |
| All at once | 63–71 | free (no pulse) | fades out |
| Loss | 71–78 | 72 | 72 |
| Age | 78–90 | 63 → 58 | 63 → 58 |
| Figure / death | 90–101 | 56 → 38 rit. | 56 → 38, last beat is half |
| Silence, shedding | 101–111 | free | none |
| Kept | 111–121.4 | accelerating merges (2.0, 1.6, 1.2, 1.0, 0.8 s apart) | none |
| Climax, coda | 121.4–136 | free, broad | one fetal beat at 129.0 |

**The theme** (in E♭; ♩ = quarter note). Its signature is the rising major
sixth, B♭4 → G5.

```
Phrase A (the question; ends on the dominant)
| B♭4 ♩   G5 ♩.  F5 ♪ | E♭5 ♩  D5 ♩  E♭5 ♩ | F5 ♩.  G5 ♪  F5 ♩ | B♭4 𝅗𝅥. |
   5        3'     2'     1'     7     1'      2'     3'    2'      5
  E♭                     A♭maj7                Fm7   → B♭           B♭

Phrase B (the answer; ends on the tonic)
| B♭4 ♩  C5 ♩  D5 ♩ | E♭5 ♩.  A♭5 ♪  G5 ♩ | F5 ♩  E♭5 ♩  D5 ♩ | E♭5 𝅗𝅥. |
   5      6     7       1'     4'     3'      2'    1'     7       1'
  E♭ → Gm/D             A♭                    B♭7 (sus4 → 3)      E♭
```

**The withheld note.** At the death, phrase B stops after bar 7 on D5 over
B♭7; the leading tone hangs, then silence. At the climax the AI completes the
phrase: the merges ring bar 5–6 (B♭ C D E♭ A♭ G) as bells, the tutti plays
bar 7 (F E♭ D) and **E♭5 lands at 121.4, the frame where the bead forms.**
The film then ends on B♭ (the theme's first note), open and circular.

**Transformations of the theme:**

| Where | Form |
|---|---|
| Prologue | the first note only (bead bell B♭5) |
| Quickening | A + B complete, celesta/music box, lullaby, over pad |
| Childhood | A in diminution, marimba + pizzicato, bright |
| Love | A on felt piano; cello countermelody (descending thirds and sixths), rich chords |
| Child | celesta quotes bar 1 (the rising sixth) |
| All at once | A in long notes, glass choir (the AI's voice), no pulse |
| Loss | A in C minor on piano; the cello begins B and is cut off |
| Age | fragments of A, low piano, long gaps |
| Death | B augmented, chorale strings + piano; stops on D5 |
| Kept | B as bells (merges) → tutti cadence; resolution on E♭5 |
| Coda | the first note (B♭5) again |

**Harmonic plan:**

| Section | Progression |
|---|---|
| Bead | E♭–B♭ open fifth drone |
| Quickening | the theme's own harmony; birth: A♭ → B♭sus4 → B♭ → E♭ (with added 9th) |
| Childhood | I–IV–V–I with passing chords; brief tonicisation of B♭ |
| Love | E♭add9 – A♭maj7 – Fm9 – B♭sus4 – Cm7 – A♭ – B♭ |
| All at once | A♭ lydian cloud (A♭ C E♭ G D), unresolved |
| Loss | Cm – A♭ – E♭/B♭ – Fm – G (V of Cm) – Cm |
| Age | A♭ – Fm – Cm – B♭sus4 – B♭ |
| Death | E♭/B♭ – A♭/B♭ – B♭7 (never resolved) |
| Shedding | pedal E♭ + B♭ open fifths; glass flakes on the E♭ major pentatonic |
| Kept | E♭ – Cm – A♭ – Fm7 – B♭sus4 – B♭7 → **E♭** |
| Coda | E♭ fading; B♭ bell on top |

**Instruments** (all synthesised in Web Audio at load time):

| Voice | Synthesis | Role |
|---|---|---|
| Felt piano | 3 detuned harmonic "strings" per note (PeriodicWave, 1/n^1.3 with a hammer-position notch), lowpass with its own envelope, two-stage decay, felt thump (filtered noise) | the person |
| Celesta / music box | additive, bar partials (1, 3.9, 9.8), fast upper decay, tine click | childhood, the child |
| Strings ensemble | 5 detuned saws per note with independent vibrato, lowpass, body peaks at 400 Hz and 1.6 kHz, slow attack | harmony, chorale |
| Cello | saw + formant bandpasses (250, 600, 1200 Hz), delayed vibrato, bow noise | the partner |
| Glass choir | sine + 2nd/3rd partials through vowel formants ("oo"→"ah"), slow vibrato, breath; glass-harmonica beating layer | the AI |
| Bells | inharmonic partials (0.5, 1, 1.19, 1.5, 2, 2.5, 3, 4.2) with separate decays, strike noise | the AI's counting (bead, merges) |
| Marimba / pizzicato | additive (1, 4, 10) fast decays; harmonic pluck with a body thump | childhood |
| Sub / drone / air | sine sub, filtered noise beds | depth, death, shedding |
| Heartbeat | "lub": sine 90→45 Hz sweep with 120 ms decay + click; "dub" 180 ms later, softer and higher; fetal version faster, whooshier | the clock of the life |

**Space and master:** one convolution reverb with a procedurally generated
stereo impulse response (4 s, frequency-dependent decay, 20 ms pre-delay), per
voice dry and send levels. Master chain applied to the rendered buffer:
BS.1770-4 integrated-loudness measurement → gain to −14 LUFS → true-peak
lookahead limiter at −1 dBTP (4× oversampled detection) → re-measure → 50 ms
fade-in, 1.5 s fade-out ending at 136.0.

**Dynamics targets** (short-term loudness, 3 s window, after normalisation):
prologue −30; lullaby −24 → −18; birth −14; childhood −16; love −14; all at
once −20; loss −18; age −22; death −24 with heartbeats at −18; silence
≤ −50; shedding −26 → −20; merges −18 → −10; climax about −9; coda −24 →
fade.

**Sound-design cue list:** every row of §4.3 that names a sound is a cue.
Each cue is rendered on an SFX stem as well as in the mix, so the audio check
can confirm that it is present at its timestamp and not masked by the music
(its short-term level at the cue must be within 10 dB of the music stem).

## 4.6 Technical breakdown

Risk is H (could sink the look), M (known way through, needs tuning) or L.

| # | Technique | Risk | How it works | Proof (spike) |
|---|---|---|---|---|
| T1 | **Cellular paint dabs** | H | Instanced quads in 3D. A brush atlas generated at load by shader (12 stamps: impasto dab, splatter, knife smear, drip, gold flake, square flake, slab, smoke puff…) stores coverage, height and a cell-ID hash for a Voronoi crackle. Per-cell colour jitter, dark cracks, impasto lighting from height gradients, gold cells metallic | A splash cluster next to a ref 1 crop at the same scale |
| T2 | **Hairline gold lines in 3D** | M | Polylines expanded to screen-space quads in the vertex shader (width in px), analytic coverage AA, dashes and dots by arc length, draw-on by arc length, MAX blending into a line buffer (no bright joints), depth-tested against the matter, glow through bloom | Circles, verticals and beads at 1080p; zoom shows 1–1.5 px width and no joint beads |
| T3 | **Haar shedding** (invented) | H | See §3 and §4.10. Quadtree over the figure's chart; dabs quantise into cell squares, cells become flakes flying to the mosaic, residual detail becomes dust; the mosaic merges 4→1 level by level into the bead; all closed-form in *t*; run backwards as the opening cleavage | Burst of frames on a test sculpture, forwards and backwards |
| T4 | **SDF-sampled sculptures** (embryo, figure) | H | SDFs built from smooth-unioned primitives; dabs placed on the surface at load by seeded projection; oriented along a surface flow; colour by a thickness/subsurface ramp (embryo) or marble veins + gold leaf (figure) | Stills: embryo legible as an embryo, figure legible as a person in profile |
| T5 | **Silk ribbons** | M | Triangle strips on authored curves with twist; procedural fibres along the length; translucent with bright edge-on sheen; premultiplied, additive-leaning blend | Still of silk around a glow next to a ref 3 crop |
| T6 | **Present front** (future as drawing, paint at the present, drips behind) | M | Every ribbon element carries its life parameter *s*; the shader compares it with the present *p(t)*: ahead only gold guide lines, at the front an eruption, behind settled paint with drips growing by closed-form length | Burst of frames with the front moving |
| T7 | Beads, coins, pearls, moon discs, tags | L | Oriented discs with procedural shading (grooves, terminator, pearl sheen) | in T2's still |
| T8 | Bubbles and cells | L | Billboards with analytic sphere shading: thin bright rim, darkened interior, glints | in T4's still |
| T9 | Gold tree | M | Seeded recursive growth with tropism, tapered widths 2.5→0.8 px, buds at some junctions; growth reveal by arc length | Still next to a ref 3 crop |
| T10 | Drips, slabs, rectangles | L | Stamped quads; drip length closed-form in *t* | in T6 |
| T11 | Smoke | M | Soft fibrous dabs moved by a closed-form velocity field (sums of rotated sines) | in T4 figure still |
| T12 | Background | L | View-direction fbm, vertically dragged, luminance 0.4–1.5 %, per-movement tint, dithered | histogram check: no banding, no flat grey |
| T13 | Post | M | 6-level bloom, filmic tonemap with a lifted toe held at #050407, blue-noise-style dither before 8-bit, luminance-only grain, vignette, per-movement grade | banding check on dark gradients (8-bit histogram gaps) |
| T14 | Point-based depth of field | M | Circle of confusion from depth enlarges dabs and lines and lowers their alpha | in T4 stills |
| T15 | Dynamic resolution | L | Scene renders at *s*·1080p, *s* ∈ [0.6, 1]; frame-time EMA with hysteresis; lines and text stay crisp | `?debug` shows *s* |
| T16 | Stroke font and title | L | Hand-authored stroke paths for the title and debug overlay, drawn by T2 | screenshot |
| T17 | **Score and sound engine** | H | OfflineAudioContext renders the whole film's audio at load (before the click); JS mastering; playback from an AudioBuffer; the audio clock drives *t* | offline render → WAV → LUFS, true peak, silences, per-cue stem check; human listening at checkpoints |
| T18 | Determinism | M | Seeded PRNG only; all motion f(t); no accumulated state; audio from the same cue table | render the same *t* twice → identical hashes; jump vs play → identical |
| T19 | Curtain of kept lives | M | Instanced threads and beads with LOD and depth of field | still |
| T20 | Mosaic and merges | M | Part of T3 | burst |

## 4.7 Architecture and tooling

```
src/              ES modules (bundled into one inline script)
  main.js         boot, start screen, render loop, ?t ?freeze ?debug ?bench
  gl.js           programs, framebuffers, instanced buffers
  cues.js         master cue table, heartbeat schedule, tempo map
  camera.js       keyframed camera
  rng.js          seeded PRNG, hashes, noise
  post.js         bloom, tonemap, grade, dither
  lines.js        hairline renderer (T2)
  dabs.js         brush atlas + dab renderer (T1)
  silk.js         ribbons (T5)
  sculpt.js       SDF sampling (T4)
  shed.js         Haar shedding (T3)
  scenes/*.js     elements of each movement
  audio/*.js      instruments, score, SFX, mastering
tools/
  build.mjs       bundle src/ → held.html (single file, no external requests)
  capture.mjs     Playwright: stills at ?t, bursts, full-res key frames
  audio.mjs       offline render → WAV (mix and stems)
  audio_check.py  BS.1770-4 loudness, true peak, silences, cue audibility
  contact.py      contact sheets and side-by-side with refs
  check.mjs       determinism, no-network, file checks
held.html         the deliverable
```

Debug switches (URL, all hidden in the final cut): `?t=SECONDS` jumps there,
`?freeze` renders one still, `?debug` shows time / movement / fps / GPU ms /
resolution scale, `?bench` runs the whole film silently at full resolution and
prints per-movement frame-time percentiles.

## 4.8 Performance budget

Target: ≤ 12 ms GPU per frame at 1920×1080 on a 2022 laptop GPU (RTX 3050
Laptop / Radeon 680M / Apple M2 class), leaving 4 ms of headroom below
16.7 ms. Dynamic resolution takes over above 14 ms.

| Movement | Dabs (max) | Silk | Line segments | Other | Est. GPU ms |
|---|---|---|---|---|---|
| 0 Bead | 5 k | 0 | 4 k | 16 cells | 3 |
| I Quickening | 90 k | 8 ribbons | 30 k (tree + rings) | 300 bubbles | 11 |
| II Long Line | 140 k | 3 ribbons | 40 k | drips 4 k, slabs 500 | 12 |
| II All at once | 180 k (small on screen) | 3 | 60 k | — | 12 |
| III Shedding | 110 k | 2 | 20 k | flakes 2 k, dust 20 k | 11 |
| IV Kept | 30 k | 0 | 60 k | 6 k beads | 7 |

Fixed costs in every movement: background 0.3 ms, bloom and composite 1.5 ms,
CPU ≤ 2 ms per frame (uniform updates only; all geometry is built once at
load). Overdraw is the main lever: dabs are kept small where they are
numerous, and dense regions are capped at an average of about 30 layers.

The container has no GPU (SwiftShader only), so real frame times must come from
`?bench` on real hardware. That request goes to the human with the rough cut.

## 4.9 Spike plan and acceptance criteria

| Spike | Accept when |
|---|---|
| S1 engine + T2 lines + T12 background + T13 post | 1080p still: lines 1–1.5 px, smooth AA, no joint beads, black at #050407 ± 1, no banding |
| S2 T1 cellular paint | side by side with a ref 1 crop, a reviewer can't tell which is "rendered" from texture alone at thumbnail size |
| S3 T3 Haar shedding | forward and backward bursts read as "compressed into squares" and "cells dividing" |
| S4 T4 embryo + figure | embryo and person legible at thumbnail size |
| S5 T5 silk | silk reads as translucent fabric with glowing edges |
| S6 T17 audio | offline render completes in < 15 s in Chromium; LUFS within ±1 of −14; true peak ≤ −1 dBTP |

## 4.10 Haar shedding: details

1. **Build (load time).** The figure's dabs are projected onto a chart plane
   facing the shot III.3 camera. A 64×64 grid over the figure's square bound
   is level 6. Every non-empty cell stores the area-weighted mean colour, mean
   depth, mean normal and residual energy of its dabs. Levels 5…0 store the
   means of their children. Every cell gets a mosaic slot: its (i, j) scaled
   by 1.5 (so the mosaic is a loose checkerboard), placed at the mosaic origin.
2. **Timing.** Each leaf cell gets its quantisation time from a front that
   sweeps across the chart from the trailing edge (right) toward the face,
   with noise so that the edge is ragged. The face's cells come last.
3. **Per frame, per dab** (vertex shader): before its cell's time the dab
   is drawn as paint. During the next 0.35 s it slides to the cell centre,
   shrinks and fades; its colour difference from the cell mean leaves as dust
   (two sub-dabs with closed-form ballistic paths and fall-off).
4. **Per frame, per cell** (instanced squares): the cell's square appears as
   the dabs collapse, holds for 0.2 s, then flies along a closed-form curve
   (Bezier from its cell to its mosaic slot, with a tumble that ends flat) and
   lands. At merge *k* the four squares of each level-(6−*k*) parent slide
   together and cross-fade to the parent's mean; their difference leaves as
   dust; square size doubles.
5. **Bead.** At level 0 a single square remains; its corners round
   (superellipse exponent 2 → ∞ → circle) and it inflates into a sphere with
   the bead's shading.
6. **Reverse.** The prologue uses the same instanced-cell code with 1 → 4 →
   16 cells and a sphere shape, driven by a level that increases with *t*.
