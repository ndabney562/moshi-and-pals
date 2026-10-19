# Noah's Contributions

## Done
- Created the GitHub repo.
- Playtested Milestone 1: controls feel good, 60 FPS, nothing under the notch.
- Playtested Milestone 2: wanted a spray button, shorter range; bottle, refill, sounds OK.
- Described Eugene and shared a reference photo.
- Playtested v0.2.1: auto-aim feels fine, wanted an off switch.
- Asked for boss germs; designed the first boss direction (whiny, comedic, wants to take Eugene back to Mother Russia) and picked the name Babushka Bacillus. Then swapped her for **Diamond**, a grouchy practice manager who tries to hurt Moshi.
- M3 playtest: round 1 too easy, regen too forgiving, boss needed more personality. Idea: patients who wander in as obstacles, and Eugene hates health code violations (built in v0.3.3).
- Asked for rooms unlocked with currency earned from germ kills, and supply crates that unlock new tools. Named the currency **Copays**. Approved the tool ideas (Lysol Fogger, Bleach Super Soaker, UV Wand) and said to add more.
- Named the clinic **MoshiLand** and asked for the rooms of a standard urgent care, including X-ray (built in v0.5.0).
- Approved the M7 roadmap (docs/ROADMAP.md) and the GameScene split; cut the first-person view. Kept the names Spore Pod, Sneezer, Sanitation Streak and Perfect Pour.
- Shared photos of the real clinic's ground floor and upstairs plans for the M8 map; made the new app icon.
- Named the Pals and shared reference photos: Dr. Kaya and PA Lucien are playable alongside Moshi (v0.16.0).
- Shared reference pictures for Ken, Diamond, Omar and Alan: Ken is playable, Diamond has a new look, and Omar and Alan are scribe power-ups (v0.18.0).
- Asked for Donald, the X-ray tech, with a reference photo: he unlocks in the X-ray room and helps the doctor (v0.27.0).
- Made the title poster (title screen since v0.5.2; redone as Moshi and Pals in v0.5.6; all four doctors in v0.18.0).
- Decided Ken shows as just "Ken" and Diamond loses her flag pin.

## Requested now
- Playtest v0.26.0: how many shifts did it take to hire Dr. Kaya (30 NPS)? Are Lucien (45) and Ken (60) worth the wait, and do they feel stronger than Eugene?
- Playtest v0.19.0 **Today's Shift** (📋 on the title screen) for a few days, and try Walk-In and Trauma Center. Rename any modifier, rewrite their jokes (`src/data/modifiers.ts`), or pitch new ones. Testers can force any: `?mods=powerOutage,fullMoon`.
- Playtest v0.18.0: play as Ken against Diamond (`?round=5&doctor=ken`), and hire the scribes on the Residency Board (or try `?scribe=omar` / `?scribe=alan`). Too strong, too weak, funny enough?
- Is FILE A GRIEVANCE the right name for Ken's move?
- Any time: Ken's own reactions to patients (`ken` in `src/data/patients.ts`) and more lines for Omar and Alan (`src/data/scribes.ts`).
- Playtest v0.12.0: the six new germs (rounds 7-11; `?round=11&copays=2000` to jump ahead), the Supply Requisition form, and the Wipes, Gel Launcher and Defib Paddles. Which tool feels best, which feels useless?
- Any time: more CLAIM DENIED joke items (`src/data/requisition.ts`) and achievement names (`src/data/achievements.ts`).
- v0.13.0 offline check: add the game to the Home Screen, open it once, then turn on Airplane Mode and open it again.
- Playtest v0.9.0: Compounding Station (Lab), exam-table Rest, the Discharge Summary, and the first-run hints (to see them again, clear the site data or use a private tab).
- Any time: your own causes of death (`deathNote` in `src/data/germs.ts`) and pause tips (`src/data/tips.ts`).
- Playtest v0.7.0 (checklist in the M7 wrap-up message): Low Power Mode, pause/auto-pause, spray zone + drag-aim, hold-to-buy, Perfect Pour, Spore Pods, Sneezers.
- Playtest MoshiLand (v0.5.0): are the door prices right, and is any room too cramped or too empty?
- Optional: round titles and game over lines (`src/data/waves.ts`, `src/scenes/GameOverScene.ts`).

## Coming up
- Try the Miracle Cure (v0.25.0; walkthrough in ROADMAP, or `?secret=records&god` to jump to the Records Room). Is the quest too obscure, and is the Last Fax Machine a fair fight? Any lines for the fax, the operator or the credits (`src/data/miracleCure.ts`)?
- Any time: a real Sinus Purge recording (the HRRRNNNKKK) to replace the placeholder.
- Playtest M6 crate tools: which feels best, which feels useless, and is $250 right?
- More crate tool ideas any time (each one is one entry in `src/data/equipment.ts`).
