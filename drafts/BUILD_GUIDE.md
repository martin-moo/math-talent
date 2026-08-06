# BUILD_GUIDE.md — The staged roadmap

> **How to use these docs.** `SPEC.md` is the contract; `PONCELET_NOTES.md` is
> the math; `PROMPT_PLAYBOOK.md` has the ready-to-paste prompt for every stage
> below; `CONTENT_CHECKLIST.md` is your human to-do list. Work one stage at a
> time, in a fresh AI session per stage, and never start a stage before the
> previous one's acceptance check is green.

**First thing, before stage 0:** `git init` in the project folder and commit
after *every* green stage. Git is your undo button and your progress log.

---

## Stage 0 — Scaffold
`npm create astro@latest` (minimal template, TypeScript strict), git init,
first commit, `netlify.toml` placeholder.
**✔ Check:** `npm run dev` renders an empty styled page; repo has a clean
initial commit.

## Stage 1 — Design tokens & base layout
`tokens.css` with the 5 colors + 3 font roles from SPEC §3; base layout
(header, footer, max-widths); header nav: Home / Writings / Contact.
**✔ Check:** SPEC §3 values appear verbatim in `tokens.css`; pages render with
the paper/ink/gold language; no other colors anywhere.

## Stage 2 — Poncelet engine (pure math + tests)
Implement `lib/poncelet/engine.ts` per `drafts/PONCELET_NOTES.md` §4 with
vitest suite §5. No rendering in this stage — math only.
**✔ Check:** all tests in PONCELET_NOTES §5 pass, incl. n=3 ⇒ s=0.5 and
closure for n=3..30 from 100 random starts.

## Stage 3 — Diagram renderer
SVG component: ellipses, polygon, vertices, year labels, drift animation,
drag-to-scrub, click-to-select, keyboard nav, reduced-motion + static fallback.
Hard-coded demo data (n = 8) is fine for this stage.
**✔ Check:** screenshot at several `t` values — vertices glued to the outer
ellipse, edges tangent to the inner; drag feels like turning the figure;
`prefers-reduced-motion` renders statically.

## Stage 4 — Data wiring (Porism + Timeline + detail panel)
Astro content collection from `achievements_data/achievements.json` schema;
n = entry count; chronological vertex order; detail panel with logo/images/
links; Timeline view (SPEC §5.5) with working toggle; featured strip; bio in
the inner ellipse from `profile.json`.
**✔ Check:** add a dummy entry → polygon gains a vertex after rebuild; the
latest achievement sits at the top vertex with older ones counterclockwise;
toggle persists; inner ellipse shows the bio; list is screen-reader reachable.

## Stage 5 — Writings (blog with LaTeX)
MD/MDX collection, `remark-math` + `rehype-katex`, Shiki for code, index +
post pages, RSS. Move the drafts from `writings/` into
`src/content/writings/` — the Poncelet sample post ships as post #1 (Akram
edits or replaces it later from `/admin`).
**✔ Check:** the seed post renders perfect math and highlighted code; index is
the dense Tao-style list; RSS validates.

## Stage 6 — Admin (Decap CMS)
`public/admin/` with Decap config mirroring SPEC §6 collections; Netlify
Identity + Git Gateway enabled in the Netlify UI; media folder `public/media`.
**✔ Check (the money test):** in the deployed preview, add an achievement via
`/admin` → commit appears → site rebuilds → diagram has n+1 vertices. No
manual edits.

## Stage 7 — Contact
Netlify Form (name/email/message + honeypot), mailto + LinkedIn links.
**✔ Check:** a test submission lands in the Netlify Forms inbox.

## Stage 8 — Polish
Responsive pass, a11y audit (keyboard, focus rings, contrast), OG/Twitter meta
+ social image, favicon, sitemap, 404, print CSS.
**✔ Check:** Lighthouse ≥ 95 / ≥ 95 / 100 on home + one post; zero console
errors.

## Stage 9 — Deploy & domain
Connect the repo to Netlify **under your account** (your email — the site is
about Akram, the account is yours), production deploy on the free
`*.netlify.app` address (suggestion: `math-talent.netlify.app`), hand Akram
the `/admin` login. Optional later: transfer the site to Akram's own Netlify
account; he can attach a custom domain himself if he ever wants one.
**✔ Check:** the gift is live, and the person who never wrote code can add
his next medal himself.

---

### Standing rules for every stage
1. One stage per prompt/session — never combine.
2. Paste the stage's acceptance check into the prompt, verbatim.
3. Visual stages: screenshot every iteration and show it to the AI.
4. Green check → commit → next stage. Red → fix or `git reset`, never pile on.
5. If the AI invents a fact (score, date, rank) — reject it. Facts live only
   in `achievements_data/*.json`, each with a source.
