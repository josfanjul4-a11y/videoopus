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
