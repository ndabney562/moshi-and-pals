/**
 * Patients who wander into the waiting room (Noah's idea). They are obstacles,
 * and every so often they commit a health code violation that lets germs in.
 * Spray a violator enough and they clean up their act and leave.
 * Add violations freely: each one is a patient type.
 */
export interface ViolationDef {
  id: string;
  /** What the patient does, shown in their speech bubble. */
  action: string;
  /** Dr. Moshkovich's reaction; one is picked at random. Also used for anyone without their own lines. */
  eugene: string[];
  /**
   * Each Pal's own reactions, in their voice (Noah's personality notes, Oct 2026):
   * Kaya is laid-back, works out, quit weed, reminds everyone he's an "ER doc" and prescribes
   * prednisone + Afrin + Z-Pak + saline for everything. Lucien laughs a lot, turns everything into a lesson for
   * patients and scribes, and diagnoses MTA workers with "MTAitis". Ken is a plastic surgeon who smokes, hates
   * Diamond, loves the scribes and guaifenesin, and finds the patients fucking ridiculous.
   */
  kaya: string[];
  lucien: string[];
  ken: string[];
  /** Germs let loose by each violation. */
  germId: string;
  germs: number;
  /** Shirt and hair colors for the placeholder art. */
  shirt: number;
  hair: number;
}

/** What a violator says once they're sprayed into compliance and head home. */
/** What patients in line at the front desk say (Selina and Elaine, systems/FrontDesk.ts). */
export const WAIT_COMPLAINTS = [
  "I've been here since NINE.", 'The sign said 15 minutes!', 'Is the doctor even IN today?', 'Google said no wait!',
  "I'm leaving a review.", 'I was here before HIM.', 'My appointment was at two!', 'Do you know who I am?',
  'Can I just get a Z-Pak?', 'My parking meter is running!', 'Why is HE going first?', 'This is urgent care. URGENT.',
];
export const CHECKED_IN_LINES = ['FINALLY.', 'About time!', 'Was that so hard?', "I'm still leaving a review."];

export const CLEANED_LINES = ['Okay, okay! Sorry, doc!', "Fine! I'll wash my hands!", "I get it! I'm going!"];

export const VIOLATIONS: ViolationDef[] = [
  {
    id: 'cougher', action: '*COUGH COUGH*',
    eugene: ['Elbow! ELBOW!', 'Cover your mouth!'],
    kaya: ['Prednisone, Afrin, Z-Pak, saline. Next!', "Elbow, bro. Trust me, I'm an ER doc.", 'I quit smoking. You can quit coughing.'],
    lucien: ['Hahaha! Into the ELBOW, my friend!', 'Lesson one: droplets fly six feet!', 'Teaching moment! Cough into your sleeve!'],
    ken: ['That cough is fucking ridiculous.', 'Guaifenesin. Now. Loosen that up.', 'I smoke a pack a day and cough less.'],
    germId: 'sprinter', germs: 1, shirt: 0xe76f51, hair: 0x3b2417,
  },
  {
    id: 'chinMask', action: '*mask under nose*',
    eugene: ['That is a chin hammock.', 'The nose goes INSIDE the mask.'],
    kaya: ['Mask up, bro. Nose included.', "I'm an ER doc. The nose goes INSIDE.", 'Chill. Just pull it up. Deep breaths.'],
    lucien: ['Hahaha! The nose is part of the face!', 'Anatomy lesson: nostrils. Cover them.', 'Teaching moment: the nose breathes too!'],
    ken: ['A chin mask. Fucking ridiculous.', 'I sculpt noses for a living. Cover yours.', 'That nose needs a mask, not a surgeon.'],
    germId: 'basic', germs: 1, shirt: 0x2a9d8f, hair: 0x111111,
  },
  {
    id: 'snacker', action: '*crunch* *touches everything*',
    eugene: ['Not with the chip fingers!', 'This is a clinic, not a food court!'],
    kaya: ['Bro. Protein shakes only in here.', 'Chip fingers? Not in MY ER.', 'I used to get the munchies too. Wash up.'],
    lucien: ['Hahaha! Hands first, chips second!', 'Let me teach you: wash, THEN snack.', 'Omar, write this down: chip fingers.'],
    ken: ['Chip dust on my clipboard. Fucking ridiculous.', 'I need a smoke break after this.', 'Not even Diamond eats like that.'],
    germId: 'basic', germs: 1, shirt: 0xf4a261, hair: 0x7a4b2a,
  },
  {
    id: 'sanitizerSkipper', action: '*walks right past the sanitizer*',
    eugene: ['The dispenser is RIGHT THERE.', 'It is free! It is FREE!'],
    kaya: ['Pump it like a protein scoop, bro.', 'Twenty seconds. Like a plank. Go!', "I'm an ER doc. USE THE PUMP."],
    lucien: ['Hahaha! It is free! Like my lessons!', 'Palms, backs, thumbs, fingertips. Again!', 'Alan, note it: walked past sanitizer.'],
    ken: ["It's RIGHT there. Fucking ridiculous.", "I'd go smoke, but someone has to watch you.", 'Omar, Alan, document this nonsense.'],
    germId: 'basic', germs: 1, shirt: 0x8ab17d, hair: 0xd9b26f,
  },
  {
    id: 'penChewer', action: '*chews the pen, puts it back*',
    eugene: ['Someone else has to use that pen!', 'That pen is now a biohazard.'],
    kaya: ["Keep the pen, bro. It's yours now.", 'I kicked my old habit. Kick the pen.', "I'm an ER doc. That pen is evidence."],
    lucien: ['Hahaha! Pens are not food, my friend!', 'Lesson: that pen has more germs than a toilet.', 'Scribes, gather round. Never do this.'],
    ken: ['You ate the pen. Fucking ridiculous.', 'Chew a cigarette like a normal person.', 'Alan, get me a new pen. And a lighter.'],
    germId: 'basic', germs: 1, shirt: 0x6d6875, hair: 0x2b2b2b,
  },
  {
    id: 'shoeRemover', action: '*takes shoes off*',
    eugene: ['Put. Them. Back. On.', 'Why are your socks wet?!'],
    kaya: ["Shoes on, bro. This isn't the gym.", 'Foot fungus is not leg day.', 'Even my locker room has rules.'],
    lucien: ['Hahaha! No! Shoes ON! Hahaha!', "Teaching moment: athlete's foot spreads!", 'Omar, chart it: patient removed shoes.'],
    ken: ['Bare feet. Fucking ridiculous.', 'I fix faces, not feet. Shoes ON.', 'I need a cigarette to cover that smell.'],
    germId: 'basic', germs: 1, shirt: 0xb5838d, hair: 0x5c3d2e,
  },
  {
    id: 'phoneLicker', action: '*licks finger, scrolls*',
    eugene: ['Did you just lick your phone?', 'I saw that. I will never unsee that.'],
    kaya: ['Prednisone, Afrin, Z-Pak, saline. And SOAP.', "Bro. I'm an ER doc. That's gross.", 'Easy, man. Wash up. Breathe.'],
    lucien: ['Hahaha! Your phone is dirtier than the toilet!', 'Lesson: phones carry ten times the germs!', 'Scribes, look! This is what NOT to do.'],
    ken: ['Licking the phone. Fucking ridiculous.', 'I need a smoke. Maybe two.', "Guaifenesin can't fix THAT."],
    germId: 'sprinter', germs: 1, shirt: 0x457b9d, hair: 0x1d1d1d,
  },
  {
    id: 'wholeFamily', action: 'I brought the whole family!',
    eugene: ['Why are there five of you?!', 'Only the sick one needs to be here!'],
    kaya: ['Prednisone, Afrin, Z-Pak, saline. Times five.', "I'm an ER doc, bro, not a daycare.", 'Chill. One at a time. Deep breaths.'],
    lucien: ['Hahaha! Five people for one sniffle!', 'Lesson: only the sick one comes in.', 'Gather round, family. Class is in session!'],
    ken: ['FIVE of you? Fucking ridiculous.', 'Guaifenesin for everybody. Go home.', "Run before Diamond bills all five of you."],
    germId: 'basic', germs: 2, shirt: 0xe9c46a, hair: 0x6b3e26,
  },
  {
    // Lucien's running joke (Noah): MTA workers and their "MTAitis" (diarrhea). Orange safety vest.
    id: 'mtaWorker', action: "*MTA vest* Where's the bathroom?! HURRY!",
    eugene: ['The bathroom is THAT way! RUN!', 'Wash your hands after! PLEASE!'],
    kaya: ['Prednisone, Afrin, Z-Pak... and Imodium.', "I'm an ER doc. I've seen this. RUN.", 'Hydrate, bro. Electrolytes.'],
    lucien: ['Hahaha! MTAitis strikes again!', 'Classic MTAitis! Wash your hands after!', 'Teaching moment: MTAitis is contagious!'],
    ken: ['MTAitis again? Fucking ridiculous.', "Use the one by Diamond's office.", "Not the one by my smoking spot!"],
    germId: 'basic', germs: 2, shirt: 0xff7a1a, hair: 0x2b2b2b,
  },
];
