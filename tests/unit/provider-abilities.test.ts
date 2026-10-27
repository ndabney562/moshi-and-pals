import { expect, it, vi } from 'vitest';
import { ProviderAbilities, type AbilityHost, PROVIDER_COOLDOWNS } from '../../src/systems/ProviderAbilities';
import { CHARACTERS, type CharacterId } from '../../src/data/characters';

function setup(id: CharacterId, crew=0, companion=false, color=0) {
  const targets=[0,1,2].map((i)=>({x:100+i*45,y:0,hp:1000,active:true,spawnVersion:1,def:{radius:15,boss:false},slow:vi.fn(),stun:vi.fn(),setVelocity:vi.fn()}));
  const host={id,player:{x:0,y:0,rotation:0},targets:()=>targets.filter(g=>g.active),damage:vi.fn((g,amount)=>{g.hp-=amount;}),pulse:vi.fn(),beam:vi.fn(),heal:vi.fn(),guard:vi.fn(),rally:vi.fn(),helpers:()=>crew,companion:()=>companion,joint:vi.fn(),refill:vi.fn(),recharge:vi.fn()};
  const ability=new ProviderAbilities(host as unknown as AbilityHost,color);
  return {ability,host,targets};
}
it('balances Janeen above every other provider at equivalent upgrades, with the requested unlock',()=>{
 const janeen=CHARACTERS.find(c=>c.id==='janeen')!;
 expect(janeen.price).toBe(10000);
 for(const c of CHARACTERS.filter(c=>c.id!=='janeen')) {
  const maxPower=(c.passive.toolDamage??1)*(c.id==='lidiya'?3.2:c.id==='dharma'?1.4:c.id==='dhiwya'?1.35:1);
  expect(janeen.passive.toolDamage!).toBeGreaterThan(maxPower);
 }
 expect(CHARACTERS.find(c=>c.id==='amanda')!.passive).toMatchObject({moveSpeed:.01,toolDamage:.01});
 for(const c of CHARACTERS.slice(4)) {expect(c.second!.price).toBeGreaterThan(0);expect(PROVIDER_COOLDOWNS[c.id]).toBeGreaterThanOrEqual(16000);}
});
it('Jason deals three separate pulses and rallies without permanent upgrade mutation',()=>{
 const {ability,host}=setup('jason');ability.first(100);expect(host.damage).toHaveBeenCalledTimes(3);
 ability.update(549,16);expect(host.damage).toHaveBeenCalledTimes(3);
 ability.update(550,1);ability.update(1000,450);expect(host.damage).toHaveBeenCalledTimes(9);
 ability.update(1100,100);expect(host.damage).toHaveBeenCalledTimes(9);
 ability.second(1200);expect(host.rally).toHaveBeenLastCalledWith(1200,7000,1.25,1.5,true);
});
it('Dhiwya marks expire and cannot transfer to pooled replacement germs',()=>{
 const {ability,targets}=setup('dhiwya');ability.first(0);
 expect(ability.incoming(targets[0] as any,1)).toBe(1.5);
 targets[0].spawnVersion++;expect(ability.incoming(targets[0] as any,2)).toBe(1);
 expect(ability.incoming(targets[1] as any,6500)).toBe(1);
});
it.each([0,1,2])('Color Code palette %s announces and expires its specific boost',(color)=>{
 const {ability,host}=setup('dhiwya',0,false,color);ability.second(0);
 const values=[ability.toolPower(1,false),ability.rate(1,false),ability.movement(1)];
 expect(values[color]).toBeGreaterThan(1);expect(values.filter(n=>n>1)).toHaveLength(1);
 expect(host.pulse).toHaveBeenCalled();expect([ability.toolPower(8000,false),ability.rate(8000,false),ability.movement(8000)]).toEqual([1,1,1]);
});
it('Raj ingredients are exclusive to Raj and refill without allowing unknown ingredient state',()=>{
 const {ability,host}=setup('raj');ability.ingredientBought('lemon');ability.ingredientBought('invalid');
 expect(ability.ingredient).toBe('lemon');expect(ability.pantry.lemon).toBe(1);expect(host.recharge).toHaveBeenCalledExactlyOnceWith(5000);
 const other=setup('jason');other.ability.ingredientBought('honey');expect(other.host.recharge).not.toHaveBeenCalled();
});
it('honey slows and tea burns for elapsed game time; expired fields stop doing damage',()=>{
 const {ability,host,targets}=setup('raj');ability.ingredientBought('honey');ability.first(0);ability.update(1000,1000);
 expect(host.damage.mock.calls[0][1]).toBe(9);expect(targets[0].slow).toHaveBeenCalledWith(1000,.4,250);
 host.damage.mockClear();ability.update(6000,1000);expect(host.damage).not.toHaveBeenCalled();
 ability.ingredientBought('tea');ability.first(7000);ability.update(8000,1000);expect(host.damage.mock.calls[0][1]).toBe(20);
});
it('ginger knocks back and lemon ricochets once per unique target',()=>{
 const {ability,host}=setup('raj');ability.ingredientBought('ginger');ability.first(0);expect(host.damage.mock.calls[0].slice(1)).toEqual([70,650]);
 host.damage.mockClear();ability.ingredientBought('lemon');ability.first(1);expect(host.damage).toHaveBeenCalledTimes(3);
 expect(new Set(host.damage.mock.calls.map(call=>call[0])).size).toBe(3);
});
it('Steep Discount consumes one of each available ingredient and pantry consumption survives restore',()=>{
 const {ability,host}=setup('raj');ability.ingredientBought('honey');ability.ingredientBought('ginger');ability.ingredientBought('honey');
 ability.second(0);expect(ability.pantry).toEqual({honey:1,ginger:0,lemon:0,tea:0});expect(host.recharge).toHaveBeenLastCalledWith(6000);
 const restored=setup('raj').ability;restored.restore(ability.save());expect(restored.save()).toEqual(ability.save());
});
it('Lidiya loses power with crew, doubles with her companion, and coordinates an actual joint attack',()=>{
 expect(setup('lidiya').ability.soloPower()).toBe(1.6);
 expect(setup('lidiya',2).ability.soloPower()).toBeCloseTo(1.3);
 expect(setup('lidiya',2,true).ability.soloPower()).toBeCloseTo(2.6);
 const {ability,host}=setup('lidiya',2,true);ability.second(100);expect(host.joint).toHaveBeenCalledExactlyOnceWith(100,100);
 ability.update(101,1);expect(host.pulse).toHaveBeenCalledWith(0,0,75,0xc9b4dc,'I HAD THIS UNDER CONTROL.');
});
it('Dharma boosts medication only; second special gives temporary cadence and chains',()=>{
 const {ability,host}=setup('dharma');expect(ability.toolPower(0,true)).toBe(1.4);expect(ability.toolPower(0,false)).toBe(1);
 ability.first(0);expect(host.damage).toHaveBeenCalled();ability.second(1);expect(host.refill).toHaveBeenCalledWith(.5);
 expect(ability.rate(2,true)).toBe(1.5);expect(ability.rate(2,false)).toBe(1);
 host.damage.mockClear();ability.medicationHit(2);expect(host.damage).toHaveBeenCalledTimes(3);
 host.damage.mockClear();ability.medicationHit(8001);expect(host.damage).not.toHaveBeenCalled();
});
it('Amanda slows enemies, complains and lures normal germs without overriding boss control',()=>{
 const {ability,host,targets}=setup('amanda');targets[1].def.boss=true;
 ability.first(0);ability.update(1000,1000);expect(targets[0].slow).toHaveBeenCalled();expect(targets[1].slow).not.toHaveBeenCalled();
 ability.second(8000);ability.update(8001,1);expect(targets[0].setVelocity).toHaveBeenCalled();expect(targets[1].setVelocity).not.toHaveBeenCalled();
 ability.update(20000,1);expect(host.pulse).toHaveBeenCalledWith(0,0,70,0x9babc9,expect.any(String));
});
it('Janeen combines apex damage, healing, protection and helper rally',()=>{
 const {ability,host}=setup('janeen');ability.first(0);expect(host.heal).toHaveBeenCalledWith(80);expect(host.damage.mock.calls[0][1]).toBe(240);
 ability.second(1);expect(host.guard).toHaveBeenCalledWith(5000);expect(host.heal).toHaveBeenCalledWith(100);expect(host.rally).toHaveBeenLastCalledWith(1,8500,1.75,1.75,true);
});
it('second abilities require a hired provider, charge NPS once, and persist',async()=>{
 const p=await import('../../src/core/progress');expect(p.buySecond('raj')).toBe(false);
 p.recordShift(0,{},300);expect(p.hireDoctor('raj')).toBe(true);expect(p.buySecond('raj')).toBe(true);expect(p.progress().nps).toBe(40);
 expect(p.buySecond('raj')).toBe(false);expect(p.buySecond('unknown')).toBe(false);
 vi.resetModules();expect((await import('../../src/core/progress')).secondUnlocked('raj')).toBe(true);
});
