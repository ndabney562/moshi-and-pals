/**
 * MODIFIERS: shift-long twists. Today's Shift rolls two from the date; testers can force any with
 * ?mods=powerOutage,fullMoon. Numbers live in BALANCE.modifiers; GameScene applies them.
 * Noah: rename them, rewrite the jokes, or pitch new ones!
 */
export type ModifierId = 'fluSeason' | 'powerOutage' | 'inspectionDay' | 'shortStaffed' | 'construction' | 'fullMoon';

export interface ModifierDef {
  id: ModifierId;
  name: string;
  icon: string;
  /** One line: what changes (shown before the shift and on the Discharge Summary). */
  blurb: string;
}

export const MODIFIERS: ModifierDef[] = [
  { id: 'fluSeason', name: 'Flu Season', icon: '🤧', blurb: 'Viral Sprinters come in twice as often, from round 1' },
  { id: 'powerOutage', name: 'Power Outage', icon: '🔦', blurb: 'The lights are out. You have a flashlight. They do not.' },
  { id: 'inspectionDay', name: 'Inspection Day', icon: '📋', blurb: "The inspector is in: Spotless rounds pay triple" },
  { id: 'shortStaffed', name: 'Short-Staffed', icon: '🧑‍⚕️', blurb: 'Nobody restocks the carts, so restocks cost triple (overtime)' },
  { id: 'construction', name: 'Construction', icon: '🚧', blurb: 'Each round, one opened door is closed for "renovations"' },
  { id: 'fullMoon', name: 'Full Moon', icon: '🌕', blurb: 'Everything is weird tonight. Nobody can explain it.' },
];

export const modifierById = (id: string): ModifierDef | undefined => MODIFIERS.find((m) => m.id === id);

/** What Construction's sign says on a door it closed. */
export const CONSTRUCTION_SIGN = '🚧 CLOSED FOR RENOVATIONS';
/** Floating lines when Construction closes and reopens a door. */
export const CONSTRUCTION_LINES = { closed: 'RENOVATIONS! (germs fit under the door)', reopened: 'RENOVATIONS COMPLETE' };
