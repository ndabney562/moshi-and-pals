/** Player-visible name limits shared by the game and its future leaderboard API. */
export const LEADERBOARD_NAME_LIMIT = 10;
type NameResult = { ok: true; name: string } | { ok: false; reason: 'required' | 'tooLong' | 'invalid' };

interface GraphemeSegmenter { segment(value: string): Iterable<{ segment: string }>; }
const Segmenter = (Intl as typeof Intl & {
  Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => GraphemeSegmenter;
}).Segmenter;
const segmenter = Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : undefined;

export function leaderboardNameLength(value: string): number {
  return segmenter ? Array.from(segmenter.segment(value)).length : Array.from(value).length;
}

export function validateLeaderboardName(value: unknown): NameResult {
  if (typeof value !== 'string') return { ok: false, reason: 'required' };
  if (value.length > 256) return { ok: false, reason: 'tooLong' };
  const name = value.normalize('NFC').trim();
  if (!name) return { ok: false, reason: 'required' };
  // Preserve emoji joiners; reject control/bidi characters that can disguise the displayed name.
  if (/[\u0000-\u001f\u007f-\u009f\u200b\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u.test(name)) return { ok: false, reason: 'invalid' };
  if (leaderboardNameLength(name) > LEADERBOARD_NAME_LIMIT) return { ok: false, reason: 'tooLong' };
  return { ok: true, name };
}
