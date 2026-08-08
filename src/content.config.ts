import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Achievements — SPEC §6.1 verbatim. Facts only; an unknown value is null,
 * never guessed (§6 editorial rule). One JSON file per entry, filename = id.
 *
 * Chronology contract (SPEC §5.1): the collection is read chronological
 * ascending (new entries are appended at the end of the timeline); the
 * renderer places the LAST entry at the top vertex and walks backward in
 * time counterclockwise. Sorting lives in src/lib/achievements.ts.
 */
const achievements = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/achievements' }),
  schema: z.object({
    id: z.string(), // slug, stable — must equal the filename (checked in lib)
    title: z.string(),
    // §6.1: null for non-competition awards (medals, prizes) — the form and
    // the UI both treat empty/null competition as "no competition".
    competition: z.string().nullable().default(null),
    shortName: z.string(), // vertex label: "<year> · <shortName>"
    date: z.string().regex(/^\d{4}-\d{2}$/, 'ISO month, YYYY-MM'),
    // Unknown or not-applicable values are null, never guessed (§6 editorial
    // rule). default(null) absorbs a blank/omitted CMS field so an optional
    // field left empty can never fail the build.
    location: z.string().nullable().default(null),
    team: z.string().nullable().default(null),
    award: z.string(),
    score: z.string().nullable().default(null),
    rank: z.string().nullable().default(null),
    description: z.string(),
    logo: z.string().nullable().default(null), // null → typographic shortName chip
    images: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    featured: z.boolean().default(false), // 3–5 max; drives the home strip
  }),
});

/**
 * Writings — SPEC §6.2 verbatim. One Markdown file per post; the body may
 * carry $…$ / $$…$$ LaTeX (remark-math + rehype-katex) and fenced code
 * blocks (Shiki). Tags are the controlled vocabulary of SPEC §7 — the enum
 * below is what makes it "controlled": anything else fails the build.
 * `draft: true` posts build locally but are excluded from pages and RSS.
 */
export const POST_TAGS = [
  'mathematics',
  'problem-solving',
  'competitions',
  'computer-science',
  'computer-vision',
  'ai',
  'notes',
] as const;

const writings = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writings' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.enum(POST_TAGS)),
    summary: z.string(), // one sentence — shown in the dense index
    draft: z.boolean().default(false),
  }),
});

export const collections = { achievements, writings };
