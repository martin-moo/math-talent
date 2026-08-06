/**
 * stage3-shots.mjs — stage-3 acceptance captures + checks (BUILD_GUIDE rule 3).
 *
 * Drives the preview server with Playwright's chromium and produces:
 *   stage3-t0/t1/t2.png    — three family parameters (?t= hook); for each, the
 *                            rendered DOM is checked numerically: vertices on
 *                            the outer ellipse, edges tangent to the inner one
 *   stage3-selected.png    — click-select: gold vertex + two gold edges
 *   stage3-keyboard.png    — after ←/→ + Enter keyboard selection
 *   stage3-drag-*.png      — frame series of a real pointer drag
 *   stage3-drift-a/b.png   — 700 ms apart: must DIFFER (drift is alive)
 *   stage3-reduced-a/b.png — reduced motion, 600 ms apart: must be IDENTICAL
 *
 * Usage: node scripts/stage3-shots.mjs [baseURL]   (default http://localhost:4321)
 * Exits non-zero if any numeric check fails.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const OUT = new URL('../drafts/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const T0 = Math.PI / 2;
// Playwright's own headless shell: the system Chromium dies by SIGTRAP in
// this environment (seccomp trap in helper processes).
const browser = await chromium.launch({ args: ['--no-sandbox', '--hide-scrollbars'] });

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗ FAIL'} ${what}`);
  if (!ok) failures++;
};

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`  → ${name}.png`);
}

/**
 * Read the live SVG geometry and verify the Poncelet contract:
 * vertices on O (screen coords), edges tangent to I_s. The DOM attributes
 * are rounded to 0.01, so tolerance is 0.05 user units.
 */
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
      const y = -(Number(m[2]) - CY); // back to math coords
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
      const h = S * Math.hypot(A * nx, B * ny); // support function of I_s
      worstTan = Math.max(worstTan, Math.abs(d - h));
    }
    return { worstOn, worstTan };
  });
  check(result.worstOn < 5e-4, `${label}: vertices on outer ellipse (worst residual ${result.worstOn.toExponential(2)})`);
  check(result.worstTan < 0.05, `${label}: edges tangent to inner ellipse (worst gap ${result.worstTan.toFixed(4)}px)`);
}

// --- three family parameters -------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  for (const [name, t] of [
    ['stage3-t0', T0],
    ['stage3-t1', T0 + 0.9],
    ['stage3-t2', T0 + 2.2],
  ]) {
    await page.goto(`${BASE}/?t=${t}`, { waitUntil: 'networkidle' });
    await shot(page, name);
    await verifyGeometry(page, name);
  }

  // --- click-select (click the dot — the painted target a user aims at) ---
  await page.goto(`${BASE}/?t=${T0}`, { waitUntil: 'networkidle' });
  await page.locator('g.vertex[data-index="3"] circle.dot').click();
  const pressed = await page.locator('g.vertex[data-index="3"]').getAttribute('aria-pressed');
  const status1 = await page.locator('.poncelet-status').textContent();
  check(pressed === 'true', 'click-select sets aria-pressed on vertex 3');
  check(status1?.trim() === 'Contestant — IOI 2024', `status line follows selection ("${status1?.trim()}")`);
  await page.waitForTimeout(350); // let the 180 ms gold transition settle
  await shot(page, 'stage3-selected');

  // --- keyboard: ←/→ cycles focus, Enter selects --------------------------
  await page.goto(`${BASE}/?t=${T0}`, { waitUntil: 'networkidle' });
  await page.locator('g.vertex[data-index="0"]').focus();
  await page.keyboard.press('ArrowRight'); // CCW = backward in time
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const kb = await page.evaluate(() => ({
    focused: document.activeElement?.getAttribute('data-index'),
    pressed: document.querySelector('g.vertex[data-index="2"]')?.getAttribute('aria-pressed'),
    status: document.querySelector('.poncelet-status')?.textContent?.trim(),
  }));
  // Vertex k carries entries[n−1−k]: 0 = IMC 2026, 1 = MMC 2026, 2 = MMC 2025.
  check(kb.focused === '2' && kb.pressed === 'true' && kb.status === 'First Place — MMC 2025',
    `keyboard nav: → → Enter selects vertex 2 (${JSON.stringify(kb)})`);
  await page.waitForTimeout(350);
  await shot(page, 'stage3-keyboard');

  // --- drift is alive: two frames 700 ms apart must differ ----------------
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const driftA = await page.screenshot();
  await page.waitForTimeout(700);
  const driftB = await page.screenshot();
  check(!driftA.equals(driftB), 'drift animates (frames differ)');
  await page.screenshot({ path: `${OUT}stage3-drift-b.png` });

  // --- drag frame series ---------------------------------------------------
  await page.goto(`${BASE}/?t=${T0}`, { waitUntil: 'networkidle' });
  const svg = page.locator('figure.poncelet svg');
  const box = await svg.boundingBox();
  // Orbit the pointer around the ellipse center at ~31% of the half-extents:
  // the family parameter must follow the pointer's anomaly.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rx = box.width * 0.31;
  const ry = box.height * 0.31;
  const pt = (deg) => ({
    x: cx + rx * Math.cos((deg * Math.PI) / 180),
    y: cy - ry * Math.sin((deg * Math.PI) / 180), // screen y-down: negate for CCW
  });
  const v0before = await page.locator('g.vertex[data-index="0"]').getAttribute('transform');
  const start = pt(20);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  let frame = 0;
  await shot(page, `stage3-drag-${String(frame++).padStart(2, '0')}`);
  for (let deg = 35; deg <= 200; deg += 15) {
    const p = pt(deg);
    await page.mouse.move(p.x, p.y, { steps: 3 });
    await shot(page, `stage3-drag-${String(frame++).padStart(2, '0')}`);
  }
  await page.mouse.up();
  await shot(page, `stage3-drag-${String(frame++).padStart(2, '0')}`);
  const v0after = await page.locator('g.vertex[data-index="0"]').getAttribute('transform');
  check(v0before !== v0after, `drag scrubbed the family (${v0before} → ${v0after})`);
  await verifyGeometry(page, 'after-drag');
  await page.close();
}

// --- reduced motion: two frames 600 ms apart must be identical ----------
{
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await shot(page, 'stage3-reduced-a');
  await page.waitForTimeout(600);
  const bufA = await page.screenshot();
  await page.waitForTimeout(600);
  const bufB = await page.screenshot();
  await page.screenshot({ path: `${OUT}stage3-reduced-b.png` });
  check(bufA.equals(bufB), 'prefers-reduced-motion renders statically (frames identical)');
  await page.close();
}

await browser.close();
if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nall checks passed →', OUT);
