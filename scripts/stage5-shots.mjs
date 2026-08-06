/**
 * stage5-shots.mjs — stage-5 acceptance captures + checks (BUILD_GUIDE §stage 5).
 *
 * Drives the preview server with Playwright's chromium and checks:
 *   - post renders KaTeX: inline .katex + .katex-display present, no raw
 *     $$…$$ left in the text, KaTeX fonts actually applied (CSS loaded)
 *   - post renders Shiki: pre.astro-code with per-token spans; comments
 *     resolve to --slate, keywords to semibold --ink (token discipline)
 *   - index is the dense list: date, title, tags, one-line summary per row;
 *     newest first; no images
 *   - /rss.xml serves a valid RSS 2.0 channel with absolute item links
 *   - zero console errors / page errors (SPEC §11)
 *
 * Captures: stage5-index.png, stage5-post.png, stage5-post-full.png,
 * stage5-post-math.png (display equation), stage5-post-code.png (C++ block).
 *
 * Usage: node scripts/stage5-shots.mjs [baseURL]   (default http://localhost:4321)
 * Exits non-zero if any check fails.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const OUT = new URL('../drafts/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Expected index order (newest first) from the collection itself.
const writingsDir = new URL('../src/content/writings/', import.meta.url).pathname;
const EXPECTED = readdirSync(writingsDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const src = readFileSync(writingsDir + f, 'utf8');
    const fm = src.match(/^---\n([\s\S]*?)\n---/)[1];
    return {
      id: f.replace(/\.md$/, ''),
      title: fm.match(/^title: "(.*)"$/m)[1],
      date: fm.match(/^date: (\d{4}-\d{2}-\d{2})$/m)[1],
      draft: /^draft: true$/m.test(fm),
    };
  })
  .filter((p) => !p.draft)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

const SLATE = 'rgb(91, 100, 114)'; // --slate #5B6472
const INK = 'rgb(28, 35, 51)'; //     --ink   #1C2333

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

// === post page: KaTeX + Shiki ==============================================
{
  const page = await newPage();
  await page.goto(`${BASE}/writings/${EXPECTED[0].id}/`, { waitUntil: 'networkidle' });

  // -- KaTeX: inline + display rendered, no raw markers left -----------------
  const math = await page.evaluate(() => {
    const article = document.querySelector('.prose');
    return {
      inline: article.querySelectorAll('.katex').length,
      display: article.querySelectorAll('.katex-display').length,
      rawDollars: (article.textContent.match(/\$\$?/g) ?? []).length,
      katexFont: getComputedStyle(article.querySelector('.katex')).fontFamily,
      displayVisible: !!document.querySelector('.katex-display')?.offsetParent,
    };
  });
  check(math.inline >= 15, `inline math rendered (${math.inline} .katex spans)`);
  check(math.display >= 1, `display math rendered (${math.display} .katex-display)`);
  check(math.rawDollars === 0, `no raw $…$ markers left in the text (${math.rawDollars})`);
  check(/KaTeX/.test(math.katexFont), `KaTeX CSS + fonts applied (${math.katexFont.split(',')[0]}…)`);

  // -- Shiki: C++ block highlighted inside the token palette -----------------
  const code = await page.evaluate(() => {
    const pres = [...document.querySelectorAll('.prose pre.astro-code')];
    const cpp = pres.find((p) => p.textContent.includes('#include'));
    if (!cpp) return { blocks: pres.length, found: false };
    const spans = [...cpp.querySelectorAll('span[style]')];
    const comment = spans.find((s) => s.style.color.includes('--astro-code-token-comment'));
    const keyword = spans.find((s) => s.style.color.includes('--astro-code-token-keyword'));
    const outsidePalette = spans.some((s) => {
      const v = s.style.color;
      return v !== '' && !v.startsWith('var(--astro-code-');
    });
    return {
      blocks: pres.length,
      found: true,
      tokenized: spans.length,
      commentColor: comment ? getComputedStyle(comment).color : null,
      commentItalic: comment ? getComputedStyle(comment).fontStyle : null,
      keywordColor: keyword ? getComputedStyle(keyword).color : null,
      keywordWeight: keyword ? getComputedStyle(keyword).fontWeight : null,
      outsidePalette,
    };
  });
  check(code.found, `C++ block present (${code.blocks} code blocks)`);
  check(code.tokenized > 30, `Shiki tokenized the block (${code.tokenized} styled spans)`);
  check(
    code.commentColor === SLATE && code.commentItalic === 'italic',
    `comments recede: slate italic (${code.commentColor}, ${code.commentItalic})`,
  );
  check(
    code.keywordColor === INK && Number(code.keywordWeight) >= 600,
    `keywords assert: ink semibold (${code.keywordColor}, weight ${code.keywordWeight})`,
  );
  check(!code.outsidePalette, 'every token color resolves through the §3.1 variables');

  // -- captures: full post + the math and code money shots -------------------
  await shot(page, 'stage5-post');
  await shot(page, 'stage5-post-full', { fullPage: true });
  const katexDisplay = page.locator('.katex-display').first();
  await katexDisplay.scrollIntoViewIfNeeded();
  await shot(katexDisplay, 'stage5-post-math');
  const cppBlock = page.locator('.prose pre.astro-code', { hasText: '#include' });
  await cppBlock.scrollIntoViewIfNeeded();
  await shot(cppBlock, 'stage5-post-code');
  await page.close();
}

// === index: the dense list ==================================================
{
  const page = await newPage();
  await page.goto(`${BASE}/writings`, { waitUntil: 'networkidle' });

  const index = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.post-index .post-row')];
    return {
      rows: rows.map((r) => ({
        date: r.querySelector('.p-date')?.textContent.trim(),
        title: r.querySelector('.p-title')?.textContent.trim(),
        href: r.querySelector('.p-title')?.getAttribute('href'),
        summary: r.querySelector('.p-summary')?.textContent.trim() ?? '',
        tags: r.querySelector('.p-tags')?.textContent.trim() ?? '',
      })),
      images: document.querySelectorAll('.post-index img').length,
      rssLink: !!document.querySelector('a[href="/rss.xml"]'),
      rssAutodiscovery: !!document.querySelector('link[rel="alternate"][type="application/rss+xml"]'),
    };
  });

  check(
    index.rows.length === EXPECTED.length &&
      index.rows.every((r, k) => r.title === EXPECTED[k].title && r.date === EXPECTED[k].date),
    `rows = non-draft posts, newest first (${index.rows.map((r) => r.date).join(', ')})`,
  );
  check(
    index.rows.every((r) => r.href === `/writings/${EXPECTED.find((e) => e.title === r.title).id}/`),
    'every title links to its post page',
  );
  check(
    index.rows.every((r) => r.summary.length > 20 && r.summary.length < 200 && r.tags.length > 0),
    'every row carries the one-line summary and tags',
  );
  check(index.images === 0, `no images in the index (${index.images})`);
  check(index.rssLink && index.rssAutodiscovery, 'RSS linked on the page + autodiscovery in <head>');

  await shot(page, 'stage5-index');
  await page.close();
}

// === RSS: served, parseable, absolute =======================================
{
  const page = await newPage();
  const res = await page.goto(`${BASE}/rss.xml`);
  const body = await res.text();
  const contentType = res.headers()['content-type'] ?? '';
  const items = [...body.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const links = items.map((i) => i.match(/<link>([^<]*)<\/link>/)?.[1] ?? '');
  const pubDates = items.map((i) => i.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1] ?? '');

  check(res.status() === 200 && /xml|rss/.test(contentType), `served as XML (${res.status()}, ${contentType})`);
  check(
    body.startsWith('<?xml') && body.includes('<rss version="2.0">') && body.includes('<channel>'),
    'RSS 2.0 channel structure',
  );
  check(
    items.length === EXPECTED.length && body.includes(`<title>${EXPECTED[0].title}</title>`),
    `feed lists every non-draft post (${items.length} item/s)`,
  );
  check(
    links.every((l) => l.startsWith('https://')),
    `item links absolute via astro.config site (${links[0] ?? '—'})`,
  );
  check(
    pubDates.every((d) => /^\w{3}, \d{2} \w{3} \d{4} /.test(d)),
    `pubDates are RFC-822 (${pubDates[0] ?? '—'})`,
  );
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
