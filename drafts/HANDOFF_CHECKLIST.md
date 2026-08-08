# HANDOFF_CHECKLIST.md — Stage 9 · deploy & domain handoff

> The gift is live. This is the checklist for handing it over and for keeping
> it healthy after the gift. Read alongside `CONTENT_CHECKLIST.md` (§4) and
> SPEC §13 (ownership rules).

## 1. What is live, and whose it is
- [x] **Site:** https://math-talent.netlify.app — production build verified
      (Lighthouse on the live site ≥ 95 / 100 / 100; sitemap, robots, 404,
      social card all serving; zero console errors).
- [x] **Repo:** GitHub `martin-moo/math-talent`, branch `main`.
- [x] **Deploys:** Netlify auto-builds from `main` (`npm run build`, Node 20,
      `netlify.toml`). Every commit to `main` = a new production deploy.
- [x] **Account:** the gift-giver's Netlify account, his email, his login
      (SPEC §13 — the site is about Akram, the account is yours).

## 2. Before the gift — decide the placeholder
- [ ] **`fields-medal-2035` is live** as the latest + featured vertex
      ("Fields Medal 2035", date 2035-07, no score/rank/source). It was created
      during the stage-6 `/admin` round-trip test. Decide one:
      - remove it in `/admin` (Achievements → delete), or
      - keep it if it is a deliberate placeholder Akram will replace.
      Either way this must be a conscious choice before handing over — a
      future-dated "Fields Medal" on the front page is the one thing on the
      site that could embarrass the gift.
- [ ] Double-check every other achievement's facts carry a source link (§6
      editorial rule: scores/ranks are facts, unknown → `null`, never guessed).

## 3. The /admin handoff (how Akram gets the keys)
1. Netlify site → **Identity** → invite Akram's email (he does not need a
   GitHub account).
2. Akram clicks the invite/recovery link in his email → it lands on the
   homepage with a token in the URL → the site loads the Netlify Identity
   widget (only then — SPEC §5.7) → he sets a password → he is carried to
   `/admin`.
3. Hand him this one-sentence operating manual:
   > Add an achievement in `/admin` → it becomes a git commit → Netlify
   > rebuilds → the diagram grows one vertex. No geometry, no code.

## 4. Verify the money round-trip on production (once, together)
- [ ] In `/admin`, add a test achievement → publish → watch the deploy →
      reload home → the polygon has *n+1* vertices and the list shows it.
- [ ] Remove the test achievement afterwards.
- [ ] Send a test message through `/contact` and confirm it lands in the
      Netlify Forms inbox (SPEC §11.5).

## 5. Domains (SPEC §13) — what was deliberately NOT done
- [ ] No domain was purchased; nothing of Akram's name/email is claimed.
- [ ] **Later, optional:** transfer the site to Akram's own Netlify account;
      he can attach a custom domain himself if he ever wants one. Nothing in
      this repo (no hard-coded URL except `site` in `astro.config.mjs` and the
      CMS `site_url` in `public/admin/config.yml`) prevents the transfer —
      update those two if the URL ever changes.

## 6. Keeping it healthy (the standing rules)
- [ ] One stage per prompt; commit after every green change.
- [ ] Facts only in `src/content/achievements/*.json`, each with a source.
- [ ] The site is 4 pages — no new pages without a SPEC change.
- [ ] Lighthouse is the contract: ≥ 95 / ≥ 95 / 100 on home + a post after
      any change that touches the diagram, fonts, or head scripts
      (`scripts/stage8-qa.mjs` runs the full walkthrough).
- [ ] GitHub `main` is the backup and the undo button — `/admin` edits are
      commits, so nothing is ever lost.
