/**
 * THE PALS: the doctors you can play (Noah's call, Oct 2026: the Pals are playable coworkers). Everyone
 * sprays the same tools; what changes is a small passive and the signature move on the big green button.
 * Art is drawn in BootScene (texture = id); likenesses follow Noah's reference photos, which stay out of the repo.
 */
export type SignatureId = 'sinusPurge' | 'codeBlue' | 'cleanField';

export interface CharacterDef {
  id: 'eugene' | 'kaya' | 'lucien';
  /** As the HUD and the title screen show it. */
  name: string;
  /** Health bar label. */
  short: string;
  /** Discharge Summary line ("PATIENT: ..."), and what Diamond yells. */
  chart: string;
  surname: string;
  signature: SignatureId;
  /** The button's label (two short lines). */
  button: string;
  /** One line for the title screen. */
  blurb: string;
  passive: { maxHp?: number; moveSpeed?: number };
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'eugene', name: 'Dr. Moshkovich', short: 'EUGENE', chart: 'MOSHKOVICH, E.', surname: 'MOSHKOVICH',
    signature: 'sinusPurge', button: 'SINUS\nPURGE', blurb: 'SINUS PURGE: a honk that blasts germs away', passive: {},
  },
  {
    id: 'kaya', name: 'Dr. Kaya', short: 'KAYA', chart: 'KAYA, DR.', surname: 'KAYA',
    signature: 'codeBlue', button: 'CODE\nBLUE', blurb: 'CODE BLUE: a sprint that bowls germs over · 8% faster', passive: { moveSpeed: 1.08 },
  },
  {
    id: 'lucien', name: 'PA Lucien', short: 'LUCIEN', chart: 'LUCIEN, PA', surname: 'LUCIEN',
    signature: 'cleanField', button: 'CLEAN\nFIELD', blurb: 'CLEAN FIELD: a sterile zone that slows and burns germs · +20 health', passive: { maxHp: 20 },
  },
];

export const characterById = (id: string | undefined): CharacterDef => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
