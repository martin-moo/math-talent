# SPEC.md — Akram Zakine · Mathematical Portfolio

> **This document is the source of truth for the project.**
> Every build prompt must start by pointing the AI at this file.
> If a decision is not written here, it gets decided here first, then built.

---

## 1. Vision

A gift website for **Akram Zakine** — mathematician (ENS PSL), IMC 2026 world #3,
IMO 2024 silver medalist — that presents his competition record, writing, and
contact information in one solid, professional place.

The signature element is a **Poncelet porism diagram**: two nested conics where a
closed polygon inscribed in the outer ellipse and circumscribed about the inner
one carries the achievements at its vertices. The biography lives inside the
inner ellipse. The theorem guarantees the polygon closes for *any* starting
point — so the diagram can slide forever without breaking, and adding an
achievement simply means recomputing for *n + 1*. The mathematics is not a
decoration; it is the design.

**Character:** a mathematical journal, not a carnival. Solid, quiet, precise.
One meaningful animation (the porism drift) instead of many meaningless ones.
No unnecessary pages, widgets, or colors.

## 2. Design principles (from the reference sites)

We take principles, not pixels:

- **medmdg.netlify.app** → clarity of structure. Their timeline communicates a
  career at a glance → we ship a **Timeline view** as a second rendering of the
  same achievements data (toggle: *Porism / Timeline*).
- **terrytao.wordpress.com** → depth without chaos. A blog can hold a whole
  world of mathematics if navigation stays simple → clean post index, tags,
  LaTeX everywhere. (Discussion like Tao's comment threads is a phase-2 option,
  see §10.)
- **karpathy.ai** → restraint. Few elements, each earning its place → every
  section on this site must justify its existence or be cut.

## 3. Design language

### 3.1 Color (restrained — 5 tokens, no more)

| Token | Value | Use |
|---|---|---|
| `--paper` | `#FAF9F5` | background (warm paper) |
| `--ink` | `#1C2333` | text, diagram strokes (deep ink-navy) |
| `--accent` | `#B08D2E` | awards, active vertex, links on hover (muted medal gold) |
| `--slate` | `#5B6472` | secondary text, captions |
| `--hairline` | `#E5E2D9` | borders, diagram hairlines |

Gold appears *only* where it means something: medals, the selected vertex, the
active tangent edge. Never as decoration.

### 3.2 Typography

- **Display / headings:** Libertinus Serif or STIX Two Text — a math-journal
  serif that harmonizes with KaTeX glyphs.
- **Body / UI:** Inter (system-ui fallback).
- **Math:** KaTeX defaults.
- **Code:** JetBrains Mono.
- Scale: 1.25 modular scale; body 17–18px; generous line-height (1.6).

### 3.3 Motion (meaningful only)

1. **The porism drift** — the polygon slides along its family, one full
   revolution in ~90s. Pauses on hover/focus, on `prefers-reduced-motion`,
   and when off-screen (IntersectionObserver).
2. Micro-transitions: 150–250ms ease on hover/focus only.
3. **Forbidden:** parallax, scroll-jacking, entrance animations beyond a single
   subtle fade, animated backgrounds, anything that moves without meaning.

### 3.4 Layout

- Max content width ~72ch for text; the diagram section may go wider.
- Hairline rules instead of cards where possible; whitespace is the structure.
- Mobile-first; diagram has a defined small-screen behavior (§5.7).

## 4. Information architecture

```
/                  Home: Poncelet hero (diagram + bio core) → featured
                   achievements strip → latest writing → contact teaser
/writings          Blog index (title, date, tags, summary — dense & clean, Tao-style)
/writings/[slug]   Post page (MD + KaTeX + code highlighting)
/contact           Email, LinkedIn, and a Netlify form
/admin             Decap CMS (edit achievements, posts, profile, quotes)
```

Deferred until content exists:

- **Quotes** — 2–4 short testimonials from mentors/teachers/teammates
  ("true sayings from loved ones"). **Currently no quotes collected → not in
  v1.** The CMS collection ships disabled; enable it once ≥ 2 quotes exist.

Everything lives on **4 pages**. No more.

## 5. The Poncelet diagram (the crown jewel)

Full mathematical spec: **`drafts/PONCELET_NOTES.md`**. Summary of the contract:

### 5.1 Data → geometry

- `n` = number of achievement entries in the content collection.
- **Reading order: latest first.** The most recent achievement sits at the
  top vertex (12 o'clock); walking the polygon in the **positive —
  counterclockwise, trigonometric — direction** travels backward in time to
  the oldest. (Data files stay chronological ascending, new entries appended
  at the end; the renderer reads them from the end.)
- The latest vertex is distinguished: gold marker + a small "Latest" tag, and
  a slim directional arc with an arrowhead on the rim near the top indicates
  the reading direction — the only ornament allowed on the diagram.
- Vertex *k* carries achievement *k*; its label shows `year + shortName`
  (e.g. `2026 · IMC`).

### 5.2 Geometry engine (pure TypeScript, zero DOM, fully unit-tested)

- **Mode A (baseline, exact):** concentric circles, `r = R·cos(π/n)`.
  Animation = rigid rotation of the family parameter.
- **Mode B (target):** fixed outer ellipse; inner similar concentric ellipse
  whose scale `s` is solved so the Poncelet map has rotation number exactly
  `1/n` (bisection on `s`; the map is monotonic in `s`). Animation = sweeping
  the starting point of the true computed family.
- **Hard rule:** never fake the ellipse animation by affine-stretching a
  rotating circle picture — rotation does not commute with affine maps, and
  the vertices would leave the ellipse. The family must be computed honestly.
- API: `solveInnerScale(n, a, b)`, `ponceletStep(P)`, `vertices(n, t)`,
  `rotationNumber(s, n)`.

### 5.3 Rendering

- SVG (crisp at any DPI, accessible, styleable). No canvas, no WebGL — the
  figure is a few dozen elements.
- Outer ellipse, inner ellipse, polygon edges (hairline ink), vertices (dots),
  year labels around the rim, bio content in an HTML overlay elliptically
  clipped to the inner ellipse.
- Selected vertex + its two incident edges turn `--accent` gold.

### 5.4 Interaction

- **Click / tap a vertex** → detail panel (card) beside the diagram: logo,
  award, score/rank, description, images, links. One achievement featured by
  default (IMC 2026) on load.
- **Drag the polygon** → scrubs the family parameter (visitor literally turns
  the porism). Releases back into the slow drift.
- Keyboard: `←`/`→` cycles vertices, `Enter` opens detail.
- Hover a vertex → label brightens, tooltip with award line.

### 5.5 Timeline view (EXPERIMENTAL — second rendering, same data)

- Vertical timeline (medmdg-inspired): year spine, logo chips, award lines,
  scores, **newest first**. Toggle *Porism / Timeline* persists in
  localStorage; **Porism is the default**.
- **Status: experiment.** Build it, then judge it against the Porism view
  with fresh eyes. If it doesn't clearly earn its place, cut it — the
  restraint principle (§2) outranks the reference sites. Decision due before
  launch.
- On screens < 640px the diagram becomes a static tappable render and the
  chronological list leads — honesty about what phones can show.

### 5.6 Fallbacks & accessibility

- No-JS / print: static SVG snapshot + the plain achievements list (the list
  is in the HTML regardless, visually hidden, for screen readers and SEO).
- Every vertex is a `<button>`-equivalent with an `aria-label`
  ("Silver Medal, IMO 2024").
- `prefers-reduced-motion` → static render, no drift, no transitions.

### 5.7 Performance budget

- Diagram math < 1 ms/frame at n ≤ 40 (it's ~n tangent solves).
- First-load JS for the island < 25 KB gzipped excluding fonts.
- Site Lighthouse: ≥ 95 performance, ≥ 95 accessibility, 100 best practices.

## 6. Content & data schemas

Source of truth during development: `achievements_data/*.json`.
At build stage 4 these become Astro content collections.

### 6.1 Achievement

```jsonc
{
  "id": "imo-2024",                 // slug, stable
  "title": "Silver Medal — IMO 2024",
  "competition": "International Mathematical Olympiad",
  "shortName": "IMO",               // vertex label: "2024 · IMO"
  "date": "2024-07",                // ISO month
  "location": "Bath, United Kingdom",
  "team": "Belgium",                // or null
  "award": "Silver Medal",
  "score": "22/42",                 // or null — never invent scores
  "rank": "147th worldwide",        // or null
  "description": "1–3 sentences.",
  "logo": "media/logos/imo.svg",    // official logo file; null → UI falls
                                    // back to a typographic shortName chip
                                    // (BMO, BxMO, OFM have no image logo)
  "images": ["media/achievements/imo-2024/stage.jpg"],
  "links": [{ "label": "Official results", "url": "https://…" }],
  "featured": true                  // 3–5 max; drives the home strip
}
```

### 6.2 Post

```jsonc
// frontmatter of src/content/writings/*.md
{
  "title": "…", "date": "2026-09-01",
  "tags": ["problem-solving"],       // controlled vocabulary
  "summary": "One sentence.",
  "draft": false
}
// Body: Markdown + $…$ / $$…$$ LaTeX + fenced code blocks.
```

### 6.3 Profile (single record)

`name, tagline, bioShort (≤240 chars, inside the inner ellipse), bioLong,
photo, email, linkedin, education[], interests[]`.

### 6.4 Quote (optional)

`text, author, role` — 2–4 records max.

**Editorial rule:** scores, ranks and medals are facts — every entry needs a
source link. If a value is unknown it is `null`, never guessed.

## 7. Blog (Writings)

- MD/MDX with **KaTeX** (`remark-math` + `rehype-katex`) — non-negotiable,
  this is the whole point ("mathematicians love math symbols being correct").
- **Drafts live in `writings/`** (project root) before the scaffold exists;
  at stage 5 they move into `src/content/writings/` and become the blog.
- Code blocks with Shiki highlighting (for CS / CV / AI posts).
- Index: dense list — date, title, tags, one-line summary. No images required.
- Tags are a controlled list: `mathematics, problem-solving, competitions,
  computer-science, computer-vision, ai, notes`.
- RSS feed (`/rss.xml`).

## 8. Admin (Decap CMS)

- Git-based, at `/admin`, Netlify Identity + Git Gateway.
- Collections mirror §6 exactly: Achievements, Writings, Profile (Quotes
  collection present but hidden until content exists — see §4).
- Media uploads → `public/media/…`.
- **The promise to honor:** Akram adds an achievement in `/admin` → commits →
  Netlify rebuilds → the diagram has *n+1* vertices. No manual geometry work.
  This round-trip is acceptance-tested in stage 6.

## 9. Contact

- Netlify Forms (name, email, message; honeypot spam trap) + plain `mailto:`
  and LinkedIn links. No backend, no third-party form service.

## 10. Non-goals (explicitly NOT built)

- No database, no server code, no visitor accounts.
- No comments in v1 (phase-2 option: giscus via GitHub Discussions — the
  Tao-style discussion layer).
- No dark mode, no i18n in v1 (phase-2 candidates: dark theme, French).
- No analytics beyond Netlify's server-side stats (privacy-friendly).
- No extra pages, no newsletter, no social feed embeds.

## 11. Quality bar (global acceptance criteria)

1. All §5.2 engine tests pass (closure for n = 3…30 from random starts).
2. Diagram honors reduced-motion, keyboard, and screen-reader requirements.
3. A post containing `$$…$$` and a code block renders perfectly.
4. Admin round-trip: add achievement via `/admin` → deployed site shows n+1.
5. Contact form delivers a test message.
6. Lighthouse budgets of §5.7 met on home and a post page.
7. No console errors; no unused dependencies.

## 12. Tech stack & repo layout

**Astro + TypeScript** (content-first, ships ~0 JS by default) · KaTeX ·
Decap CMS · Netlify (Forms + Identity). Package manager: `npm`. Node ≥ 20.

```
├── SPEC.md                      ← this file
├── achievements_data/           ← verified seed data (pre-scaffold)
├── drafts/                      ← build guides & prompt playbook
├── public/media/                ← logos, photos (CMS uploads land here)
├── public/admin/                ← Decap config.yml + index.html
├── src/
│   ├── content/achievements/*.json
│   ├── content/writings/*.md
│   ├── lib/poncelet/            ← geometry engine (pure, tested)
│   ├── components/Poncelet*.astro / Timeline.astro / …
│   ├── layouts/ · pages/
│   └── styles/tokens.css
├── tests/poncelet.test.ts       ← vitest
└── netlify.toml
```

## 13. Build stages (details in `drafts/BUILD_GUIDE.md`)

0. Repo + scaffold → 1. Design tokens & base layout → 2. Poncelet engine +
tests → 3. Diagram renderer & interaction → 4. Content wiring (Porism +
Timeline + detail panel) → 5. Writings (KaTeX) → 6. Admin round-trip →
7. Contact form → 8. Polish (a11y/perf/SEO) → 9. Deploy & domain.

**Domain & ownership:** deploys run on the gift-giver's Netlify account (his
email, his login) on a free `*.netlify.app` address — no domain purchase, no
use of Akram's name or email. The site can be transferred to Akram's own
Netlify account at gift time, and he can attach a custom domain later if he
ever wants one.

**Rule:** one stage per prompt, acceptance criteria met before moving on,
commit after every green stage.

## 14. Verified facts baseline (do not regress)

See `achievements_data/achievements.json` — compiled from the user's data,
Akram's LinkedIn-profile PDF, and official sources (IMO, IOI stats,
maths-olympiques.fr). Corrections belong in that JSON, with a source link.
