import { expect, it, vi } from 'vitest';

it('loads the baseline defaults on a fresh device', async () => {
  const { settings } = await import('../../src/core/settings');
  expect(settings).toEqual({ autoAim: true, sound: true, music: true, autoRefill: true, reducedMotion: false, learned: {}, character: 'eugene', difficulty: 'urgent', mode: 'standard' });
});
it('merges older partial settings and persists learned hints across reload', async () => {
  localStorage.setItem('moshi.settings.v1', '{"sound":false,"learned":{"move":true}}');
  const { settings, saveSettings } = await import('../../src/core/settings');
  expect(settings.sound).toBe(false);
  expect(settings.autoRefill).toBe(true);
  settings.learned.spray = true;
  saveSettings();
  vi.resetModules();
  expect((await import('../../src/core/settings')).settings.learned).toEqual({ move: true, spray: true });
});
it('falls back on malformed JSON', async () => {
  localStorage.setItem('moshi.settings.v1', '{bad');
  expect((await import('../../src/core/settings')).settings.character).toBe('eugene');
});
it('retains session settings when storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  const { settings, saveSettings } = await import('../../src/core/settings');
  settings.sound = false;
  expect(saveSettings).not.toThrow();
  expect(settings.sound).toBe(false);
});
// Audit finding: valid JSON with invalid field types is not validated yet.
// No test asserts this defect as desired behavior; remediation belongs to Phase 3.

it.each([null, [], 42, { sound: 'yes', music: null, autoAim: 1, learned: 'bad', character: 'missing', difficulty: 'unknown' }])('rejects invalid but parseable settings: %j', async (raw) => {
  const { parseSettings } = await import('../../src/core/settings');
  expect(parseSettings(raw)).toMatchObject({ sound: true, music: true, autoAim: true, learned: {}, character: 'eugene', difficulty: 'urgent' });
});
it('keeps valid fields and boolean learned hints without prototype keys', async () => {
  const { parseSettings } = await import('../../src/core/settings');
  expect(parseSettings(JSON.parse('{"sound":false,"character":"ken","difficulty":"trauma","learned":{"move":true,"spray":"yes","unknown":true,"__proto__":true}}')))
    .toMatchObject({ sound: false, character: 'ken', difficulty: 'trauma', learned: { move: true } });
  const a = parseSettings(null), b = parseSettings(null);
  a.learned.move = true;
  expect(b.learned).toEqual({});
});
