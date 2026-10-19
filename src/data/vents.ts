/**
 * GERM VENTS (Noah, Oct 2026): germs come in through vents that move to new random spots in the open rooms every
 * round. Pay a Copay at one and it's taped off with a PRIOR AUTH barricade: germs have to wait for approval,
 * but they lean on it until it gives way. The scribes put up barricades too. Numbers in BALANCE.vents.
 */
export const VENT_WORDS = {
  /** The USE button at an open vent, and the note under it. */
  verb: 'BLOCK',
  note: (secs: number) => `Prior Authorization: holds germs back up to ${secs} s`,
  /** At a vent that's already taped off. */
  heldVerb: 'BLOCKED',
  heldNote: (pct: number) => `Germs are pushing: ${pct}% left`,
  /** Floating text when a barricade goes up, when germs push on it, and when it gives way. */
  blocked: 'PRIOR AUTH PENDING',
  pushed: 'BANG!',
  broken: 'APPROVED! GERMS INCOMING',
  /** Painted on the barricade. */
  sign: 'PRIOR AUTH',
};
