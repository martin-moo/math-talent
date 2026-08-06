/**
 * stage4-shots.mjs — stage-4 acceptance captures + checks (BUILD_GUIDE §stage 4).
 *
 * Drives the preview server with Playwright's chromium and checks:
 *   - vertex count == collection size (n = 15)
 *   - latest achievement at the top vertex, "Latest" tag + gold (SPEC §5.1)
 *   - counterclockwise order travels backward in time (exact title sequence)
 *   - rendered geometry still honors the Poncelet contract at n = 15
 *   - detail panel: IMC 2026 by default; click IMO 2024 → panel + facts swap
 *   - featured strip: 3 items; clicking one selects its vertex + panel
 *   - Porism/Timeline toggle: switches views, persists across reload
 *   - bio overlay inside the inner ellipse; SR list reachable (15, latest first)
 *   - zero console errors / page errors (SPEC §11.7)
 *
 * Captures: stage4-porism.png, stage4-porism-full.png, stage4-timeline.png,
 * stage4-detail-imc-2026.png, stage4-detail-imo-2024.png, stage4-mobile.png.
 *
 * Usage: node scripts/stage4-shots.mjs [baseURL]   (default http://localhost:4321)
 * Exits non-zero if any check fails.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const OUT = new URL('../drafts/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Expected vertex order (vertex k = entries[n−1−k], SPEC §5.1) — derived
// from the content files with the same rule as src/lib/achievements.ts.
const contentDir = new URL('../src/content/achievements/', import.meta.url).pathname;
const entries = readdirSync(contentDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(contentDir + f, 'utf8')))
  .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? -1 : 1));
const EXPECTED_AT_VERTEX = [...entries].reverse().map((e) => e.title);
const N = entries.length;
const LATEST = entries[entries.length - 1];

const T0 = Math.PI / 2;
// Playwright's own headless shell: the system Chromium dies by SIGTRAP in
// this environment (seccomp trap in helper processes).
const browser = await chromium.launch({ args: ['--no-sandbox', '--hide-scrollbars'] });

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗ FAIL'} ${what}`);
  if (!ok) failures++;
};

const consoleErrors = [];

async function newPage(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ...opts });
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  return page;
}

async function shot(page, name, opts) {
  await page.screenshot({ path: `${OUT}${name}.png`, ...opts });
  console.log(`  → ${name}.png`);
}

/** Rendered Poncelet contract at n = 15 (same math as stage 3). */
async function verifyGeometry(page, label) {
  const result = await page.evaluate(() => {
    const fig = document.querySelector('figure.poncelet');
    const { cx, cy, a, b, s } = fig.dataset;
    const [CX, CY, A, B, S] = [cx, cy, a, b, s].map(Number);
    const gs = [...fig.querySelectorAll('g.vertex')];
    let worstOn = 0;
    const pts = gs.map((g) => {
      const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform'));
      const x = Number(m[1]) - CX;
      const y = -(Number(m[2]) - CY);
      worstOn = Math.max(worstOn, Math.abs((x / A) ** 2 + (y / B) ** 2 - 1));
      return { x, y };
    });
    let worstTan = 0;
    const n = pts.length;
    for (let k = 0; k < n; k++) {
      const P = pts[k];
      const Q = pts[(k + 1) % n];
      let nx = -(Q.y - P.y);
      let ny = Q.x - P.x;
      const norm = Math.hypot(nx, ny);
      nx /= norm;
      ny /= norm;
      let d = nx * P.x + ny * P.y;
      if (d < 0) d = -d;
      const h = S * Math.hypot(A * nx, B * ny);
      worstTan = Math.max(worstTan, Math.abs(d - h));
    }
    return { worstOn, worstTan };
  });
  check(result.worstOn < 5e-4, `${label}: vertices on outer ellipse (worst ${result.worstOn.toExponential(2)})`);
  check(result.worstTan < 0.05, `${label}: edges tangent to inner ellipse (worst ${result.worstTan.toFixed(4)}px)`);
}

// === main page: data wiring, order, panel, featured, toggle ==============
{
  const page = await newPage();
  await page.goto(`${BASE}/?t=${T0}`, { waitUntil: 'networkidle' });

  // -- n = collection size --------------------------------------------------
  const vertexCount = await page.locator('g.vertex').count();
  check(vertexCount === N, `vertex count = collection size (${vertexCount} = ${N})`);

  // -- latest at the top vertex (12 o'clock) --------------------------------
  const v0 = await page.evaluate(() => {
    const g = document.querySelector('g.vertex[data-index="0"]');
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform'));
    const fig = document.querySelector('figure.poncelet');
    return {
      x: Number(m[1]),
      y: Number(m[2]),
      cx: Number(fig.dataset.cx),
      cy: Number(fig.dataset.cy),
      b: Number(fig.dataset.b),
      label: g.querySelector('tspan.vlabel-year')?.textContent?.trim(),
      tag: g.querySelector('tspan.latest-tag')?.textContent?.trim(),
      gold: getComputedStyle(g.querySelector('circle.dot')).fill,
    };
  });
  check(
    Math.abs(v0.x - v0.cx) < 0.5 && Math.abs(v0.y - (v0.cy - v0.b)) < 0.5,
    `latest vertex at 12 o'clock (x=${v0.x}≈${v0.cx}, y=${v0.y}≈${v0.cy - v0.b})`,
  );
  check(
    v0.label === '2026 · IMC' && v0.tag === 'Latest',
    `top vertex labeled "${v0.label}" with "${v0.tag}" tag`,
  );

  // -- CCW = backward in time: exact title sequence + vertex 1 left of top --
  const seq = await page.evaluate(() =>
    [...document.querySelectorAll('g.vertex')].map((g) => {
      const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform'));
      return { title: g.dataset.title, x: Number(m[1]) };
    }),
  );
  check(
    seq.every((v, k) => v.title === EXPECTED_AT_VERTEX[k]),
    `counterclockwise order = backward in time (${seq
      .slice(0, 4)
      .map((v) => v.title.split(' — ')[1])
      .join(' → ')} → …)`,
  );
  check(seq[1].x < seq[0].x, `vertex 1 sits counterclockwise (left) of vertex 0 (${seq[1].x} < ${seq[0].x})`);

  await verifyGeometry(page, 'n=15');

  // -- bio overlay in the inner ellipse --------------------------------------
  const bio = await page.evaluate(() => {
    const el = document.querySelector('.bio-overlay');
    const cs = getComputedStyle(el);
    return {
      name: el.querySelector('.bio-name')?.textContent?.trim(),
      text: el.querySelector('.bio-text')?.textContent ?? '',
      clipped: cs.clipPath.startsWith('ellipse('),
    };
  });
  check(
    bio.name === 'Akram Zakine' && bio.text.includes('École Normale Supérieure') && bio.clipped,
    `bio inside inner ellipse ("${bio.name}", clipped, ${bio.text.length} chars)`,
  );

  // -- screen-reader list (SPEC §5.6) ----------------------------------------
  const srList = await page.evaluate(() => {
    const items = [...document.querySelectorAll('section.visually-hidden ul li')].map((li) =>
      li.textContent.trim(),
    );
    const section = document.querySelector('section.visually-hidden');
    return { items, hiddenFromA11y: section?.getAttribute('aria-hidden') };
  });
  check(
    srList.items.length === N && srList.items[0] === LATEST.title && srList.hiddenFromA11y !== 'true',
    `plain list present for screen readers (${srList.items.length} items, latest first)`,
  );

  // -- detail panel: default = IMC 2026 (SPEC §5.4) --------------------------
  const defaultPanel = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('[data-panel]')].filter((p) => !p.hidden);
    return {
      count: visible.length,
      id: visible[0]?.dataset.panel,
      text: visible[0]?.textContent ?? '',
    };
  });
  check(
    defaultPanel.count === 1 &&
      defaultPanel.id === LATEST.id &&
      defaultPanel.text.includes('3rd worldwide') &&
      defaultPanel.text.includes('Grand First Prize'),
    `detail panel defaults to ${LATEST.id} with its facts`,
  );
  const panelEl = page.locator('aside.detail');
  await panelEl.scrollIntoViewIfNeeded();
  await shot(panelEl, 'stage4-detail-imc-2026');

  // -- click a vertex → panel swaps (SPEC §5.4) ------------------------------
  await page.locator('g.vertex[data-index="4"] circle.dot').click(); // IMO 2024
  await page.waitForTimeout(100);
  const swapped = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('[data-panel]')].filter((p) => !p.hidden);
    return { id: visible[0]?.dataset.panel, text: visible[0]?.textContent ?? '' };
  });
  check(
    swapped.id === 'imo-2024' && swapped.text.includes('22/42') && swapped.text.includes('Bath'),
    `click vertex 4 → panel shows IMO 2024 (score 22/42, Bath)`,
  );
  await shot(panelEl, 'stage4-detail-imo-2024');

  // -- featured strip (SPEC §4, §6.1) ----------------------------------------
  const featuredIds = await page.locator('.featured-item').evaluateAll((els) =>
    els.map((el) => el.dataset.select),
  );
  check(
    featuredIds.length === 3 && featuredIds[0] === LATEST.id,
    `featured strip: ${featuredIds.length} items, newest first (${featuredIds.join(', ')})`,
  );
  await page.locator('.featured-item[data-select="imc-2026"]').scrollIntoViewIfNeeded();
  await page.locator('.featured-item[data-select="imo-2024"]').click();
  await page.waitForTimeout(900); // smooth scroll + selection
  const afterFeatured = await page.evaluate(() => ({
    pressed: document.querySelector('g.vertex[data-index="4"]')?.getAttribute('aria-pressed'),
    panel: [...document.querySelectorAll('[data-panel]')].filter((p) => !p.hidden)[0]?.dataset.panel,
  }));
  check(
    afterFeatured.pressed === 'true' && afterFeatured.panel === 'imo-2024',
    `featured click selects vertex + panel (${JSON.stringify(afterFeatured)})`,
  );

  // -- full porism view captures ---------------------------------------------
  await page.goto(`${BASE}/?t=${T0}`, { waitUntil: 'networkidle' });
  await shot(page, 'stage4-porism');
  await shot(page, 'stage4-porism-full', { fullPage: true });

  // -- toggle: Timeline view, persistence across reload (SPEC §5.5) ----------
  await page.locator('[data-view-btn="timeline"]').click();
  const tlState = await page.evaluate(() => ({
    timelineVisible: !!document.querySelector('.achview-timeline')?.offsetParent,
    porismHidden: !document.querySelector('.achview-porism')?.offsetParent,
    stored: localStorage.getItem('az:view'),
    firstYear: document.querySelector('.t-year')?.textContent?.trim(),
    firstEntry: document.querySelector('.t-entry')?.getAttribute('data-id'),
    entryCount: document.querySelectorAll('.t-entry').length,
  }));
  check(
    tlState.timelineVisible && tlState.porismHidden && tlState.stored === 'timeline',
    `toggle switches to Timeline and persists (${JSON.stringify({ stored: tlState.stored })})`,
  );
  check(
    tlState.firstYear === '2026' && tlState.firstEntry === LATEST.id && tlState.entryCount === N,
    `timeline newest first (${tlState.firstEntry} under ${tlState.firstYear}; ${tlState.entryCount} entries)`,
  );
  await shot(page, 'stage4-timeline', { fullPage: true });

  await page.reload({ waitUntil: 'networkidle' });
  const persisted = await page.evaluate(() => ({
    timelineVisible: !!document.querySelector('.achview-timeline')?.offsetParent,
    pressed: document.querySelector('[data-view-btn="timeline"]')?.getAttribute('aria-pressed'),
  }));
  check(persisted.timelineVisible && persisted.pressed === 'true', 'view choice persists across reload');

  // back to Porism for the mobile pass
  await page.locator('[data-view-btn="porism"]').click();
  await page.close();
}

// === mobile: timeline leads, diagram static (SPEC §5.5) ====================
{
  const page = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const mobile = await page.evaluate(() => ({
    timelineVisible: !!document.querySelector('.achview-timeline')?.offsetParent,
    overlayFlowed: getComputedStyle(document.querySelector('.bio-overlay')).position === 'static',
  }));
  check(mobile.timelineVisible, 'small screen: the chronological list leads');
  check(mobile.overlayFlowed, 'small screen: bio un-clips into plain text');
  await shot(page, 'stage4-mobile', { fullPage: true });

  // diagram static but tappable: two frames apart must be identical…
  await page.locator('[data-view-btn="porism"]').click();
  await page.waitForTimeout(150);
  const bufA = await page.screenshot();
  await page.waitForTimeout(700);
  const bufB = await page.screenshot();
  check(bufA.equals(bufB), 'small screen: porism drift is paused (static render)');
  // …yet still tappable
  await page.locator('g.vertex[data-index="4"] circle.dot').click({ force: true });
  await page.waitForTimeout(100);
  const tapped = await page.evaluate(
    () => [...document.querySelectorAll('[data-panel]')].filter((p) => !p.hidden)[0]?.dataset.panel,
  );
  check(tapped === 'imo-2024', `small screen: diagram still tappable (panel → ${tapped})`);
  await page.close();
}

await browser.close();

check(consoleErrors.length === 0, `zero console errors (${consoleErrors.length})`);
if (consoleErrors.length) consoleErrors.forEach((e) => console.error('  console:', e));

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nall checks passed →', OUT);
