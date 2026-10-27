import type { CharacterId } from '../data/characters';
import type { Germ } from '../entities/Germ';

export const PROVIDER_COOLDOWNS: Partial<Record<CharacterId, number>> = {
  jason: 18000, dhiwya: 18000, raj: 16000, lidiya: 18000, dharma: 16000, amanda: 20000, janeen: 28000,
};
export const INGREDIENTS = ['honey', 'ginger', 'lemon', 'tea'] as const;
export type Ingredient = typeof INGREDIENTS[number];
export interface AbilityHost {
  id: CharacterId;
  player: { x: number; y: number; rotation: number };
  /** Living, same-floor targets with an unobstructed line from the provider. */
  targets(): Germ[];
  damage(g: Germ, amount: number, knockback?: number): void;
  pulse(x: number, y: number, radius: number, color: number, label?: string): void;
  field?(x: number, y: number, radius: number, color: number): void;
  beam(x: number, y: number, toX: number, toY: number, color: number): void;
  heal(amount: number): void;
  guard(ms: number): void;
  rally(time: number, ms: number, power: number, speed: number, recall: boolean): void;
  helpers(): number;
  companion(): boolean;
  joint(time: number, damage: number): void;
  refill(fraction: number): void;
  recharge(ms: number): void;
}
interface Zone { x: number; y: number; radius: number; until: number; start: number; dps: number; slow: number; color: number; decoy?: boolean; }

/** All temporary effects use paused game time; destroyed with the owning shift. */
export class ProviderAbilities {
  private zones: Zone[] = [];
  private pulses: { at: number; damage: number; radius: number; color: number }[] = [];
  private marks = new Map<Germ, { until: number; life: number }>();
  private boostUntil = 0;
  private boostKind = '';
  private nextComplaint = 12000;
  private previousCrew = 0;
  ingredient: Ingredient = 'tea';
  readonly pantry: Record<Ingredient, number> = { honey: 0, ginger: 0, lemon: 0, tea: 0 };
  constructor(private readonly host: AbilityHost, readonly scrubColor = 0) {}

  get firstCooldown(): number { return PROVIDER_COOLDOWNS[this.host.id] ?? 18000; }
  private nearby(radius: number, x = this.host.player.x, y = this.host.player.y): Germ[] {
    return this.host.targets().filter(g => (g.x - x) ** 2 + (g.y - y) ** 2 <= (radius + g.def.radius) ** 2);
  }
  private burst(damage: number, radius: number, color: number, label?: string, knockback = 160): void {
    const { x, y } = this.host.player;
    this.host.pulse(x, y, radius, color, label);
    for (const g of this.nearby(radius)) this.host.damage(g, damage * this.soloPower(), knockback);
  }
  /** The companion is deliberately exempt from the crew penalty; PSRs count while present. */
  soloPower(): number {
    if (this.host.id !== 'lidiya') return 1;
    return Math.max(0.65, 1.6 - this.host.helpers() * 0.15) * (this.host.companion() ? 2 : 1);
  }
  toolPower(time: number, medication: boolean): number {
    return this.soloPower() * (this.host.id === 'dharma' && medication ? 1.4 : 1)
      * (this.boostKind === 'power' && time < this.boostUntil ? 1.35 : 1);
  }
  rate(time: number, medication: boolean): number {
    return time < this.boostUntil && (this.boostKind === 'rate' || this.boostKind === 'medication' && medication) ? 1.5 : 1;
  }
  movement(time: number): number { return this.boostKind === 'movement' && time < this.boostUntil ? 1.3 : 1; }
  incoming(g: Germ, time: number): number { const m=this.marks.get(g); return m && m.life === g.spawnVersion && m.until > time ? 1.5 : 1; }
  ingredientBought(id: string, recharge = true): void {
    if (!INGREDIENTS.includes(id as Ingredient) || this.host.id !== 'raj') return;
    this.ingredient = id as Ingredient;
    this.pantry[this.ingredient]++;
    if (recharge) this.host.recharge(5000);
  }
  save(): { pantry: number[]; ingredient: number } { return { pantry: INGREDIENTS.map(id=>this.pantry[id]), ingredient: INGREDIENTS.indexOf(this.ingredient) }; }
  restore(value: { pantry: number[]; ingredient: number }): void {
    INGREDIENTS.forEach((id,i)=>{this.pantry[id]=Math.max(0,Math.min(1000,Math.floor(value.pantry[i] ?? 0)));});
    this.ingredient=INGREDIENTS[value.ingredient] ?? 'tea';
  }
  first(time: number): void {
    const h = this.host;
    switch (h.id) {
      case 'jason':
        this.burst(28, 185, 0xe5a1b7, 'REP ROUNDS!');
        this.pulses.push({ at: time + 450, damage: 28, radius: 185, color: 0xe5a1b7 }, { at: time + 900, damage: 28, radius: 185, color: 0xe5a1b7 });
        h.rally(time, 5000, 1, 1.35, false); break;
      case 'dhiwya':
        for (const g of this.nearby(440).sort((a,b) => b.hp - a.hp).slice(0, 8)) {
          this.marks.set(g, {until: time + 6500, life: g.spawnVersion}); h.pulse(g.x, g.y, g.def.radius + 12, 0x74e9dc);
        }
        h.pulse(h.player.x, h.player.y, 160, 0x74e9dc, 'CLINICAL CLARITY · +50%'); break;
      case 'raj': this.remedy(this.ingredient, time, 1); break;
      case 'lidiya': this.burst(66, 220, 0xc9b4dc, 'I CAN DO IT MYSELF!'); break;
      case 'dharma': this.volley(time); break;
      case 'amanda': this.zone(time, 7000, 175, 1, 0.35, 0x9babc9, 'RAIN CHECK.'); break;
      case 'janeen':
        this.burst(240, 420, 0xffe6a1, 'DIVINE COVERAGE!'); h.heal(80); h.rally(time, 6500, 1.5, 1.5, true); break;
    }
  }
  second(time: number): void {
    const h = this.host;
    switch (h.id) {
      case 'jason': h.rally(time, 7000, 1.25, 1.5, true); this.burst(20, 160, 0xe5a1b7, 'SPOT ME!'); break;
      case 'dhiwya': {
        this.boostKind = ['power', 'rate', 'movement'][this.scrubColor % 3]; this.boostUntil = time + 8000;
        h.rally(time, 8000, this.boostKind === 'power' ? 1.35 : 1, this.boostKind === 'rate' ? 1.5 : 1, false);
        h.pulse(h.player.x, h.player.y, 190, [0x74e9dc, 0xcb9ceb, 0xffbd87][this.scrubColor % 3], `COLOR CODE · ${this.boostKind.toUpperCase()}`); break;
      }
      case 'raj': {
        const available = INGREDIENTS.filter(id => this.pantry[id] > 0);
        if (!available.length) { this.remedy('tea', time, 1.1); break; }
        for (const id of available) { this.pantry[id]--; this.remedy(id, time, 1.2); }
        h.recharge(Math.min(12000, available.length * 3000)); break;
      }
      case 'lidiya':
        this.burst(h.companion() ? 70 : 45, 250, 0xc9b4dc, h.companion() ? 'FINE, YOU CAN STAY!' : 'STILL DOING IT MYSELF.');
        if (h.companion()) h.joint(time, 100); break;
      case 'dharma':
        this.boostKind = 'medication'; this.boostUntil = time + 8000; h.refill(0.5);
        this.burst(32, 180, 0xe3b4ee, 'REFILL AUTHORIZED!'); break;
      case 'amanda': this.zone(time, 5500, 220, 0, 0.45, 0x99a3b5, 'NOT MY PROBLEM.', true); break;
      case 'janeen':
        this.burst(360, 480, 0xffe6a1, 'ALL SPECIALTIES!'); h.guard(5000); h.heal(100); h.rally(time, 8500, 1.75, 1.75, true); break;
    }
  }
  private zone(time: number, ms: number, radius: number, dps: number, slow: number, color: number, label: string, decoy = false): void {
    const { x, y } = this.host.player;
    // At most four live fields, even under debug/recharge abuse.
    if (this.zones.length >= 4) this.zones.shift();
    this.zones.push({ x, y, radius, start: time, until: time + ms, dps, slow, color, decoy });
    this.host.pulse(x, y, radius, color, label);
  }
  private remedy(id: Ingredient, time: number, power: number): void {
    switch (id) {
      case 'honey': this.zone(time, 6000, 190, 9 * power, 0.4, 0xeab94f, 'HONEY · STICKY SITUATION'); break;
      case 'ginger': this.burst(70 * power, 220, 0xf2aa73, 'GINGER · ROOT CAUSE!', 650); break;
      case 'lemon': {
        let from = this.host.player;
        const hit = new Set<Germ>();
        for (let i = 0; i < 5; i++) {
          const g = this.host.targets().filter(g => !hit.has(g) && Math.hypot(g.x-from.x,g.y-from.y) < 280)
            .sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];
          if (!g) break;
          hit.add(g); this.host.beam(from.x, from.y, g.x, g.y, 0xffef75); this.host.damage(g, 42 * power * 0.9 ** i); from = g;
        }
        this.host.pulse(this.host.player.x, this.host.player.y, 90, 0xffef75, 'LEMON · ZEST IN CASE'); break;
      }
      case 'tea': this.zone(time, 4500, 200, 20 * power, 0.8, 0xb7e0d3, 'TEA · STEAM AHEAD'); break;
    }
  }
  private volley(time: number): void {
    const h = this.host;
    const a = h.player.rotation;
    for (const offset of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const ray = a + offset;
      h.beam(h.player.x, h.player.y, h.player.x + Math.cos(ray) * 340, h.player.y + Math.sin(ray) * 340, 0xe3b4ee);
      for (const g of this.nearby(340)) {
        const to = Math.atan2(g.y-h.player.y, g.x-h.player.x);
        if (Math.abs(Math.atan2(Math.sin(to-ray), Math.cos(to-ray))) < 0.17) h.damage(g, 24 * 1.4);
      }
    }
    if (time < this.boostUntil && this.boostKind === 'medication') this.chain(24);
  }
  chain(damage: number): void {
    const targets = this.nearby(320).slice(0, 4);
    let from = this.host.player;
    for (const g of targets) { this.host.beam(from.x, from.y, g.x, g.y, 0xe3b4ee); this.host.damage(g, damage); from = g; }
  }
  medicationHit(time: number): void { if (this.host.id === 'dharma' && this.boostKind === 'medication' && time < this.boostUntil) this.chain(5.5); }
  update(time: number, dtMs: number): void {
    this.pulses = this.pulses.filter(p => { if (time < p.at) return true; this.burst(p.damage,p.radius,p.color); return false; });
    for (const [g, mark] of this.marks) if (!g.active || g.spawnVersion !== mark.life || time >= mark.until) this.marks.delete(g);
    for (const [g] of this.marks) this.host.field?.(g.x,g.y,g.def.radius+12,0x74e9dc);
    this.zones = this.zones.filter(z => time < z.until);
    for (const z of this.zones) {
      this.host.field?.(z.x,z.y,z.radius,z.color);
      const elapsed = Math.max(0, Math.min(dtMs, time - z.start));
      for (const g of this.nearby(z.radius,z.x,z.y)) {
        if (!g.def.boss) g.slow(time,z.slow,250);
        if (z.dps) this.host.damage(g,z.dps * elapsed / 1000);
        if (z.decoy && !g.def.boss) {
          g.stun(time,150);
          const angle=Math.atan2(z.y-g.y,z.x-g.x);
          g.setVelocity(Math.cos(angle)*55,Math.sin(angle)*55);
        }
      }
    }
    const crew = this.host.helpers();
    if (this.host.id === 'lidiya' && crew > this.previousCrew) this.host.pulse(this.host.player.x,this.host.player.y,75,0xc9b4dc,'I HAD THIS UNDER CONTROL.');
    this.previousCrew = crew;
    if (this.host.id === 'amanda' && time >= this.nextComplaint) {
      this.nextComplaint = time + 18000;
      const lines = ['ANOTHER SHIFT. WONDERFUL.', 'I WAS ABOUT TO TAKE A BREAK.', 'THAT LOOKS LIKE WORK.'];
      this.host.pulse(this.host.player.x,this.host.player.y,70,0x9babc9,lines[Math.floor(time / 18000) % lines.length]);
    }
  }
}
