# PROMPT_PLAYBOOK.md — How to drive an AI builder (Kimi K3 / Claude) to a professional result

> The method in one sentence: **the spec is fixed, the prompts are small, and
> every prompt ends with a check the AI must prove.**

---

## Part 1 — The ten rules

1. **Spec first, always.** Every session opens with: "Read `SPEC.md` (and
   `drafts/PONCELET_NOTES.md` for stages 2–3). We are at stage N." Never let
   the AI guess the design — that is what the spec is for.
2. **One stage per prompt.** "Build stages 2 and 3 together" is how projects
   rot. Small prompts → reviewable diffs → easy rollbacks.
3. **Acceptance criteria in the prompt.** Copy the stage's ✔ check from
   `BUILD_GUIDE.md` verbatim and end with: "Do not stop until this passes;
   show me the evidence (test output / screenshot)."
4. **Math gets tests, visuals get screenshots.** For the engine, demand the
   vitest output. For rendering, demand `npm run dev` screenshots pasted back
   into the chat — look at them and say exactly what is wrong ("vertex label
   overlaps at n=14", not "make it nicer").
5. **Fresh session per stage.** Long sessions accumulate confusion. Context is
   cheap to rebuild: SPEC + stage number + acceptance check.
6. **Constrain the palette of moves.** "Do not add dependencies. Do not create
   new pages. Do not invent content." — AIs add enthusiastic cruft; forbid it.
7. **Facts are sacred.** Scores/ranks/dates come only from
   `achievements_data/*.json`. If the AI fabricates one, reject the whole
   output, not just the fact.
8. **Commit after every green stage** (`git add -A && git commit`). A red
   stage gets fixed or `git reset --hard` — never built upon.
9. **Ask "why" before accepting a design choice.** "Why SVG and not canvas?
   Why this tangent solve?" If the answer is mush, push back — this habit is
   the difference between a solid and a wobbly result.
10. **Keep the character.** If a suggestion adds colors, motion, pages, or
    widgets, check SPEC §10 (non-goals) and §3 (motion rules). When in doubt:
    cut.

## Part 2 — Ready-to-paste stage prompts

Fill in `[…]`, paste into a fresh session.

**Stage 0 — Scaffold**
> Read `SPEC.md`. We are at stage 0 of `drafts/BUILD_GUIDE.md`. Scaffold an
> Astro + TypeScript (strict) project in this folder, npm, minimal template;
> add a `netlify.toml` placeholder; make the initial git commit. Do not add
> any dependency beyond Astro itself. Acceptance: `npm run dev` renders; show
> me the file tree and the commit.

**Stage 1 — Design tokens & layout**
> Read `SPEC.md` §3–4. Stage 1: implement `src/styles/tokens.css` with exactly
> the 5 color tokens and 3 font roles from SPEC §3, and a base layout
> (header/footer/nav: Home, Writings, Contact). No other colors, no extra
> components, no animations. Acceptance: tokens match SPEC verbatim; a blank
> page renders in the paper/ink/gold language; paste a screenshot.

**Stage 2 — Poncelet engine**
> Read `SPEC.md` §5.2 and `drafts/PONCELET_NOTES.md` in full. Stage 2:
> implement `src/lib/poncelet/engine.ts` exactly per the API contract
> (PONCELET_NOTES §4), pure TypeScript, no DOM. Write the vitest suite of
> §5. No rendering, no new dependencies except vitest. Acceptance: every test
> in §5 passes — paste the full test output. If closure fails for any n in
> 3..30, debug the math, don't relax the tolerance.

**Stage 3 — Renderer**
> Read `SPEC.md` §5.1–5.7 and `drafts/PONCELET_NOTES.md` §6. Stage 3: build
> the SVG Poncelet component on the existing engine, with drift animation,
> drag-to-scrub, click-select, keyboard nav, and the reduced-motion/static
> fallbacks. Demo with 8 hard-coded vertices. Acceptance: screenshots at three
> different family parameters showing vertices on the outer ellipse and edges
> tangent to the inner one; a screen-recording or frame series of the drag;
> Lighthouse a11y not regressed.

**Stage 4 — Data wiring**
> Read `SPEC.md` §5.1, §5.5, §6.1 and `achievements_data/achievements.json`.
> Stage 4: turn the schema into an Astro content collection, wire the diagram
> (chronological vertices, latest at top), build the detail panel, the
> Timeline view with a persisted Porism/Timeline toggle, the featured strip,
> and the inner-ellipse bio from `profile.json`. Acceptance: the BUILD_GUIDE
> stage-4 check passes; screenshot of both views and of the detail panel for
> IMC 2026.

**Stage 5 — Writings**
> Read `SPEC.md` §6.2 and §7. Stage 5: MD/MDX writings collection with
> remark-math + rehype-katex (KaTeX CSS loaded), Shiki code highlighting,
> index + post pages, RSS. Seed one real post (I'll paste the draft) that uses
> `$$…$$` and a C++ code block. Acceptance: screenshots of the post (math +
> code) and the dense index; RSS validates.

**Stage 6 — Admin**
> Read `SPEC.md` §6 and §8. Stage 6: Decap CMS at `public/admin/` with
> collections mirroring the schemas exactly (Achievements, Writings, Profile,
> Quotes), media into `public/media/`. Then walk me through enabling Netlify
> Identity + Git Gateway. Acceptance: the money test from BUILD_GUIDE stage 6 —
> I add an achievement in `/admin` on the deployed preview and the diagram
> gains a vertex with zero manual edits. Paste the commit it created.

**Stage 7 — Contact**
> Read `SPEC.md` §9. Stage 7: Netlify Form with honeypot + mailto/LinkedIn.
> Acceptance: test submission visible in the Netlify Forms inbox (screenshot).

**Stage 8–9 — Polish & deploy**
> Read `SPEC.md` §11. Stage 8: run the full quality bar — Lighthouse numbers,
> keyboard walkthrough, responsive screenshots (360/768/1280px), fix what's
> red. Stage 9: production deploy on Netlify + domain handoff checklist.

## Part 3 — Recovery moves

- **Output drifts from the spec:** "Stop. Re-read SPEC.md §[X]. Revert the
  last change and redo only what §[X] requires."
- **Visually wrong:** paste screenshot + one precise sentence per defect.
- **Tests fail:** "Debug the math; the tolerance is not negotiable. Explain
  the root cause before changing code."
- **Session feels lost:** don't argue — commit nothing, open a fresh session,
  restate from SPEC. This is rule 5 and it saves hours.
