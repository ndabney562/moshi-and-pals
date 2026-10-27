/**
 * VENDING MACHINE snacks: small run-long perks bought in the waiting room. No limit: they stack, a repeat
 * costs more each time, and the stacked perks stop at `BALANCE.vending.caps`.
 */
export type SnackEffect = 'maxHp' | 'speed' | 'refill' | 'purge' | 'crit' | 'ingredient';

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
  { id: 'lozenge', name: 'Menthol Lozenge', blurb: 'Your signature move recharges 25% faster.', price: 120, color: 0x80cbc4, effect: 'purge', amount: 0.75 },
  { id: 'fortuneCookie', name: 'Fortune Cookie', blurb: '"You will crit." Twice the STAT! chance.', price: 100, color: 0xffcc80, effect: 'crit', amount: 2 },
];

/** Raj-only purchases; each restores five seconds of first-signature charge. */
export const RAJ_SNACKS: SnackDef[] = [
  { id: 'honey', name: 'Honey', blurb: 'Sticky slowing field; recharge 5 seconds.', price: 65, color: 0xeab94f, effect: 'ingredient', amount: 1 },
  { id: 'ginger', name: 'Ginger', blurb: 'Knockback burst; recharge 5 seconds.', price: 65, color: 0xf2aa73, effect: 'ingredient', amount: 1 },
  { id: 'lemon', name: 'Lemon', blurb: 'Five ricochets; recharge 5 seconds.', price: 75, color: 0xffef75, effect: 'ingredient', amount: 1 },
  { id: 'tea', name: 'Tea', blurb: 'Damaging steam; recharge 5 seconds.', price: 65, color: 0xb7e0d3, effect: 'ingredient', amount: 1 },
];
