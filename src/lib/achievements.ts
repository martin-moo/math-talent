import { getCollection, type CollectionEntry } from 'astro:content';

export type Achievement = CollectionEntry<'achievements'>['data'];

const byMonthThenTitle = (a: Achievement, b: Achievement) =>
  a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? -1 : 1;

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
        `achievements: filename "${e.id}.json" does not match inner id "${e.data.id}" — keep them equal (SPEC §6.1).`,
      );
    }
  }
  // Decap's filename slugifier lowercases ids (e.g. "Fields-Medal" →
  // fields-medal-2035.json), so a case mismatch must never fail the build.
  // The filename is the canonical slug: everything downstream uses it.
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
