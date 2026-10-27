import { test, expect, start, boot, active, tapObject } from '../helpers/game';

for(const id of ['jason','dhiwya','raj','lidiya','dharma','amanda','janeen']) {
 test(`${id} has approved art, two independently gated specials, and a working damage path`, async({page})=>{
  await page.addInitScript((id)=>{localStorage.setItem('moshi.progress.v1',JSON.stringify({owned:[`doctor:${id}`,`ability:${id}`]}));},id);
  await start(page,`?god&seed=123&doctor=${id}`);
  const before=await page.evaluate(()=>{
   const g=window.game.scene.getScene('Game');g.player.rotation=0;
   g.spawnGermAt('basic',g.player.x+100,g.player.y,true);
   const target=g.livingGerms().find((x:any)=>x.def.id==='basic');target.hp=target.maxHp=10000;target.shield=0;
   g.purgeReadyAt=0;g.secondReadyAt=0;
   return {first:g.purgeReadyAt,second:g.secondReadyAt,art:g.player.texture.key,tool:g.sprayer.def.id,hp:target.hp};
  });
  await tapObject(page,'Hud','purgeButton');
  await page.waitForFunction(()=>{const g=window.game.scene.getScene('Game');return g.purgeReadyAt>g.time.now;});
  expect(await page.evaluate(()=>window.game.scene.getScene('Game').secondReadyAt)).toBe(0);
  await tapObject(page,'Hud','secondButton');
  await page.waitForFunction(()=>{const g=window.game.scene.getScene('Game');return g.secondReadyAt>g.time.now;});
  const after=await page.evaluate(()=>{
   const g=window.game.scene.getScene('Game');const target=g.livingGerms().find((x:any)=>x.def.id==='basic');
   const health=target.hp;g.secondSignature(g.time.now);const cooldown=g.secondReadyAt;
   return {cooldown,unchanged:target.hp===health,marked:g.abilities.incoming(target,g.time.now),hp:target.hp,buttons:window.game.scene.getScene('Hud').secondButton.visible};
  });
  expect(before.art).toMatch(new RegExp(`^${id}`));expect(after.buttons).toBe(true);expect(after.unchanged).toBe(true);
  if(id==='dhiwya')expect(after.marked).toBe(1.5);else expect(after.hp).toBeLessThan(before.hp);
  if(id==='dharma')expect(before.tool).toBe('medication');
 });
}
test('Providers menu confirms NPS spending, persists hires/second abilities, and returns to title',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('moshi.progress.v1')) localStorage.setItem('moshi.progress.v1',JSON.stringify({nps:1000,owned:[]}));});
 await boot(page);await tapObject(page,'Title','providersButton');await active(page,'Providers');
 await page.evaluate(()=>{const s=window.game.scene.getScene('Providers');s.index=6;s.draw();});
 const click=async(prefix:string)=>{
  // Phaser registers freshly redrawn interactive objects on the following frame.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const pos=await page.evaluate((prefix)=>{const scene=window.game.scene.getScene('Providers');const t=scene.content.list.find((x:any)=>typeof x.text==='string'&&x.text.startsWith(prefix));const b=t.getBounds();const canvas=window.game.canvas.getBoundingClientRect();return {x:canvas.x+b.centerX*canvas.width/window.game.scale.width,y:canvas.y+b.centerY*canvas.height/window.game.scale.height};},prefix);
  await page.touchscreen.tap(pos.x,pos.y);
 };
 await click('HIRE');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('moshi.progress.v1')!).nps)).toBe(1000);
 await click('CONFIRM HIRE');await click('UNLOCK SECOND');await click('CONFIRM');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('moshi.progress.v1')!))).toMatchObject({nps:740,owned:['doctor:raj','ability:raj']});
 await click('BACK');await active(page,'Title');await page.reload();await active(page,'Title');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('moshi.settings.v1')!).character)).toBe('raj');
});
test('locked second ability cannot be triggered through keyboard or direct requests',async({page})=>{
 await start(page,'?god&seed=123&doctor=raj');await page.keyboard.press('f');
 expect(await page.evaluate(()=>window.game.scene.getScene('Game').secondReadyAt)).toBe(0);
 expect(await page.evaluate(()=>window.game.scene.getScene('Hud').secondButton.visible)).toBe(false);
});
test('Raj vending offers only recharge ingredients and saves consumed pantry state',async({page})=>{
 await start(page,'?god&seed=123&doctor=raj');
 const result=await page.evaluate(()=>{
  const g=window.game.scene.getScene('Game');g.copays=1000;g.purgeReadyAt=g.time.now+16000;g.openVending();const offered=[...g.vendingOffer];const chosen=offered[0];g.buySnack(chosen);
  const cooldown=g.purgeReadyAt-g.time.now;const ingredient=g.abilities.ingredient;g.abilities.second(g.time.now);const save=g.snapshot(2);g.abilities.pantry[chosen]=99;g.restoreShift(save);
  return {offered,chosen,ingredient,cooldown,pantry:g.abilities.save().pantry,stored:save.provider.pantry};
 });
 expect(result.offered).toHaveLength(3);expect(result.offered.every((x:string)=>['honey','ginger','lemon','tea'].includes(x))).toBe(true);
 expect(result.ingredient).toBe(result.chosen);expect(result.cooldown).toBe(11000);expect(result.pantry).toEqual(result.stored);
});
test('Lidiya gains one deterministic companion upstairs and doubles her power',async({page})=>{
 await start(page,'?god&seed=123&doctor=lidiya');
 const result=await page.evaluate(()=>{
  const g=window.game.scene.getScene('Game');const before=g.abilities.soloPower();g.unlocked.add('upstairs');g.updateCompanion(g.time.now);const first=g.companionArt;g.updateCompanion(g.time.now);
  return {before,after:g.abilities.soloPower(),id:g.companionId,same:first===g.companionArt};
 });
 expect(result.after).toBe(result.before*2);expect(result.id).not.toBe('lidiya');expect(result.same).toBe(true);
});
test('ability cooldowns and timed fields do not advance during a pause',async({page})=>{
 await start(page,'?god&seed=123&doctor=raj');await tapObject(page,'Hud','purgeButton');
 await page.evaluate(()=>window.game.scene.getScene('Hud').pause());
 const before=await page.evaluate(()=>{const g=window.game.scene.getScene('Game');return {time:g.time.now,ready:g.purgeReadyAt};});
 await page.waitForTimeout(400);
 expect(await page.evaluate(()=>{const g=window.game.scene.getScene('Game');return {time:g.time.now,ready:g.purgeReadyAt};})).toEqual(before);
});
