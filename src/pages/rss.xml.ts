/**
 * /rss.xml — the writings feed (SPEC §7). Non-draft posts, newest first;
 * `site` comes from astro.config.mjs so item URLs are absolute.
 */
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('writings', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  return rss({
    title: 'Akram Zakine — Writings',
    description:
      'Notes on mathematics, problem-solving, and computing.',
    site: context.site ?? '',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      link: `/writings/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
