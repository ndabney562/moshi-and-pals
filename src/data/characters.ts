/**
 * THE PALS: the doctors you can play (Noah's call, Oct 2026: the Pals are playable coworkers). Everyone
 * sprays the same tools; what changes is a small passive and the signature move on the big green button.
 * Art is drawn in BootScene (texture = id); likenesses follow Noah's reference photos, which stay out of the repo.
 */
import { BALANCE } from '../config/balance';

export type SignatureId = 'sinusPurge' | 'codeBlue' | 'cleanField' | 'grievance';
export type CharacterId = 'eugene' | 'kaya' | 'lucien' | 'ken';

export interface CharacterDef {
  id: CharacterId;
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
  /** diamondDamage: damage × against Diamond, from every source. */
  passive: { maxHp?: number; moveSpeed?: number; diamondDamage?: number };
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
  {
    // Title is Noah's call (doctor or PA?): plain "Ken" until he says
    id: 'ken', name: 'Ken', short: 'KEN', chart: 'KEN', surname: 'KEN',
    signature: 'grievance', button: 'FILE\nGRIEVANCE', blurb: `FILE A GRIEVANCE: paperwork blast, sends Diamond to HR · +${Math.round((BALANCE.grievance.diamondDamage - 1) * 100)}% vs Diamond`,
    passive: { diamondDamage: BALANCE.grievance.diamondDamage },
  },
];

export const characterById = (id: string | undefined): CharacterDef => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
