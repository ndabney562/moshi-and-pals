import type { CharacterId } from '../data/characters';
import type { ViolationDef } from '../data/patients';

/** Keep approved Pal voices together, with Eugene's response as the content fallback. */
export function reactionLines(violation: ViolationDef, doctor: CharacterId = 'eugene'): readonly string[] {
  const own = violation[doctor];
  return own?.length ? own : violation.eugene;
}

/** Named placeholders are replaced consistently without changing approved jokes. */
export function dialogueText(text: string, tokens: Readonly<Record<string, string>>): string {
  return text.replace(/\{([A-Z_]+)\}/g, (original, key: string) => tokens[key] ?? original);
}
