import { LOCKER } from '../config/locker';
import type { EquipmentDef } from '../data/equipment';

/** Permanent equipment upgrades stack on the current in-shift definition. */
export function withLocker(def: EquipmentDef, level: number): EquipmentDef {
  let damage = 1, supply = 1, interval = 1;
  for (const upgrade of LOCKER.levels.slice(0, level)) {
    damage *= upgrade.damage ?? 1;
    supply *= upgrade.supply ?? 1;
    interval *= upgrade.interval ?? 1;
  }
  if (level <= 0) return def;
  return { ...def, damage: def.damage * damage, capacity: Math.round(def.capacity * supply), reserve: Math.round(def.reserve * supply),
    rechargePerSecond: def.rechargePerSecond ? def.rechargePerSecond * supply : def.rechargePerSecond,
    fireIntervalMs: Math.round(def.fireIntervalMs * interval) };
}

export function joystickAmount(distance: number, radius: number, deadZone: number): number {
  return Math.max(0, Math.min(1, (Math.min(distance, radius) / radius - deadZone) / (1 - deadZone)));
}
