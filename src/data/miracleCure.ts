/**
 * THE MIRACLE CURE: the secret quest's words (logic in systems/MiracleCure.ts, numbers in BALANCE.miracleCure).
 *   1. Read the 2009 magazine on the waiting-room table during a break: the IONIZER 9000 ad, half a number.
 *   2. Call it from the front desk during a round and stay on hold: the operator gives code half A.
 *   3. Microwave a fish in the manager's office: in the stench, the note behind the fridge gives half B.
 *   4. X-ray the building: the film shows a key in the vending machine, slot B4. Buy it.
 *   5. Flush Stall 3 three times during a boss round: RECORDS. Key + code opens it.
 *   6. The Records Room: the Last Fax Machine, and the Ionizer 9000. Then survive one more boss round and clock out.
 */

/** What the old magazines say when there's nothing more to find. */
export const MAGAZINE_HEADLINES = [
  'WAITING ROOM WEEKLY, March 2009: "Is Your Pager Ruining Your Marriage?"',
  'HEALTHY YOU, 2009: "Ten Superfoods (Number 4 Is Bread)"',
  'WAITING ROOM WEEKLY: "Swine Flu: Should You Be Worried? (Yes)"',
  'GOLF DIGEST, 2008. Someone did the crossword in pen. Wrong.',
  'PARENTING TODAY: "Is It Croup? A Quiz." The quiz is torn out.',
];

export const MAGAZINE_AD = {
  title: 'IONIZER 9000!',
  /** `${number}` is the half they can read. */
  line: (half: string) => `"Ionizes 99.9% of everything!" CALL NOW: 1-800-${half}-.... (the rest is a coffee ring)`,
  /** Read during a round: no time. */
  busy: 'No time to read. There is a round on.',
};

export const PHONE = {
  dial: 'Dialing 1-800-IONIZER...',
  hold: ['♪ Your call is important to us ♪', '♪ Please continue to hold ♪', '♪ smooth jazz intensifies ♪', '♪ A representative will be with you shortly ♪'],
  dropped: 'Line dropped. You walked away. They noticed.',
  roundOver: 'The hold music stopped. Call during a round, while it is busy.',
  operator: (code: string) => `OPERATOR: "Ionizer 9000 Customer Care. Your access code begins ${code}. The rest is on file, behind the fridge."`,
  notNow: 'Lines are only open during a round (it is always busy then).',
};

export const FISH = {
  zap: 'You microwaved a fish. In the office microwave. Diamond will hear about this.',
  stench: 'THE SMELL',
  fridgeNote: (code: string) => `Sticky note behind the fridge, now readable through the steam: "IONIZER CODE, PART 2: ${code}. Key's in the snack machine. Ask Radiology."`,
  fridgeLocked: "DIAMOND'S. LABELED. DO NOT TOUCH.",
  fridgeHint: 'Something is stuck behind the fridge. Too dark to read.',
};

export const XRAY_FILM = {
  title: 'IMAGING: INCIDENTAL FINDING',
  line: 'The pulse went right through the snack machine. There is a key in slot B4.',
};

export const KEY = {
  id: 'mysteryKey',
  name: 'B4: Mystery Key',
  blurb: 'Expired 2011. Opens something. Not the snack drawer.',
  got: 'MYSTERY KEY (EXPIRED 2011)',
};

export const STALL = {
  flush: ['FLUSH', 'FWOOSH', 'GLUG GLUG', 'It is still running', 'Someone left a magazine in here'],
  click: (n: number) => `*click* (${n}/3)`,
  locked: 'A panel marked RECORDS. It needs a key and a code.',
  open: { title: 'RECORDS', line: 'A panel slid open behind Stall 3. Key + code: the Records Room is open between rounds.' },
  betweenRounds: 'Not now. The Records Room is for between rounds.',
};

export const RECORDS = {
  enter: { title: 'THE RECORDS ROOM', line: 'Every chart since 1997. And something still plugged in.' },
  leave: 'BACK TO WORK',
  locked: 'The door sticks. Something in here is still transmitting.',
  ionizer: { title: 'THE IONIZER 9000', line: 'The Miracle Cure. Survive one more boss round, then clock out at the front door.' },
  clockOutReady: { title: 'YOU CAN CLOCK OUT', line: 'Shift covered. The front door is open. For once.' },
};

/** The Last Fax Machine's lines. */
export const FAX_LINES = {
  arrive: ['BEEEEP. KRRRSSSHHHH.', 'WHO TOUCHED THE RECORDS.', 'I HAVE BEEN ON SINCE 1997.'],
  fax: ['INCOMING FAX.', 'THIS CONFIRMS YOUR FAX.', 'COVER SHEET MISSING.', 'PLEASE SIGN AND FAX BACK.', 'PRIOR AUTH DENIED. FAXING REASONS.'],
  screech: 'EEEEEE-KRRRRR-BWEEEEEE',
  jam: 'PAPER JAM. PAPER JAM. PAPER JAM.',
  defeated: 'TRANSMISSION... COMPLETE...',
};

/** The alternate ending's credits roll. */
export const CREDITS: string[] = [
  'SHIFT COMPLETE',
  '',
  'Eugene clocked out.',
  'Nobody called him back in.',
  '',
  'MOSHI AND PALS',
  'Created by Noah',
  '',
  'Kaya · Lucien · Ken',
  'Omar and Alan, scribes',
  'Diamond, Practice Manager (unfortunately)',
  '',
  'The Last Fax Machine',
  '1997 – today',
  '',
  'No germs were harmed in the making of this game.',
  'That is a lie. Millions were.',
  '',
  'Unlocked: Eugene\'s scrub cap',
];
