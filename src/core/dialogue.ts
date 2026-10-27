import type { CharacterId } from '../data/characters';
import type { ViolationDef } from '../data/patients';

/** Keep approved Pal voices together, with Eugene's response as the content fallback. */
export function reactionLines(violation: ViolationDef, doctor: CharacterId = 'eugene'): readonly string[] {
  const own = violation[doctor];
  if (own?.length) return own;
  const voices: Partial<Record<CharacterId, readonly string[]>> = {
    jason: ['One clean rep. Wash those hands!', 'My scribes deserve a clean clinic.'],
    dhiwya: ['We can fix this. Start with hand hygiene.', 'Small change, better outcome.'],
    raj: ['A little less coughing in the tea, please.', 'Honey, ginger, lemon. And clean hands.'],
    lidiya: ['I have to do everything myself.', 'Wash your hands. I already told you.'],
    dharma: ['The prescription includes washing your hands.', 'I have a medication for the germs. You need soap.'],
    amanda: ['That looks like more work for me.', 'Could you cough somewhere else?'],
    janeen: ['I have this covered. Please wash your hands.', 'Every specialty. Every patient. Clean hands first.'],
  };
  return voices[doctor] ?? violation.eugene;
}

/** Named placeholders are replaced consistently without changing approved jokes. */
export function dialogueText(text: string, tokens: Readonly<Record<string, string>>): string {
  return text.replace(/\{([A-Z_]+)\}/g, (original, key: string) => tokens[key] ?? original);
}
