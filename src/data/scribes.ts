/**
 * THE SCRIBES (Noah's request, Oct 2026): Omar and Alan, the medical scribes, from Noah's reference photos
 * (the photos stay out of the repo). Unlocked on the Residency Board with CME Credits; once unlocked, their
 * pill joins the power-up drops. Grab it and they walk in, follow you, take care of germs and shame patients
 * with health code violations into cleaning up. They can't be hurt (they're behind a laptop).
 * Art is drawn in BootScene (texture = `scribe-<id>`). Numbers live in BALANCE.scribes.
 */
import type { PowerupId } from './powerups';

export type ScribeId = 'omar' | 'alan';

export interface ScribeDef {
  id: ScribeId;
  name: string;
  /** The power-up pill that brings them in. */
  powerup: PowerupId;
  /** CME Credits to unlock on the Residency Board. */
  cost: number;
  /** How they fight, one line for the board. */
  blurb: string;
  /** Their attack's color (mist or zap). */
  color: number;
  lines: {
    arrive: string[];
    /** Now and then while attacking. */
    attack: string[];
    /** When a patient they've been after cleans up. */
    clean: string[];
    leave: string[];
  };
}

export const SCRIBES: ScribeDef[] = [
  {
    id: 'omar', name: 'Omar', powerup: 'scribeOmar', cost: 12, color: 0xbfe9ff,
    blurb: 'Sprays the nearest germ, fast and light. Never stops smiling.',
    lines: {
      arrive: ['Omar here! Charting that!', "Don't worry, I'm charting everything!"],
      attack: ['Charting that!', 'Noted!', 'Pt. presents with... GERMS.'],
      clean: ['Documented!', 'Added to your chart, sir!'],
      leave: ['Signing off! Notes are in!'],
    },
  },
  {
    id: 'alan', name: 'Alan', powerup: 'scribeAlan', cost: 12, color: 0x9be7ff,
    blurb: 'Zaps a germ and the two next to it. Slower, harder, stuns.',
    lines: {
      arrive: ['Alan. Scribe. Let’s go.', 'Laptop charged. Germs not.'],
      attack: ['Documented. Next.', 'Ctrl+Z that germ.', 'Copy, paste, disinfect.'],
      clean: ['Documented. Next.', 'Noncompliant. Now compliant.'],
      leave: ['Shift over. Notes signed.'],
    },
  },
];

export const scribeById = (id: string | undefined): ScribeDef | undefined => SCRIBES.find((s) => s.id === id);

/** The Residency Board's id for an unlocked scribe (kept in progress.owned). */
export const scribeUnlockId = (id: ScribeId): string => `scribe:${id}`;
