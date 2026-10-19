/**
 * THE PALS: the doctors you can play (Noah's call, Oct 2026: the Pals are playable coworkers). Everyone
 * sprays the same tools; what changes is a small passive and the signature move on the big green button.
 * Eugene is always on shift; the others are hired once with NPS Scores (core/progress.ts) and are a bit stronger.
 * Art is drawn in BootScene (texture = id); likenesses follow Noah's reference photos, which stay out of the repo.
 */
import { BALANCE } from '../config/balance';

const D = BALANCE.doctors;
const pct = (m: number) => Math.round((m - 1) * 100);
const price = (id: string) => BALANCE.nps.prices[id] ?? 0;

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
  /** diamondDamage: damage × against Diamond, from every source; toolDamage: damage × with every tool. */
  passive: { maxHp?: number; moveSpeed?: number; diamondDamage?: number; toolDamage?: number };
  /** NPS Scores to hire them (0 = always on shift). */
  price: number;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'eugene', name: 'Dr. Moshkovich', short: 'EUGENE', chart: 'MOSHKOVICH, E.', surname: 'MOSHKOVICH',
    signature: 'sinusPurge', button: 'SINUS\nPURGE', blurb: 'SINUS PURGE: a honk that blasts germs away', passive: {}, price: 0,
  },
  {
    id: 'kaya', name: 'Dr. Kaya', short: 'KAYA', chart: 'KAYA, DR.', surname: 'KAYA',
    signature: 'codeBlue', button: 'CODE\nBLUE', blurb: `CODE BLUE: a sprint that bowls germs over · ${pct(D.kaya.moveSpeed)}% faster · +${pct(D.kaya.toolDamage)}% damage`,
    passive: D.kaya, price: price('kaya'),
  },
  {
    id: 'lucien', name: 'PA Lucien', short: 'LUCIEN', chart: 'LUCIEN, PA', surname: 'LUCIEN',
    signature: 'cleanField', button: 'CLEAN\nFIELD', blurb: `CLEAN FIELD: a sterile zone that slows and burns germs · +${D.lucien.maxHp} health · +${pct(D.lucien.toolDamage)}% damage`,
    passive: D.lucien, price: price('lucien'),
  },
  {
    // Title is Noah's call (doctor or PA?): plain "Ken" until he says
    id: 'ken', name: 'Ken', short: 'KEN', chart: 'KEN', surname: 'KEN',
    signature: 'grievance', button: 'FILE\nGRIEVANCE',
    blurb: `FILE A GRIEVANCE: sends Diamond to HR · +${pct(BALANCE.grievance.diamondDamage)}% vs Diamond · +${D.ken.maxHp} health · +${pct(D.ken.toolDamage)}% damage`,
    passive: { ...D.ken, diamondDamage: BALANCE.grievance.diamondDamage }, price: price('ken'),
  },
];

export const characterById = (id: string | undefined): CharacterDef => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
