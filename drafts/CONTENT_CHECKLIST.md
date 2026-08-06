# CONTENT_CHECKLIST.md — Your human to-do list

> The AI can build everything except these. Gather them while the build runs.
> Put files in `public/media/…` (create the folders as below).

## 1. Photos & portrait
- [x] Portrait photo → `public/media/profile/portrait.jpg`
- [x] Photos downloaded for `bmo-2024` (4), `imc-2026` (3), `mmc-2025` (2)
- [ ] Remaining achievements: optional — Akram will add them himself via
      `/admin` after the gift (that's the point of the CMS). If you want more
      now: imo-2024, ioi-2024, omb-2024, ofm-2024 →
      `public/media/achievements/<id>/…`

## 2. Competition logos — DONE (2026-08-05)
Downloaded from the official sites into `public/media/logos/`:
- [x] IMO → `imo.svg` · IOI → `ioi.png` · IMC → `imc.jpg`
- [x] Math&Maroc → `mathmaroc.webp` · OMB → `omb.png` · BeCP/beOI → `becp.png`
- [x] BMO, BxMO, OFM → **no official image logo exists** (their sites are
      purely typographic) — by design these render as elegant text chips with
      the shortName. Nothing to collect.

Note: nominative use on a personal portfolio — don't redraw or recolor the
official logos, keep them small.

## 3. Text content
- [ ] Approve/edit the bio in `achievements_data/profile.json` (bioShort shows
      inside the inner ellipse — keep ≤ 240 chars)
- [ ] First blog post draft (Markdown; LaTeX welcome: `$…$`, `$$…$$`).
      Idea for post #1: the story of the IMC 2026 problem that decided the podium.
- [ ] (DEFERRED — not in v1) 2–4 short quotes from teachers/mentors/teammates,
      with name + role — format: `text, author, role`. When you have ≥ 2,
      tell the AI to enable the Quotes collection (SPEC §4).
- [ ] Verify every score/rank in `achievements_data/achievements.json` against
      the source links (I filled verified values; nulls need your research)

## 4. Practicalities
- [ ] Contact email confirmed: `akramzakine2@gmail.com` (from his LinkedIn PDF)
- [ ] Site address: free `*.netlify.app` subdomain under YOUR Netlify account
      (your email) — no purchase, nothing of Akram's is claimed. Suggestion:
      `math-talent.netlify.app`. He can attach a custom domain himself later.
- [ ] GitHub account for the repo (needed by Netlify + Decap CMS)
- [ ] After launch: Akram's Netlify Identity invite for `/admin`

## 5. Optional extras (only if cheap to get)
- [ ] A short video clip from an awards ceremony (hero background is NOT the
      plan — but great inside an achievement's detail panel)
- [ ] Scan of a favorite hand-written solution — a beautiful, personal image
      for the Writings index
