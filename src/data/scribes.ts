/**
 * THE HELPERS. THE SCRIBES (Noah's request, Oct 2026): Omar and Alan, the medical scribes, from Noah's reference photos
 * (the photos stay out of the repo). Unlocked on the Residency Board with CME Credits; once unlocked, their
 * pill joins the power-up drops. Grab it and they walk in, follow you, take care of germs and shame patients
 * with health code violations into cleaning up. They can't be hurt (they're behind a laptop).
 * DONALD, the X-ray tech (Noah, Oct 2026), works the same way but isn't for sale: he unlocks the first time
 * the doctor walks into the X-ray room during a shift, and from then on comes out to help on the first visit
 * to X-ray every shift, and his pill drops too. His X-ray beam goes through walls and every germ in its line.
 * SELINA and ELAINE, the front desk PSRs (Noah, Oct 2026), are bought like the scribes but don't follow you: their pill
 * sends them to the RECEPTION desk, and while one is there every patient lines up at the desk and complains about the
 * wait instead of committing violations, and gets checked in and sent home one at a time (systems/FrontDesk.ts).
 * Art is drawn in BootScene (texture = `scribe-<id>`). Numbers live in BALANCE.scribes.
 */
import type { PowerupId } from './powerups';

export type ScribeId = 'omar' | 'alan' | 'donald' | 'selina' | 'elaine';

export interface ScribeDef {
  id: ScribeId;
  name: string;
  /** Their job, for the board. */
  role: string;
  /** The power-up pill that brings them in. */
  powerup: PowerupId;
  /** CME Credits to unlock on the Residency Board; without one, they can't be bought. */
  cost?: number;
  /** How a helper who can't be bought is unlocked, for the board. */
  unlockHint?: string;
  /** Only a helper with this unlocks by walking into this room during a shift (and comes out to help there). */
  unlockRoom?: string;
  /** The banner when that happens for the first time. */
  unlockBanner?: { title: string; line: string };
  /** A front desk PSR: works the RECEPTION desk instead of following the doctor (systems/FrontDesk.ts). */
  desk?: boolean;
  /** How they fight, one line for the board. */
  blurb: string;
  /** Their attack's color (mist or zap). */
  color: number;
  lines: {
    arrive: string[];
    /** Now and then while attacking (a PSR: when checking a patient in). */
    attack: string[];
    /** When a patient they've been after cleans up (a PSR: once the line is empty). */
    clean: string[];
    leave: string[];
  };
}

export const SCRIBES: ScribeDef[] = [
  {
    id: 'omar', name: 'Omar', role: 'SCRIBE', powerup: 'scribeOmar', cost: 12, color: 0xbfe9ff,
    blurb: 'Sprays the nearest germ, fast and light. Never stops smiling.',
    lines: {
      arrive: ['Omar here! Charting that!', "Don't worry, I'm charting everything!"],
      attack: ['Charting that!', 'Noted!', 'Pt. presents with... GERMS.'],
      clean: ['Documented!', 'Added to your chart, sir!'],
      leave: ['Signing off! Notes are in!'],
    },
  },
  {
    id: 'alan', name: 'Alan', role: 'SCRIBE', powerup: 'scribeAlan', cost: 12, color: 0x9be7ff,
    blurb: 'Zaps a germ and the two next to it. Slower, harder, stuns.',
    lines: {
      arrive: ['Alan. Scribe. Let’s go.', 'Laptop charged. Germs not.'],
      attack: ['Documented. Next.', 'Ctrl+Z that germ.', 'Copy, paste, disinfect.'],
      clean: ['Documented. Next.', 'Noncompliant. Now compliant.'],
      leave: ['Shift over. Notes signed.'],
    },
  },
  {
    id: 'donald', name: 'Donald', role: 'X-RAY TECH', powerup: 'techDonald', color: 0xc8ffe6,
    unlockHint: 'Walk into X-ray during a shift', unlockRoom: 'xray',
    unlockBanner: { title: 'DONALD UNLOCKED', line: 'The X-ray tech has your back. His pill drops from now on.' },
    blurb: 'Shoots an X-ray beam through walls and every germ in its line.',
    lines: {
      arrive: ['Donald, X-ray. Need a film, doc?', 'Lead apron on. I got you.'],
      attack: ['Hold still... and done.', 'Two views, coming up.', "Don't breathe!", 'Clear shot.'],
      clean: ['Clean enough to image.', 'Read: no germs.'],
      leave: ['Back to X-ray. Films are piling up.'],
    },
  },
  {
    id: 'selina', name: 'Selina', role: 'FRONT DESK', powerup: 'psrSelina', cost: 15, color: 0xffb3c7, desk: true,
    blurb: 'Lines every patient up at the front desk and checks them in fast.',
    lines: {
      arrive: ['Selina, front desk. Everyone, line up please!', 'Okay! Who was here first?'],
      attack: ['Next!', 'Insurance card, please.', 'Have a seat, they’ll call you.', 'Sign here, here and here.'],
      clean: ['Line’s clear. I’m a legend.'],
      leave: ['On break. Don’t touch my desk.'],
    },
  },
  {
    id: 'elaine', name: 'Elaine', role: 'FRONT DESK', powerup: 'psrElaine', cost: 15, color: 0xf8c8dc, desk: true,
    blurb: 'Lines every patient up at the front desk and collects their copay. Slower, pays more.',
    lines: {
      arrive: ['Elaine, front desk. Form a line!', 'Hi! Copays are due at check-in.'],
      attack: ['That’ll be your copay.', 'Card or cash?', 'Is this address still current?', 'Next, please!'],
      clean: ['Nobody waiting. Peace and quiet.'],
      leave: ['Lunch. Put a sign up.'],
    },
  },
];

export const scribeById = (id: string | undefined): ScribeDef | undefined => SCRIBES.find((s) => s.id === id);

/** The Residency Board's id for an unlocked scribe (kept in progress.owned). */
export const scribeUnlockId = (id: ScribeId): string => `scribe:${id}`;
