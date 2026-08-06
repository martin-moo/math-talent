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
    competition: z.string(),
    shortName: z.string(), // vertex label: "<year> · <shortName>"
    date: z.string().regex(/^\d{4}-\d{2}$/, 'ISO month, YYYY-MM'),
    location: z.string().nullable(),
    team: z.string().nullable(),
    award: z.string(),
    score: z.string().nullable(),
    rank: z.string().nullable(),
    description: z.string(),
    logo: z.string().nullable(), // null → typographic shortName chip
    images: z.array(z.string()),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })),
    featured: z.boolean(), // 3–5 max; drives the home strip
  }),
});

export const collections = { achievements };
