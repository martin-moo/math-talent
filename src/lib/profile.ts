import { z } from 'astro:content';
import raw from '../content/profile.json';

/**
 * Profile — SPEC §6.3 (single record). bioShort (≤ 240 chars) is the text
 * inside the inner ellipse. Editable from /admin after stage 6.
 */
const schema = z.object({
  name: z.string(),
  tagline: z.string(),
  bioShort: z.string().max(240, 'bioShort must fit the inner ellipse (§6.3: ≤ 240 chars)'),
  bioLong: z.string(),
  photo: z.string(),
  email: z.string().email(),
  linkedin: z.string().url(),
  education: z.array(
    z.object({ school: z.string(), program: z.string(), period: z.string() }),
  ),
  interests: z.array(z.string()),
});

export const profile = schema.parse(raw);
export type Profile = z.infer<typeof schema>;
