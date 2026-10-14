/**
 * VENDING MACHINE snacks: small run-long perks bought in the waiting room. Each can be bought once per run,
 * and only `BALANCE.vending.maxPerRun` in all (it's a vending machine, not a pharmacy).
 */
export type SnackEffect = 'maxHp' | 'speed' | 'refill' | 'purge' | 'crit';

export interface SnackDef {
  id: string;
  name: string;
  blurb: string;
  price: number;
  color: number;
  effect: SnackEffect;
  /** maxHp: + health. speed: walk ×. refill: pour time ×. purge: cooldown ×. crit: STAT! chance ×. */
  amount: number;
}

export const SNACKS: SnackDef[] = [
  { id: 'proteinBar', name: 'Protein Bar', blurb: 'Max health +25. Tastes like chalk and ambition.', price: 150, color: 0xa1887f, effect: 'maxHp', amount: 25 },
  { id: 'energyDrink', name: 'Energy Drink', blurb: 'Walk 12% faster. Heart rate: also faster.', price: 150, color: 0x76ff03, effect: 'speed', amount: 1.12 },
  { id: 'coldBrew', name: 'Cold Brew', blurb: 'Refills pour 30% faster. Hands: slightly shakier.', price: 120, color: 0x6d4c41, effect: 'refill', amount: 0.7 },
  { id: 'lozenge', name: 'Menthol Lozenge', blurb: 'Sinus Purge recharges 25% faster.', price: 120, color: 0x80cbc4, effect: 'purge', amount: 0.75 },
  { id: 'fortuneCookie', name: 'Fortune Cookie', blurb: '"You will crit." Twice the STAT! chance.', price: 100, color: 0xffcc80, effect: 'crit', amount: 2 },
];
