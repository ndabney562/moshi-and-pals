/**
 * CALL-OUT REASONS (Noah, Oct 2026): why a helper isn't in today, shown when the doctor opens the room they'd have
 * waited in. One pool per doctor on shift (the reason is about working with them). `{name}` is the helper's name.
 * Jokes, not real absences. Odds live in BALANCE.attendance.
 */
export const CALL_OUT_REASONS: Record<string, string[]> = {
  eugene: [
    'Called out. The HONK reached their apartment.',
    'Called out. Still recovering from last shift\'s Sinus Purge.',
    'Called out. Left a voicemail that was just a long sigh.',
    'Called out. Could not face another lecture on proper glove technique.',
  ],
  kaya: [
    'Called out. Heard it was going to be an "ER doc" kind of day.',
    'Called out. Legs still sore from chasing Kaya\'s CODE BLUE.',
    'Called out. Says urgent care is not that urgent.',
    'Called out. Doing a rapid assessment of their couch.',
  ],
  lucien: [
    'At a conference. Lucien said it was a teaching opportunity.',
    'Out today. Lucien told them to take care of themselves, and they listened.',
    'Called out. Sent Lucien a thank-you card anyway.',
    'Called out. Already learned everything Lucien taught yesterday.',
  ],
  ken: [
    'Avoiding Diamond. Ken understands.',
    'Called out. Filed a grievance about mornings.',
    'Called out. Ken already approved it.',
    'Out today. Ken says it\'s in the handbook somewhere.',
  ],
  jason: [
    'Called out. Leg day. Jason respects it.',
    'Out today. Up all night catching a rare one.',
    'Called out. Still sore from Jason\'s "quick warm-up."',
    'Called out. Jason says rest days are part of the program.',
  ],
  dhiwya: [
    'Out sick. Really sick. Nobody calls out on Dhiwya otherwise.',
    'Called out. Felt terrible about it. Sent Dhiwya flowers.',
    'Called out. Promised Dhiwya double the charts tomorrow.',
    'Called out. Couldn\'t find scrubs that matched Dhiwya\'s today.',
  ],
  raj: [
    'Called out. Trying Raj\'s honey-ginger-lemon cure at home.',
    'Called out. The tea needs another minute.',
    'Called out. Steeping.',
    'Out today. Ran out of ginger.',
  ],
  lidiya: [
    'Called out. Lidiya said she can do it herself.',
    'Out today. Lidiya didn\'t notice.',
    'Called out. Lidiya said, "Good. More for me."',
    'Called out. Didn\'t want to get in Lidiya\'s way.',
  ],
  dharma: [
    'Called out. Read the side effects list. All of it.',
    'Out today. Treating it with natural remedies. Dharma disapproves.',
    'Called out. Prior authorization for showing up was denied.',
    'Called out. Reacted to something Dharma prescribed. Probably fine.',
  ],
  amanda: [
    'Called out. Amanda\'s mood reached the parking lot.',
    'Called out. Said "what\'s the point." Amanda agreed.',
    'Out today. It was raining. Only over this clinic.',
    'Called out. Amanda called out too, in spirit.',
  ],
  janeen: [
    'Out sick. The only thing that keeps anyone from working with Janeen.',
    'Excused absence. Janeen excused it before they asked.',
    'Called out. Will be thinking about Janeen all day.',
    'Called out. Too starstruck to come in.',
  ],
};

/** For a doctor without their own pool. */
export const CALL_OUT_FALLBACK = ['Called out. No reason given.', 'Called out. Left a sticky note on the door.'];
