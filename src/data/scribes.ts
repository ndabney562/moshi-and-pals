/**
 * THE HELPERS. THE SCRIBES (Noah's request, Oct 2026): Omar and Alan, the medical scribes, from Noah's reference photos
 * (the photos stay out of the repo). Unlocked on the Residency Board with CME Credits. Once hired (Noah, Oct 2026),
 * each one waits every shift in a random locked exam room on the first floor (`waitsIn`); open that room and
 * they come out and help for the rest of the shift: they follow you, take care of germs and shame patients
 * with health code violations into cleaning up. They can't be hurt (they're behind a laptop).
 * DONALD, the X-ray tech (Noah, Oct 2026), works the same way but isn't for sale: every shift he waits in the
 * X-ray room, and opening it lets him out to help for the rest of the shift (the first time also unlocks him for
 * good). No pill. His X-ray beam goes through walls and every germ in its line.
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
  /** The power-up pill that brings them in (the front desk PSRs). */
  powerup?: PowerupId;
  /** Hired, they wait in one of these rooms (picked at random each shift) until the doctor opens it. */
  waitsIn?: string[];
  /** CME Credits to unlock on the Residency Board; without one, they can't be bought. */
  cost?: number;
  /** How a helper who can't be bought is unlocked, for the board. */
  unlockHint?: string;
  /** Only a helper with this unlocks by opening this room during a shift (Donald); they wait there until it's opened. */
  unlockRoom?: string;
  /** The banner when that happens for the first time. */
  unlockBanner?: { title: string; line: string };
  /** A front desk PSR: works the RECEPTION desk instead of following the doctor (systems/FrontDesk.ts). */
  desk?: boolean;
  /** Whether this helper is eligible to receive random mid-shift trainees (Omar, Selina, Elaine). */
  traineeEligible?: boolean;
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
    /** When they barricade a germ vent (with your Copays). The front desk PSRs stay at the desk, so they never do. */
    block?: string[];
    leave: string[];
    /** When a trainee is assigned to shadow them. */
    traineeStart?: string[];
    /** When the trainee completes orientation. */
    traineeEnd?: string[];
  };
}

/** The first floor's exam rooms, where the scribes wait to be let out. */
const EXAM_ROOMS_FIRST_FLOOR = ['exam1', 'exam2', 'exam3', 'exam4', 'exam5', 'exam6', 'exam7'];

export const SCRIBES: ScribeDef[] = [
  {
    id: 'omar', name: 'Omar', role: 'SCRIBE', waitsIn: EXAM_ROOMS_FIRST_FLOOR, cost: 12, color: 0xbfe9ff,
    traineeEligible: true,
    blurb: 'Sprays the nearest germ, fast and light. Never stops smiling.',
    lines: {
      arrive: ['Omar here! Charting that!', "Don't worry, I'm charting everything!"],
      attack: ['Charting that!', 'Noted!', 'Pt. presents with... GERMS.'],
      clean: ['Documented!', 'Added to your chart, sir!'],
      block: ['Prior auth pending!', "I'll put that on your tab, sir!"],
      leave: ['Signing off! Notes are in!'],
      traineeStart: ['Shadow me! Rule one: keep charting!', 'First day? Don’t touch the laptop!'],
      traineeEnd: ['Trainee signed off! Back to full speed!', 'They passed! Solo charting time!'],
    },
  },
  {
    id: 'alan', name: 'Alan', role: 'SCRIBE', waitsIn: EXAM_ROOMS_FIRST_FLOOR, cost: 12, color: 0x9be7ff,
    traineeEligible: false,
    blurb: 'Zaps a germ and the two next to it. Slower, harder, stuns.',
    lines: {
      arrive: ['Alan. Scribe. Let’s go.', 'Laptop charged. Germs not.'],
      attack: ['Documented. Next.', 'Ctrl+Z that germ.', 'Copy, paste, disinfect.'],
      clean: ['Documented. Next.', 'Noncompliant. Now compliant.'],
      block: ['Denied. Pending review.', 'Filed. Germs can wait.'],
      leave: ['Shift over. Notes signed.'],
    },
  },
  {
    id: 'donald', name: 'Donald', role: 'X-RAY TECH', waitsIn: ['xray'], color: 0xc8ffe6,
    traineeEligible: false,
    unlockHint: 'Open X-ray during a shift', unlockRoom: 'xray',
    unlockBanner: { title: 'DONALD UNLOCKED', line: 'The X-ray tech has your back. Open X-ray and he helps all shift.' },
    blurb: 'Shoots an X-ray beam through walls and every germ in its line.',
    lines: {
      arrive: ['Donald, X-ray. Need a film, doc?', 'Lead apron on. I got you.'],
      attack: ['Hold still... and done.', 'Two views, coming up.', "Don't breathe!", 'Clear shot.'],
      clean: ['Clean enough to image.', 'Read: no germs.'],
      block: ['Lead apron on the vent.', 'Restricted area. Germs out.'],
      leave: ['Back to X-ray. Films are piling up.'],
    },
  },
  {
    id: 'selina', name: 'Selina', role: 'FRONT DESK', powerup: 'psrSelina', cost: 15, color: 0xffb3c7, desk: true,
    traineeEligible: true,
    blurb: 'Lines every patient up at the front desk and checks them in fast.',
    lines: {
      arrive: ['Selina, front desk. Everyone, line up please!', 'Okay! Who was here first?'],
      attack: ['Next!', 'Insurance card, please.', 'Have a seat, they’ll call you.', 'Sign here, here and here.'],
      clean: ['Line’s clear. I’m a legend.'],
      leave: ['On break. Don’t touch my desk.'],
      traineeStart: ['Watch how I handle the line. Don’t talk.', 'New PSR shadowing me. Line will be slow.'],
      traineeEnd: ['Orientation over. Back to my desk.', 'Trainee can do their own intake now.'],
    },
  },
  {
    id: 'elaine', name: 'Elaine', role: 'FRONT DESK', powerup: 'psrElaine', cost: 15, color: 0xf8c8dc, desk: true,
    traineeEligible: true,
    blurb: 'Lines every patient up at the front desk and collects their copay. Slower, pays more.',
    lines: {
      arrive: ['Elaine, front desk. Form a line!', 'Hi! Copays are due at check-in.'],
      attack: ['That’ll be your copay.', 'Card or cash?', 'Is this address still current?', 'Next, please!'],
      clean: ['Nobody waiting. Peace and quiet.'],
      leave: ['Lunch. Put a sign up.'],
      traineeStart: ['Copay orientation begins now. Take notes.', 'Shadowing me? Watch how I collect every cent.'],
      traineeEnd: ['Trainee certified. Check-ins back to normal.', 'Done shadowing. Next patient, please!'],
    },
  },
];

export const scribeById = (id: string | undefined): ScribeDef | undefined => SCRIBES.find((s) => s.id === id);

/** The Residency Board's id for an unlocked scribe (kept in progress.owned). */
export const scribeUnlockId = (id: ScribeId): string => `scribe:${id}`;
