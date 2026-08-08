// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  // Canonical origin — the free Netlify address planned in SPEC §13
  // (stage 9). Required by @astrojs/rss for absolute item URLs.
  site: 'https://math-talent.netlify.app',
  // Sitemap for SEO (SPEC §stage 8); `site` above is the canonical origin.
  integrations: [sitemap()],
  markdown: {
    // SPEC §7: KaTeX is non-negotiable — $…$ / $$…$$ everywhere in posts.
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      // The css-variables theme emits var(--shiki-token-*) colors instead of
      // a fixed palette, so highlighting stays inside the 5-token discipline
      // of SPEC §3.1 — the variables are mapped in src/styles/prose.css.
      theme: 'css-variables',
    },
  },
});
