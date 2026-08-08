import { getCollection, type CollectionEntry } from 'astro:content';

export type Achievement = CollectionEntry<'achievements'>['data'];

const byMonthThenTitle = (a: Achievement, b: Achievement) =>
  a.date === b.date ? titleOf(a).localeCompare(titleOf(b)) : a.date < b.date ? -1 : 1;

/**
 * All achievements, chronological ascending (SPEC §5.1: the renderer reads
 * from the end). Same-month ties (exact days unknown) break by title —
 * deterministic, and never an invented chronology.
 */
export async function getAchievements(): Promise<Achievement[]> {
  const entries = await getCollection('achievements');
  for (const e of entries) {
    if (e.id.toLowerCase() !== e.data.id.toLowerCase()) {
      throw new Error(
        `achievements: filename "${e.id}.json" does not match inner id "${e.data.id}" — keep them equal apart from case (SPEC §6.1).`,
      );
    }
  }
  // Uppercase is normal and acceptable: the filename and inner id may differ
  // only in case. Decap's slugifier lowercases the filename (e.g. typed
  // "Fields-Medal-2035" → fields-medal-2035.json), so a case-only mismatch
  // must never fail the build. The filename is the canonical slug: everything
  // downstream uses it.
  return entries.map((e) => ({ ...e.data, id: e.id })).sort(byMonthThenTitle);
}

/** Featured entries for the home strip (§6.1), newest first. */
export const featuredOf = (entries: Achievement[]): Achievement[] =>
  entries.filter((e) => e.featured).reverse();

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-08" → "August 2026" (fixed table — locale-independent). */
export const formatMonth = (isoMonth: string): string => {
  const [y, m] = isoMonth.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const yearOf = (e: Achievement): string => e.date.slice(0, 4);

/**
 * Display helpers. Because the schema (§6.1) requires only `id` and `date`,
 * every renderer derives its labels from these so a half-empty entry (e.g. a
 * medal with no competition) never renders blank or broken text.
 */

/** "2035 · IMO" — the vertex/kicker label, or just the year when nameless. */
export const labelOf = (e: Achievement): string =>
  e.shortName ? `${yearOf(e)} · ${e.shortName}` : yearOf(e);

/** A non-empty title for headings/tooltips, via title → shortName → award → year. */
export const titleOf = (e: Achievement): string =>
  e.title || e.shortName || e.award || yearOf(e);
