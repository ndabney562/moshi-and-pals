/** What the Equipment Locker's levels are called (numbers in config/locker.ts). Index matches `LOCKER.levels`. */
export const LOCKER_LEVEL_TEXT = [
  { name: 'Labeled & Dated', blurb: '+10% damage' },
  { name: 'Extra Refills', blurb: '+25% tank, jug and charge rate' },
  { name: 'Name Engraved', blurb: '+10% damage, uses 10% faster' },
];

/** Tools on the locker's shelves, in order (the Ionizer 9000 is the Miracle Cure, so it's not here). */
export const LOCKER_TOOLS = ['squirtBottle', 'lysolFogger', 'bleachSoaker', 'uvWand', 'peroxideFoamer', 'wipes', 'gelLauncher', 'defib'];

/** What the staff upgrades are called (numbers in config/locker.ts `STAFF`). Index matches `STAFF.levels`. */
export const STAFF_LEVEL_TEXT = [
  { name: 'Coffee Run', blurb: '+20% damage (front desk: +20% check-in Copays)' },
  { name: 'Overtime', blurb: 'stays 50% longer' },
  { name: 'Employee of the Month', blurb: '+15% damage, works 20% faster' },
];
