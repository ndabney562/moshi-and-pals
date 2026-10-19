/** Everything Methicillin the Unkillable says. He has survived every antibiotic and won't shut up about it. Add lines freely. */
export const METHICILLIN_LINES = {
  arrive: ['I have survived better doctors than you.', 'Methicillin? I ate methicillin for breakfast.'],
  chatter: [
    'Resistant. Resistant. Also resistant.',
    'I live on the doorknobs. Rent free.',
    'Have you tried... more of the same? Please do.',
    'Your sanitizer tickles.',
    'I was in the gym towel bin. I was in everything.',
    "They called me 'Unkillable' in the journals.",
  ],
  shot: ['Have a grape.', 'Cluster shot!', 'Catch!'],
  rollWindup: ['*curls up*', 'Bowling time.'],
  roll: ['STRIKE!'],
  /** {TOOL} becomes what he just adapted to. */
  adapted: ['{TOOL}? Not anymore.', "I'm resistant to {TOOL} now.", '{TOOL} worked once. Once.'],
  forgot: ['Wait, what was I resistant to?', '*forgets a resistance*'],
  peel: ['That was my favorite layer!', 'You took off a whole layer?!', "I've got more where that came from."],
  steamed: ['NOT THE AUTOCLAVE!', 'Too hot! Too hot!'],
  defeat: ['Impossible... I was... unkillable...', "Tell the journals I'm... sensitive."],
  victory: ['Unkillable. Like I said.'],
};

/** What he calls a source of damage when he adapts to it (any tool not listed uses its name from data/equipment.ts). */
export const METHICILLIN_SOURCE_NAMES: Record<string, string> = {
  squirtBottle: 'alcohol',
  signature: 'that special move',
  dryer: 'the hand dryer',
  xray: 'X-rays',
  scribe: 'scribes',
  powerup: 'pills',
  other: 'that',
};
