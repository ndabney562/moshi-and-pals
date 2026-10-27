import { expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Math: { Distance: { Between: (x: number, y: number, a: number, b: number) => Math.hypot(x - a, y - b) }, Angle: { Between: () => 0 } }, Utils: { Array: { GetRandom: (lines: string[]) => lines[0] } } } }));
vi.mock('../../src/ui/SpeechBubble', () => ({ SpeechBubble: class {} }));
vi.mock('../../src/core/sfx', () => ({ sfx: { cash: vi.fn() } }));
import { FrontDesk } from '../../src/systems/FrontDesk';
import { SCRIBES } from '../../src/data/scribes';
import { BALANCE } from '../../src/config/balance';

function desk(id: 'selina' | 'elaine', power: number, staffPower = 1) {
  const patient = { x: 0, y: 0 };
  const onCheckIn = vi.fn();
  const controller = Object.create(FrontDesk.prototype);
  const helper = { here: true, def: SCRIBES.find((s) => s.id === id), until: Infinity, nextCheckInAt: 0, checkedIn: 0,
    img: { x: 30, y: 0, setRotation: vi.fn() }, bubble: { follow: vi.fn(), say: vi.fn() }, boost: { power: staffPower, speed: 1, duration: 1 } };
  controller.psrs = [helper];
  controller.line = [{ x: 0, y: 0 }];
  controller.host = { helperPower: power, patients: { queue: [patient], checkIn: vi.fn(() => true) }, onCheckIn, fx: { nozzleMist: vi.fn() } };
  return { controller, patient, helper, onCheckIn };
}
for (const [provider, power, selina, elaine] of [
  ['eugene', 0.75, 4, 19], ['kaya', 1, 5, 25], ['lucien', 1.5, 8, 38], ['ken', 1.25, 6, 31],
] as const) {
  it(`${provider} scales only PSR bonus output, with one final rounding step`, () => {
    for (const [id, expected] of [['selina', selina], ['elaine', elaine]] as const) {
      const { controller, patient, helper, onCheckIn } = desk(id, power);
      controller.update(100, false);
      expect(onCheckIn).toHaveBeenCalledExactlyOnceWith(patient, expected);
      expect(helper.nextCheckInAt).toBe(100 + BALANCE.frontDesk[id].checkInMs);
    }
  });
}
it('combines provider and staff power once while preserving permanent upgrade state', () => {
  const { controller, patient, helper, onCheckIn } = desk('elaine', 1.5, 1.2);
  controller.update(100, false);
  expect(onCheckIn).toHaveBeenCalledExactlyOnceWith(patient, 45);
  expect(helper.boost.power).toBe(1.2);
});

it('temporary rallies increase PSR bonus output and expire without changing permanent upgrades',()=>{
 const {controller,helper,onCheckIn}=desk('elaine',1.5,1.2);
 controller.rally(100,1000,1.5);controller.update(200,false);
 expect(onCheckIn.mock.calls[0][1]).toBe(68);
 helper.nextCheckInAt=0;controller.update(1100,false);
 expect(onCheckIn.mock.calls[1][1]).toBe(45);expect(helper.boost.power).toBe(1.2);
});
