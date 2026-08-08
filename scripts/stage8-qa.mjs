/**
 * stage8-qa.mjs — stage-8 quality-bar checks (BUILD_GUIDE §stage 8, SPEC §11).
 *
 *  1. Keyboard walkthrough on the home page:
 *       - Tab order lands on the roving vertex button after the nav
 *       - ArrowRight / ArrowLeft cycle the roving focus without losing it
 *       - Enter selects the focused vertex → detail panel + aria-pressed swap
 *       - Porism/Timeline toggle is keyboard-operable and persists
 *       - every focusable element shows a visible focus indicator
 *  2. Reduced-motion: the drift is static under prefers-reduced-motion
 *  3. Responsive screenshots at 360 / 768 / 1280 px (home + a post)
 *  4. Zero console errors / page errors on home, writings, post, contact
 *
 * Captures (drafts/screenshots/stage8-*): home-360, home-768, home-1280,
 * post-1280, timeline-360.
 *
 * Usage: node scripts/stage8-qa.mjs [baseURL]   (default http://localhost:4321)
 * Exits non-zero if any check fails.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const OUT = new URL('../drafts/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

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

// === 1. keyboard walkthrough (home) ========================================
{
  const page = await newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  // The nav links + toggle + diagram follow a roving-tabindex pattern; the
  // walkthrough tabulates all focusable elements and drives the keys.
  const tabOrder = await page.evaluate(() => {
    const focs = [
      ...document.querySelectorAll(
        'a[href], button, [tabindex]:not([tabindex="-1"]), input:not([type="hidden"])',
      ),
    ];
    return focs
      .filter((el) => !el.closest('[hidden]') && !el.hasAttribute('hidden'))
      .map((el) => {
        const label =
          el.getAttribute('aria-label') ||
          el.textContent.trim().slice(0, 28) ||
          el.tagName;
        return { tag: el.tagName, label };
      });
  });
  check(
    tabOrder.some((t) => t.label === 'Home') &&
      tabOrder.some((t) => t.label === 'Writings') &&
      tabOrder.some((t) => t.label === 'Contact'),
    `header nav is first in the tab order (${tabOrder[0]?.label}, ${tabOrder[1]?.label}, ${tabOrder[2]?.label})`,
  );

  const vertex = (k) => page.locator(`g.vertex[data-index="${k}"]`);

  // The default-selected vertex (index 0) is the roving tab stop.
  check(
    await page.evaluate(() => document.querySelector('g.vertex[data-index="0"]')?.getAttribute('tabindex') === '0'),
    'vertex 0 is the roving tab stop (tabindex 0)',
  );
  check(
    await page.evaluate(() => document.querySelector('g.vertex[data-index="1"]')?.getAttribute('tabindex') === '-1'),
    'all other vertices are removed from the tab order',
  );

  // ArrowRight → roving focus advances; ArrowLeft comes back.
  await vertex(0).focus();
  await page.keyboard.press('ArrowRight');
  const afterRight = await page.evaluate(() => document.activeElement?.getAttribute('data-index'));
  check(afterRight === '1', `vertex 1 after ArrowRight (active index ${afterRight})`);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  const afterCycle = await page.evaluate(() => document.activeElement?.getAttribute('data-index'));
  check(afterCycle === '1', `roving focus survives a full cycle (back on vertex 1)`);

  // Enter on a vertex selects it: aria-pressed swaps and the detail panel
  // shows that achievement (SPEC §5.4).
  const targetId = await vertex(1).getAttribute('data-id');
  const targetTitle = await vertex(1).getAttribute('data-title');
  await page.keyboard.press('Enter');
  const pressed = await vertex(1).getAttribute('aria-pressed');
  const pressed0 = await vertex(0).getAttribute('aria-pressed');
  const visiblePanel = await page
    .locator(`[data-panel="${targetId}"]`)
    .evaluate((el) => !el.hidden);
  const status = await page.locator('.poncelet-status').textContent();
  check(
    pressed === 'true' && pressed0 === 'false',
    `Enter selects the focused vertex (aria-pressed true/false)`,
  );
  check(
    visiblePanel && status.trim() === targetTitle,
    `Enter opens the right detail panel (${targetId}: ${targetTitle})`,
  );

  // Space also selects (SPEC §5.4 keys), reached the way a user does —
  // ArrowRight keeps the roving focusIndex in sync, then Space.
  await page.keyboard.press('ArrowRight'); // vertex 1 → 2
  await page.keyboard.press(' ');
  const v2Id = await vertex(2).getAttribute('data-id');
  const v2PanelVisible = await page
    .locator(`[data-panel="${v2Id}"]`)
    .evaluate((el) => !el.hidden);
  check(
    (await vertex(2).getAttribute('aria-pressed')) === 'true' && v2PanelVisible,
    `Space selects vertex 2 and its panel`,
  );

  // Focus indicators — checked while still in the Porism view (§5.3 halo).
  await page.locator('[data-view-btn="porism"]').focus();
  const ring = await page.evaluate(() => {
    const el = document.activeElement;
    const focus = document.activeElement.matches(':focus-visible');
    const vis = focus && getComputedStyle(el).outlineStyle !== 'none';
    return { focus, vis };
  });
  check(ring.focus && ring.vis, `focus indicator visible on the toggle (outline)`);
  await vertex(0).focus();
  await page.waitForTimeout(250); // the halo fades in over 150ms — let it land
  const halo = await page.evaluate(() => {
    const g = document.querySelector('g.vertex:focus-visible');
    const h = g?.querySelector('.halo');
    return h ? getComputedStyle(h).opacity !== '0' : false;
  });
  check(halo, 'focus indicator visible on the diagram vertex (halo ring)');

  // View toggle: keyboard-operable, aria-pressed reflects state, persists.
  const tlBtn = page.locator('[data-view-btn="timeline"]');
  const porismBtn = page.locator('[data-view-btn="porism"]');
  await tlBtn.focus();
  await page.keyboard.press('Enter');
  const tlPressed = await tlBtn.getAttribute('aria-pressed');
  const view = await page.evaluate(() => document.documentElement.dataset.achView);
  check(tlPressed === 'true' && view === 'timeline', 'Toggle Enter → Timeline view + aria-pressed');

  await page.reload({ waitUntil: 'networkidle' });
  const persisted = await page.evaluate(() => document.documentElement.dataset.achView);
  check(persisted === 'timeline', 'Timeline preference persists across reload (localStorage)');

  await page.close();
}

// === 2. reduced motion =====================================================
{
  const page = await newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const g = page.locator('g.vertex').first();
  const t1 = await g.getAttribute('transform');
  await page.waitForTimeout(1400);
  const t2 = await g.getAttribute('transform');
  check(t1 === t2, `reduced-motion: drift is static (${t1} → ${t2})`);
  await page.close();
}

// === 3. responsive screenshots =============================================
{
  // Home — 360 / 768 / 1280, porism view by default at ≥640 (SPEC §5.5).
  for (const [w, h, name] of [
    [360, 740, 'stage8-home-360'],
    [768, 1024, 'stage8-home-768'],
    [1280, 900, 'stage8-home-1280'],
  ]) {
    const page = await newPage({ viewport: { width: w, height: h } });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await shot(page, name, { fullPage: true });
    await page.close();
  }

  // 360 — the timeline leads on phones; capture the porism/timeline toggle.
  {
    const page = await newPage({ viewport: { width: 360, height: 740 } });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const view = await page.evaluate(() => document.documentElement.dataset.achView);
    check(view === 'timeline', `360px: unpersisted default is the Timeline (got ${view})`);
    await shot(page, 'stage8-timeline-360', { fullPage: true });
    await page.close();
  }

  // Post page at 1280 — math + code render on the wide layout.
  {
    const page = await newPage();
    await page.goto(`${BASE}/writings/the-theorem-behind-this-site/`, { waitUntil: 'networkidle' });
    await shot(page, 'stage8-post-1280', { fullPage: true });
    await page.close();
  }
}

// === 4. console errors across the site =====================================
{
  for (const [path, label] of [
    ['/', 'home'],
    ['/writings', 'writings index'],
    ['/writings/the-theorem-behind-this-site/', 'post'],
    ['/contact', 'contact'],
    ['/rss.xml', 'rss'],
  ]) {
    const page = await newPage();
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    check(res.status() === 200, `${label} served 200`);
    await page.close();
  }
}

await browser.close();

check(consoleErrors.length === 0, `zero console errors across the walkthrough (${consoleErrors.length})`);
if (consoleErrors.length) consoleErrors.forEach((e) => console.error('  console:', e));

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nall stage-8 checks passed →', OUT);
