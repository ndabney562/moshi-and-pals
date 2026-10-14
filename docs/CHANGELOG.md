# Changelog

## v0.7.0 (in progress): Milestone 7, feel and fairness
- **New app icon:** Noah's Moshi and Pals icon (germ splash logo). Already added to your Home Screen? Delete the icon and add it again to see the new one; iOS caches the old icon.
- **Testing switches** for playtesting on the phone, added to the address: `?round=12` starts at round 12, `?copays=2000` starts with Copays, `?god` makes Eugene unhurtable, `?fps=30` caps the frame rate like Low Power Mode, `?debug` shows a perf overlay (frame time, germ/droplet/particle counts). Combine them: `?round=15&god&debug`. Normal play is unchanged.
- **Fix: no more endless rounds or Copay farming.** Patients only commit violations while the round still has germs left to send in, and their germs count toward the on-screen limit. Before, leaving one germ alive let patients spawn germs (and Copays) forever.
- **Pause.** A II button in the top-right corner (P or Esc on desktop) freezes the game and opens a menu: RESUME, SOUND ON/OFF, AUTO-AIM ON/OFF (moved here from the top-left, away from your thumb) and QUIT TO MENU (tap twice). Every pause shows a tip.
- **Auto-pause** when you leave the game: home screen, app switcher, a call, notification center.
- **Fix: sound dying for good after a call or app switch.** Any touch now wakes iOS audio back up.
- **Fix: paused or backgrounded time no longer counts.** Before, cooldowns, refills, intermissions and Diamond's timers all ran out while the game was hidden. Game time now only moves while you're playing.
- **Fix: same game at any frame rate.** Germ steering and turning, patient turning, Eugene's settle and shove slide, and the camera follow now scale with frame time, so Low Power Mode (30 FPS) plays like 60 FPS.
- **Spray anywhere on the right.** Any touch on the right half of the screen (below the top HUD, not on another button) sprays, and the SPRAY ring floats to your thumb. A thumb that lands next to the button no longer does nothing.
- **Drag to aim.** While spraying, slide your thumb about a fingertip's width and Eugene aims that way by hand; lift it and auto-aim takes over again.
- **Auto-aim needs line of sight.** Eugene no longer turns to spray at a germ behind a wall or bench, and he sticks with his current target unless another is clearly closer (no twitching between two germs).
- **Hold to buy.** Doors, crates and anything else from $100 up need a short press-and-hold on USE (a ring fills). Restocking stays a tap. A crate that would replace your crate tool says which one ("Replaces your UV Wand").
- **Hits and kills feel better.** Germs squash like jelly when hit. Disinfected germs swell and burst, and a tiny halo floats up off each one (a big one off a boss). 10% of droplets land a **STAT!** crit for double damage (yellow number, bright tick). Sounds vary in pitch a little every time, and a limiter keeps a busy room from clipping.
- **Sanitation Streak.** Kills within 2 s of each other build a streak, shown under the Copays with a countdown bar. Every 5 kills adds 5% to Copays earned, up to 1.5× at 50 kills. The pop sound climbs in pitch as it grows. Streaks of 10+ get a shout-out when they end.
- **Spotless bonus.** Finish a round without getting hurt for $10 × the round number. The CLEARED banner becomes SPOTLESS.
- **Perfect Pour.** While the bottle refills, a gold arc shows on the REFILL ring. Tap REFILL again while the ring is in the gold: the bottle fills instantly and FRESH BOTTLE gives +20% damage for 4 s (the tool label says FRESH!). Tap too early or late and it SPILLS: the pour takes half a second longer.
- **Auto-refill** (on by default, in the pause menu): spraying an empty bottle starts the refill by itself. Perfect Pour still needs the second tap.
- **Off-screen threat arrows.** Germs that are off screen but within ~900 px get an arrow at the screen edge pointing at them, tinted like the germ (bigger for bosses, brighter the closer they are). Up to 8 at once.
- **New germ: Spore Pod** (from round 6). A slow hexagonal shell with armor plates across its face: spray from the front mostly bounces off ("TINK! GET BEHIND IT"), spray from behind does 1.5×. It turns slowly, so circle it. The UV Wand shines right through the shell, and Sinus Purge flips it onto its back for 2 s (no armor, can't move).
- **New germ: Sneezer** (from round 4). A droopy, runny virus with a huge red nose. It hangs back about 260 px, circles you, then flashes red and goes "AH... AH..." before a "CHOO!": a mucus glob that hurts and leaves a slippery puddle that slows Eugene for a few seconds. Only 24 HP: rush it, or out-range it with the Bleach Super Soaker.
- At most a few of each new germ are alive at once (more in later rounds), so they spice up rounds rather than take them over.

## v0.6.0: Milestone 6, supply crates
- **Supply crates** (📦 with a big "?") in the waiting room, exam rooms, staff break room, lab and X-ray. Walk up and tap USE ($250 Copays) for a random new tool you don't already have.
- Four crate tools:
  - **Lysol Fogger**: a huge, short, cloudy cone. Great for crowds.
  - **Bleach Super Soaker**: a long, hard-hitting stream that shoves germs back.
  - **UV Wand**: a purple beam that passes through up to 4 germs and recharges itself (no jug, no REFILL).
  - **Peroxide Foamer** (Claude's addition): fizzy foam that slows germs to 45% speed for 1.6 s. Doesn't slow bosses.
- You carry the bottle plus one crate tool. A new crate replaces your old crate tool. **SWAP** (X on desktop) switches between them, and each keeps its own supply and jug. The tool's name shows above the bottle meter.
- Eugene now looks like the man on Noah's title poster: messy, spiky brown-grey hair, a blue surgical mask and a white spray bottle with a red trigger (the glasses are gone).

## v0.5.6: New title poster
- The title screen now shows Noah's new Moshi and Pals poster, so the art matches the name.

## v0.5.5: Back to Moshi and Pals
- Noah changed his mind: the game is **Moshi and Pals** again (home screen name "Moshi & Pals", browser tab, docs). The title poster art still says MoshiMonsters since that text is part of the image.

## v0.5.4: Title fills the screen
- Noah: the title poster didn't fill his screen. It now re-fits whenever the screen changes shape (rotating, Safari's toolbars showing or hiding). Very wide screens, like Safari in landscape with its toolbars, no longer get dark bars at the sides (widest supported shape raised from 2.4:1 to 3.2:1).

## v0.5.3: MoshiMonsters
- Noah renamed the game **MoshiMonsters** (from his title poster). The home screen icon, browser tab and docs use the new name. The repo and web address stay `moshi-and-pals` so existing links and home screen icons keep working.
- The title screen now uses Noah's landscape poster, filling the whole screen with TAP TO START over the bottom.

## v0.5.2: Title art
- The title screen now shows Noah's MoshiMonsters poster (`public/assets/title.jpg`), with TAP TO START beside it.

## v0.5.1: Always landscape
- Noah: the screen broke when the phone was upright. The game now always plays in landscape. On an upright phone (or one with rotation lock on) it turns itself sideways to fill the screen, and touches, the HUD and the notch spacing all follow. The "turn your phone" screen is gone.

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
