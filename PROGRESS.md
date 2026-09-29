# PROGRESS

Session log for the production of **HELD**. Newest session at the bottom.
Every session records what was done, what was decided, what is broken, and
what comes next. Review findings are logged with severity (high / medium /
low) in the review section once Phase 4 starts.

## Status

| Phase | State |
|---|---|
| 1 Concept | Done. **HELD** chosen. Waiting on human checkpoint #1. |
| 2 Pre-production | Not started |
| 3 Production | Not started |
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
