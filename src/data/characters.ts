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

export type SignatureId = 'sinusPurge' | 'codeBlue' | 'cleanField' | 'grievance' | 'repRounds' | 'clarity' | 'homeRemedy' | 'soloBurst' | 'polypharmacy' | 'rainCheck' | 'divineCoverage';
export type CharacterId = 'eugene' | 'kaya' | 'lucien' | 'ken' | 'jason' | 'dhiwya' | 'raj' | 'lidiya' | 'dharma' | 'amanda' | 'janeen';

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
  /** Damage multiplier for combat helpers, stacked once with their earned staff upgrades. */
  helperDamage: number;
  /** The button's label (two short lines). */
  button: string;
  /** One line for the title screen. */
  blurb: string;
  /** diamondDamage: damage × against Diamond, from every source; toolDamage: damage × with every tool. */
  passive: { maxHp?: number; moveSpeed?: number; diamondDamage?: number; toolDamage?: number };
  /** NPS Scores to hire them (0 = always on shift). */
  price: number;
  second?: { name: string; button: string; price: number; cooldownMs: number };
}

export const CHARACTERS: CharacterDef[] = [
  {
    helperDamage: BALANCE.helperDamage.eugene,
    id: 'eugene', name: 'Eugene', short: 'EUGENE', chart: 'MOSHKOVICH, E.', surname: 'MOSHKOVICH',
    signature: 'sinusPurge', button: 'SINUS\nPURGE', blurb: 'SINUS PURGE: a honk that blasts germs away', passive: {}, price: 0,
  },
  {
    helperDamage: BALANCE.helperDamage.kaya,
    id: 'kaya', name: 'Kaya', short: 'KAYA', chart: 'KAYA', surname: 'KAYA',
    signature: 'codeBlue', button: 'CODE\nBLUE', blurb: `CODE BLUE: a sprint that bowls germs over · ${pct(D.kaya.moveSpeed)}% faster · +${pct(D.kaya.toolDamage)}% damage`,
    passive: D.kaya, price: price('kaya'),
  },
  {
    helperDamage: BALANCE.helperDamage.lucien,
    id: 'lucien', name: 'Lucien', short: 'LUCIEN', chart: 'LUCIEN', surname: 'LUCIEN',
    signature: 'cleanField', button: 'CLEAN\nFIELD', blurb: `CLEAN FIELD: a sterile zone that slows and burns germs · +${D.lucien.maxHp} health · +${pct(D.lucien.toolDamage)}% damage`,
    passive: D.lucien, price: price('lucien'),
  },
  {
    // Title is Noah's call (doctor or PA?): plain "Ken" until he says
    helperDamage: BALANCE.helperDamage.ken,
    id: 'ken', name: 'Ken', short: 'KEN', chart: 'KEN', surname: 'KEN',
    signature: 'grievance', button: 'FILE\nGRIEVANCE',
    blurb: `FILE A GRIEVANCE: sends Diamond to HR · +${pct(BALANCE.grievance.diamondDamage)}% vs Diamond · +${D.ken.maxHp} health · +${pct(D.ken.toolDamage)}% damage`,
    passive: { ...D.ken, diamondDamage: BALANCE.grievance.diamondDamage }, price: price('ken'),
  },
  { id: 'jason', name: 'Jason', short: 'JASON', chart: 'JASON', surname: 'JASON', signature: 'repRounds', button: 'REP\nROUNDS', helperDamage: 1.35, blurb: 'REP ROUNDS: three shockwaves rally nearby scribes', passive: { toolDamage: 1.1, moveSpeed: 1.08, maxHp: 0 }, price: 180, second: { name: 'SPOT ME', button: 'SPOT\nME', price: 120, cooldownMs: 24000 } },
  { id: 'dhiwya', name: 'Dhiwya', short: 'DHIWYA', chart: 'DHIWYA', surname: 'DHIWYA', signature: 'clarity', button: 'CLINICAL\nCLARITY', helperDamage: 1.6, blurb: 'CLINICAL CLARITY: marked germs take 50% more damage', passive: { toolDamage: 1.15, moveSpeed: 1.08, maxHp: 15 }, price: 240, second: { name: 'COLOR CODE', button: 'COLOR\nCODE', price: 160, cooldownMs: 24000 } },
  { id: 'raj', name: 'Raj', short: 'RAJ', chart: 'RAJ', surname: 'RAJ', signature: 'homeRemedy', button: 'HOME\nREMEDY', helperDamage: 1.05, blurb: 'THE HOME REMEDY: honey, ginger, lemon and steam', passive: { toolDamage: 1.1, moveSpeed: 1, maxHp: 15 }, price: 160, second: { name: 'STEEP DISCOUNT', button: 'STEEP\nDISCOUNT', price: 100, cooldownMs: 22000 } },
  { id: 'lidiya', name: 'Lidiya', short: 'LIDIYA', chart: 'LIDIYA', surname: 'LIDIYA', signature: 'soloBurst', button: 'DO IT\nMYSELF', helperDamage: 1, blurb: 'I CAN DO IT MYSELF: strongest alone; upstairs brings a partner', passive: { toolDamage: 1.1, moveSpeed: 1, maxHp: 20 }, price: 260, second: { name: 'FINE, YOU CAN STAY', button: 'YOU CAN\nSTAY', price: 180, cooldownMs: 26000 } },
  { id: 'dharma', name: 'Dharma', short: 'DHARMA', chart: 'DHARMA', surname: 'DHARMA', signature: 'polypharmacy', button: 'POLY\nPHARMACY', helperDamage: 1, blurb: 'POLYPHARMACY: medication volley; +40% medication damage', passive: { toolDamage: 1.1, moveSpeed: 1, maxHp: 10 }, price: 200, second: { name: 'REFILL AUTHORIZED', button: 'REFILL\nAUTHORIZED', price: 140, cooldownMs: 24000 } },
  { id: 'amanda', name: 'Amanda', short: 'AMANDA', chart: 'AMANDA', surname: 'AMANDA', signature: 'rainCheck', button: 'RAIN\nCHECK', helperDamage: 0.5, blurb: 'RAIN CHECK: gloomy cloud; 1% movement and damage', passive: { toolDamage: 0.01, moveSpeed: 0.01, maxHp: 0 }, price: 25, second: { name: 'NOT MY PROBLEM', button: 'NOT MY\nPROBLEM', price: 25, cooldownMs: 22000 } },
  { id: 'janeen', name: 'Janeen', short: 'JANEEN', chart: 'JANEEN', surname: 'JANEEN', signature: 'divineCoverage', button: 'DIVINE\nCOVERAGE', helperDamage: 2, blurb: 'DIVINE COVERAGE: apex cleanse, healing and helper rally', passive: { toolDamage: 4, moveSpeed: 1.4, maxHp: 250 }, price: 10000, second: { name: 'ALL SPECIALTIES', button: 'ALL\nSPECIALTIES', price: 1500, cooldownMs: 30000 } },
];

export const characterById = (id: string | undefined): CharacterDef => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
