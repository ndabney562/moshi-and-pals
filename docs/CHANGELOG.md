# Changelog

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
