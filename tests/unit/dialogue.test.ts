import { expect, it, vi } from 'vitest';
import type { CharacterId } from '../../src/data/characters';
vi.mock('phaser', () => ({ default: {
  Math: { Vector2: class {}, Distance: { BetweenPoints: () => 10 } },
  Utils: { Array: { GetRandom: (items: string[]) => items[0] } },
} }));
vi.mock('../../src/entities/Patient', () => ({ Patient: class {} }));
vi.mock('../../src/ui/SpeechBubble', () => ({ SpeechBubble: class { say = vi.fn(); } }));
import { PatientDirector } from '../../src/systems/PatientDirector';
import { VIOLATIONS } from '../../src/data/patients';

it.each(['eugene', 'kaya', 'lucien', 'ken'] as CharacterId[])('selects %s dialogue and spawns the violation germs', (doctor) => {
  const spawnGermAt = vi.fn();
  const host = { scene: { physics: { add: { group: vi.fn() } }, time: { now: 0 } }, doctor, player: { x: 0, y: 0, dead: false }, spawnGermAt };
  const director = new PatientDirector(host as any);
  const patient = { x: 10, y: 0, def: VIOLATIONS[0], violations: 0, bubble: { say: vi.fn() } };
  (director as any).violate(patient, 100);
  const [response, speaker, offset, duration] = (director as any).eugeneBubble.say.mock.calls[0];
  expect(VIOLATIONS[0][doctor]).toContain(response);
  expect([speaker, offset, duration]).toEqual([host.player, 52, 2000]);
  expect(patient.bubble.say).toHaveBeenCalledWith(VIOLATIONS[0].action, patient, 34, 1800);
  expect(spawnGermAt).toHaveBeenCalledTimes(VIOLATIONS[0].germs);
  expect(patient.violations).toBe(1);
});
it('uses Eugene fallback dialogue when a Pal-specific response is unavailable', () => {
  const host = { scene: { physics: { add: { group: vi.fn() } }, time: { now: 0 } }, doctor: 'kaya', player: { dead: false }, spawnGermAt: vi.fn() };
  const director = new PatientDirector(host as any);
  const patient = { x: 0, y: 0, def: { ...VIOLATIONS[0], kaya: [] }, violations: 0, bubble: { say: vi.fn() } };
  (director as any).violate(patient, 0);
  expect(VIOLATIONS[0].eugene).toContain((director as any).eugeneBubble.say.mock.calls[0][0]);
});
it('does not make a dead player react to a nearby violation', () => {
  const host = { scene: { physics: { add: { group: vi.fn() } }, time: { now: 0 } }, player: { dead: true }, spawnGermAt: vi.fn() };
  const director = new PatientDirector(host as any);
  (director as any).violate({ x: 0, y: 0, def: VIOLATIONS[0], violations: 0, bubble: { say: vi.fn() } }, 0);
  expect((director as any).eugeneBubble.say).not.toHaveBeenCalled();
});

it('replaces every named token and preserves unsupported placeholders', async () => {
  const { dialogueText } = await import('../../src/core/dialogue');
  expect(dialogueText('{SURNAME}! {SURNAME}? {UNKNOWN}', { SURNAME: 'MOSHKOVICH' })).toBe('MOSHKOVICH! MOSHKOVICH? {UNKNOWN}');
});
