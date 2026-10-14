# Changelog

## v0.12.0: Milestone 12, arsenal
- **Supply Requisition** replaces the random crate. Pay $250 at a crate and a form comes up (the game waits): **pick one of two tools**, never the one you're already carrying. Don't like either? **APPEAL THE DECISION** for a different pair ($100, then $50 more each time). Insurance being insurance, 5% of claims (and appeals) are simply **CLAIM DENIED**: you get a joke item (one cotton ball, a fax confirming your fax...) and half your money back.
- Three new tools, all on the form alongside the old four:
  - **Disinfectant Wipes:** a melee sweep across the front of Eugene. Every third swipe is a **DEEP CLEAN** (×2.5, longer reach). Big knockback, great on biofilm and mold. Comes by the box.
  - **Gel Launcher:** lobs a glob of hand sanitizer over the crowd to where auto-aim is pointing (or as far as it goes, stopping at walls). It bursts for area damage and leaves **sticky gel that slows germs** for a few seconds.
  - **Defib Paddles:** "CLEAR!" Zaps the closest germ in front, then **jumps through four more**, stunning each. Charges itself.
  - Each has two Compounding Station upgrades (Thicker Wipes / Bulk Canister, Extra Hold / Family Size, Higher Joules / Crash Cart).
- Every tool now shares one hit path (type effectiveness, STAT! crits, armor and TINK), so the new tools follow the same rules as the sprays.
- The supply readout names its own units (wipes, gels, a BOX or CASE instead of a JUG).

## v0.11.0: Milestone 11, ecology
Six new germs, each asking for a different answer than "spray harder":
- **Diplococcus Duo** (round 7+): two germs stuck together. Disinfect it and it splits into two quick **Monococci**.
- **Bacillus Bulldozer** (round 8+): a rod that plants itself, shows a red lane where it's going, then charges straight down it (24 damage and a shove). Step out of the lane. If it slams into a wall it's **dazed** for 1.5 s and takes **double damage**: bait it into walls.
- **Chonk Coccus** (round 8+, one at a time): 380 health, can't be pushed, and bursts into six Basic Germs. Clear some room before you pop it.
- **Mother Culture** (round 9+): a petri dish that keeps its distance and heals every germ inside its pulsing green aura. Kill it first.
- **Colony** (round 10+): a flock of eight tiny Specks arriving together. A fogger's dream.
- **Mold Spot** (round 11+): rooted to the floor where you aren't (the farthest open door), letting out a spore every 6 s. It's a fungus: **bleach does double**, the bottle only 60%.
- Fixes: germs frozen by PRIOR AUTHORIZATION can no longer finish a sneeze wind-up; a boss replaced before its first line no longer crashes the game when that line comes due.

## v0.10.0: Milestone 10, outbreak
- **RESISTANT elites** (from round 8, more often later): a tougher (×2.5 health), bigger version of a normal germ with a spiky aura and a label naming its trait:
  - **Shielded:** a bubble soaks the first half of its health in damage.
  - **Hasty:** 35% faster.
  - **Regenerating:** heals 4% of its health every second, so finish it.
  - **Splitting:** bursts into two germs.
  Elites pay 3× Copays and points, and **always drop a power-up**.
- **Power-ups:** pills that drop from elites (and rarely from any germ). They bob, blink, and vanish after 10 s; walk over one to grab it. What's running shows under your health with a draining bar.
  - **PRIOR AUTHORIZATION:** every germ freezes for 5 s, pending approval.
  - **FREE REFILLS:** spraying costs nothing for 12 s.
  - **ER WAIT TIME:** germs move at 30% speed for 8 s (they take a number).
  - **TRIAGE:** every hit is a STAT! crit for 10 s.
  - **STAT CLEAN:** a white flash disinfects every germ nearby (bosses lose 15%).
  - **DOUBLE COPAY:** germs pay double for 15 s.
- **Special rounds,** announced with a yellow banner and an alarm:
  - **WAITING ROOM RUSH** (round 7): everyone walks in the front at once.
  - **SLOW TUESDAY** (round 9): fewer germs, and Copays pay double. Go shopping.
  - **OUTBREAK** (round 12): fast, fragile, and everywhere.
  - **INSPECTION DAY** (round 14): don't get hurt, because Spotless pays triple.
  - **SUPERBUG** (round 17): half as many germs, but resistant ones everywhere.
  After round 17 they come back on most odd rounds (never on boss rounds).
- **New boss: PATIENT ZERO** (rounds 10, 20...; Diamond keeps 5, 15, 25). The waiting room's most contagious patient, nine hours into his wait: a hospital gown, tissues stuck all over, a red nose, a ticket that says 9 HRS.
  - **Cough:** he puffs up, a pale cone shows where it will land, then he coughs. It hurts if you're in the cone and launches three Viral Sprinters.
  - **Sneeze** (below 60%): a red line shows where it's going (step aside!), then a volley of mucus globs and puddles comes down it.
  - **Compliance:** keep spraying him and he gives in and puts on a mask: no coughing or sneezing for 8 s, and he takes **double damage**. Then he pulls it down again.
  - **Against medical advice** (below 25%): he makes a run for the EXIT. If he gets there, he's gone: *LEFT AGAINST MEDICAL ADVICE*, no reward. Auto-aim locks onto him while he runs.

## v0.9.0: Milestone 9, grow and learn
- **Compounding Station** in the Lab (⚗️ UPGRADES): hold USE to upgrade the tool in your hands. Two upgrades per tool, $300 then $700, and each changes how it plays:
  - Squirt Bottle: **Pressure Nozzle** (40% farther), then **Industrial Trigger** (faster, pierces a germ, bigger bottle)
  - Lysol Fogger: **Atomizer** (much wider cloud), then **Double Tank** (twice the tank, harder hits)
  - Bleach Super Soaker: **High-Pressure Hose** (harder, shoves farther), then **Splash Zone** (twin streams)
  - UV Wand: **Wide Lens** (through 6 germs), then **Overclocked** (charges twice as fast, burns hotter)
  - Peroxide Foamer: **Extra Fizz** (slows to a crawl), then **Foam Party** (a wide wall of foam)
  The tool name gets a II or III.
- **Exam tables:** walk up to any exam table and tap USE to lie down: +50 health for $40. Each table works once per round, so the exam rooms are worth opening now.
- **Germs stop getting spongier at round 13** (health growth capped at ×2.2); bosses scale at most ×1.5. Later rounds get harder through what spawns, not health.
- **A breather when you're struggling:** below 30% health with a crowd around you, new germs come in a little slower. Nothing already in the room goes away, and it's never announced.
- **Score rewards skill:** a Sanitation Streak of 10+ adds 5 points per kill when it ends, and a Spotless round adds 25 × the round.
- **Discharge Summary** game over: cause of death (each germ has its own: "Slipped in someone else's sneeze."), round and score with NEW RECORD badges, germs disinfected, best streak, time on shift, Copays earned, rooms opened, upgrades, Perfect Pours, crits, your most-disinfected germ, and your personal bests. One big **PLAY AGAIN**.
- **Records survive updates:** the save is now versioned (v2: best score, round and streak, total germs, runs). Old saves are migrated, and a damaged save falls back safely instead of crashing.
- **Teach as you play:** new players get one hint at a time, right by the control, at the moment it matters: DRAG TO MOVE, HOLD ON THE RIGHT TO SPRAY, SINUS PURGE when surrounded, the gold-ring Perfect Pour, HOLD USE TO BUY. Each disappears for good once you've done it.
- **Screen shake** can be turned off in the pause menu (reduced motion).
- Only the floor you're on is drawn (the other floor is hidden), roughly halving the map's drawing work.
- The FPS counter and build label only show with `?debug`; the build label is at the bottom of the pause menu.

## v0.8.0: Milestone 8, the real clinic
- **MoshiLand now follows the real clinic's floor plan** (Noah's photos of the posted plans; the photos aren't in the repo). Two floors:
  - **Ground floor:** you start in the waiting room (lounges, two blocks of seats, the big sofa, benches) with reception and its supply cart. Buy the **HALLWAYS** gate ($250) to open the loop around the lab, which reaches **Exam Rooms 1–7** ($150–200 each), the **Supply Closet** (supply cart), **Bathrooms 1 and 2** ($100), the **Lab** ($500, supply cart and crate), **X-Ray** ($600), and the **Egress Stairs** ($200). The **Manager's Office** ($150) opens off reception. Germs come in through the front doors, the side door, the staff door, the egress and the elevator.
  - **Upstairs ($1000, at the foot of the west stairs):** a second floor with **Exam Rooms 8–15**, **Bathrooms 3 and 4**, **Supply Closet 2** (supply cart), the MA station island, and a fenced-off "open to below" drop. Germs also arrive by the fire escape.
- **Stairs.** Walk into a staircase to go up or down; the camera stays on your floor. The egress stairs also link the floors once both ends are open. **Germs follow you up and down the stairs** (they path through them).
- Each exam room is a dead end: quick loot, but easy to get cornered in. The hallway loops around the lab and the MA station are made for kiting.
- Off-screen arrows only point at germs on your floor.

## v0.7.0: Milestone 7, feel and fairness
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
