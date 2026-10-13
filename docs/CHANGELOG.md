# Changelog

## v0.5.0: Milestone 5, MoshiLand
- The clinic is now **MoshiLand Urgent Care** (Noah named it). The map grew from one waiting room to a whole building, 3800×2100.
- Five rooms sit behind locked doors. Walk up to a door and tap **USE** (E on desktop) to buy it open with Copays: Bathroom $200, Exam Rooms $350, Lab $500, Staff Break Room $600, X-Ray $750 (two doors, one from the exam hall and one from the lab). Locked rooms are dimmed with their price on the floor.
- Each room is busier than the last: stalls and a sink, three curtained exam bays and a triage desk, a break room with couch and fridge, lab benches that make narrow aisles, and the X-ray machine behind lead walls.
- Germs come in through every room that's open, so opening rooms means more ground to cover. They still never spawn right next to Eugene, and prefer doors within 1600 px.
- The lab has a second SUPPLIES cart. RESTOCK is now the same USE button.
- The HUD shows which room Eugene is in.
- Patients stay in the waiting room. Diamond only calls a Mandatory Meeting when Eugene is in the waiting room (the exit is there).

## v0.4.0: Milestone 4, the MVP
- **Copays** (Noah named them): earned for every kill (Basic $5, Sprinter $8, Write-Up $2, Diamond $100) and for cleaning up a patient ($10). Shown under the score.
- The bottle now refills from a limited **jug** (480 mL, shown under the bottle). When the jug runs dry, walk to the **SUPPLIES** cart and tap RESTOCK ($40).
- **Sinus Purge**: new button left of SPRAY (Q on desktop). A honking shockwave that hurts and blasts away every germ nearby, then recharges for 18 s. Placeholder honk until Noah records the real one.
- New placeholder sounds: purge honk, ka-ching, denied buzz.
- Noah: the spray now looks like a mist cloud instead of individual pellets (soft puffs that spread and fade across the spray cone).

## v0.3.3: Patients with health code violations
- Noah's idea: from round 2, patients wander into the waiting room. They're solid moving obstacles for Eugene and germs.
- Every few seconds a patient commits a health code violation (coughing, chin-strap mask, chip fingers, skipping the sanitizer, pen chewing, shoes off, phone licking, bringing the whole family). Each one lets 1-2 germs loose, and Eugene grumbles about it.
- Spray a violator 8 times and they clean up their act and leave (+25 points). Auto-aim targets them when no germ is in range.
- No patients during boss rounds; Diamond gets the room to herself.

## v0.3.2: Diamond the Practice Manager
- Noah's call: the boss is now **Diamond**, a grouchy practice manager from Trinidad, instead of Babushka Bacillus. She's a big, heavy, slimy germ monster (bun, pencil, clipboard, furious eyebrows, toothy scowl, Trinidad and Tobago flag pin). Fictional character. Same fight shape, new personality:
  - Mandatory Meeting: ties Eugene up in red tape and drags him to the EXIT. Spray her to break free.
  - Write-Ups: flings angry pink slips (small, fast) as she loses health.
  - Policy Tantrum: slams her clipboard at low health, knocking Eugene back.
- She is bigger, slower and tougher: 850 HP, 55 px/s, 92% knockback resist, 30 contact damage. New grumble and clipboard-slam sounds.

## v0.3.1: Babushka Bacillus and Noah's M3 playtest
- First real boss, **Babushka Bacillus** (Noah's design), replaces the placeholder. She has a headscarf and whiny speech bubbles, and three moves:
  - Homesick Haul: lassos Eugene with yarn and drags him to the EXIT. Spray her to break free.
  - Little Cousins: sobs out small fast germs as she loses health.
  - Guilt Trip: wails at low health and knocks Eugene back.
- Auto-aim locks onto her while she's hauling.
- Harder start (Noah: round 1 too easy, never lost health): 10 germs in round 1, faster spawns, Basic Germs faster (95 px/s) and hit harder (15). Regen slower (6 HP/s after 6 s).

## v0.3.0: Milestone 3, waves, health, death, restart
- Eugene has 100 HP. Germs hurt on contact (Basic 12, Sprinter 8, boss 25), with 0.7 s of invulnerability after a hit and regen after 4.5 s without damage.
- Wave system (`systems/WaveDirector`, tuned in `data/waves.ts`): escalating rounds, intermissions for refilling, funny round titles.
- Viral Sprinter: small, fast, fragile virus that joins from round 3.
- Boss rounds every 5th round with a boss health bar. The boss is a placeholder until Babushka Bacillus is built.
- Score (+points popups), ROUND/SCORE HUD, health bar, red damage flash and low-health pulse.
- Game over screen ("CONTAMINATED") with stats, saved high score and best round, SCRUB IN AGAIN and MAIN MENU.
- New placeholder sounds: hurt, round start/clear, boss arrival, game over.

## v0.2.2
- AUTO-AIM ON/OFF toggle in the top-left HUD, saved on the device (`src/core/settings.ts`). Off: Eugene faces and sprays where he walks.

## v0.2.1: Noah's Milestone 2 playtest
- Spraying is now a SPRAY button (hold to spray). Eugene auto-aims at the nearest germ within 240 px, otherwise faces where he walks. Twin-stick aiming is still available via `CONTROLS.scheme`.
- Spray range shortened from 300 to 200 px.
- Eugene redrawn from Noah's description: stocky, thinning grey hair with a bald top, glasses, white coat over a dark navy scrub top.
- Desktop testing: Space also sprays.

## v0.2.0: Milestone 2, squirt bottle vs. first germ
- Isopropyl alcohol squirt bottle: push the aim stick to spray. 120 mL, drains as you spray.
- Bottle meter and REFILL button (also R key). The button throbs when you're nearly empty.
- Basic Germ: chases Eugene, paths around furniture, enters through doors.
- Hit feedback: white flash, knockback, splashes, damage numbers, splat + fading floor stain, tiny camera kick.
- Placeholder synthesized sounds: spray, hit, pop, bump, empty click, refill.
- Germs bump Eugene (no damage until Milestone 3). Kill counter in the HUD.
- CI runs the build and phone-sized smoke test on every pull request.

## v0.1.0: Milestone 1, movement sandbox
- Project setup, auto-deploy to GitHub Pages, Add to Home Screen support.
- Title screen; waiting room with furniture and locked doors.
- Eugene placeholder with twin-stick touch controls, waddle, and camera follow.
- FPS counter and build label; "rotate your phone" screen in portrait.
