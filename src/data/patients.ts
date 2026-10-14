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
  /** Dr. Kaya's and PA Lucien's own reactions (if missing, they say Eugene's). */
  kaya?: string[];
  lucien?: string[];
  /** Germs let loose by each violation. */
  germId: string;
  germs: number;
  /** Shirt and hair colors for the placeholder art. */
  shirt: number;
  hair: number;
}

/** What a violator says once they're sprayed into compliance and head home. */
export const CLEANED_LINES = ['Okay, okay! Sorry, doc!', "Fine! I'll wash my hands!", "I get it! I'm going!"];

export const VIOLATIONS: ViolationDef[] = [
  { id: 'cougher', action: '*COUGH COUGH*', eugene: ['Elbow! ELBOW!', 'Cover your mouth!'], germId: 'sprinter', germs: 1, shirt: 0xe76f51, hair: 0x3b2417 },
  { id: 'chinMask', action: '*mask under nose*', eugene: ['That is a chin hammock.', 'The nose goes INSIDE the mask.'], germId: 'basic', germs: 1, shirt: 0x2a9d8f, hair: 0x111111 },
  { id: 'snacker', action: '*crunch* *touches everything*', eugene: ['Not with the chip fingers!', 'This is a clinic, not a food court!'], germId: 'basic', germs: 1, shirt: 0xf4a261, hair: 0x7a4b2a },
  { id: 'sanitizerSkipper', action: '*walks right past the sanitizer*', eugene: ['The dispenser is RIGHT THERE.', 'It is free! It is FREE!'], germId: 'basic', germs: 1, shirt: 0x8ab17d, hair: 0xd9b26f },
  { id: 'penChewer', action: '*chews the pen, puts it back*', eugene: ['Someone else has to use that pen!', 'That pen is now a biohazard.'], germId: 'basic', germs: 1, shirt: 0x6d6875, hair: 0x2b2b2b },
  { id: 'shoeRemover', action: '*takes shoes off*', eugene: ['Put. Them. Back. On.', 'Why are your socks wet?!'], germId: 'basic', germs: 1, shirt: 0xb5838d, hair: 0x5c3d2e },
  { id: 'phoneLicker', action: '*licks finger, scrolls*', eugene: ['Did you just lick your phone?', 'I saw that. I will never unsee that.'], germId: 'sprinter', germs: 1, shirt: 0x457b9d, hair: 0x1d1d1d },
  { id: 'wholeFamily', action: 'I brought the whole family!', eugene: ['Why are there five of you?!', 'Only the sick one needs to be here!'], germId: 'basic', germs: 2, shirt: 0xe9c46a, hair: 0x6b3e26 },
];
