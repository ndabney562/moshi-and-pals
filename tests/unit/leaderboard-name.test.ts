import { expect, it } from 'vitest';
import { leaderboardNameLength, validateLeaderboardName } from '../../src/core/leaderboardName';

it('accepts ten visible characters and rejects eleven', () => {
  expect(validateLeaderboardName('ABCDEFGHIJ')).toEqual({ ok: true, name: 'ABCDEFGHIJ' });
  expect(validateLeaderboardName('ABCDEFGHIJK')).toEqual({ ok: false, reason: 'tooLong' });
});
it('normalizes accents without counting combining marks as extra letters', () => {
  const decomposed = 'e\u0301'.repeat(10);
  expect(validateLeaderboardName(decomposed)).toEqual({ ok: true, name: 'é'.repeat(10) });
});
it('counts joined emoji as player-visible characters', () => {
  const family = '👩‍👩‍👧‍👦';
  expect(leaderboardNameLength(family)).toBe(1);
  expect(validateLeaderboardName(family.repeat(10))).toEqual({ ok: true, name: family.repeat(10) });
  expect(validateLeaderboardName(family.repeat(11))).toEqual({ ok: false, reason: 'tooLong' });
});
it.each(['', '   ', null, 123])('rejects an empty or non-text name: %j', (value) => {
  expect(validateLeaderboardName(value)).toEqual({ ok: false, reason: 'required' });
});
it('trims surrounding whitespace while preserving ordinary punctuation', () => {
  expect(validateLeaderboardName('  Dr. Raj!  ')).toEqual({ ok: true, name: 'Dr. Raj!' });
});
it.each(['A\u0000B', 'A\nB', 'A\u202eB'])('rejects invisible control characters: %j', (value) => {
  expect(validateLeaderboardName(value)).toEqual({ ok: false, reason: 'invalid' });
});
