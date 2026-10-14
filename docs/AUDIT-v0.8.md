# Moshi and Pals: v0.8 Audit, Vision and Next Sprint

*Written after M7 (feel and fairness) and M8 (the real clinic map). It's based on the full repo, the scripted phone-sized test runs (63 checks, every major system driven), and an economy model built from the real config numbers. One limit: my test browser runs at about 5 FPS, so game feel on a real iPhone is still Noah's call.*

## 1. What the game is now
A landscape iPhone wave-survival game. Dr. Eugene "Moshi" Moshkovich defends a two-floor urgent care, laid out after the real clinic, from escalating rounds of germs.
- **Controls:** a floating left stick moves. Holding anywhere on the right sprays, and auto-aim only targets germs Eugene can see. Dragging that thumb aims by hand.
- **Tools:** a limited isopropyl bottle you refill from a jug (Perfect Pour rewards timing), plus one random crate tool.
- **Sinus Purge:** a shockwave on a cooldown.
- **Economy:** Copays from kills (boosted by the Sanitation Streak and Spotless rounds) buy doors, crates and jug restocks.
- **Germs:** Basic, Viral Sprinter, Sneezer (ranged, leaves puddles), Spore Pod (armored front), and Diamond the Practice Manager as a boss every 5th round.
- **Patients** wander in and cause germs with health-code violations.

## 2. The current loop
```
move + hold spray ──► germs flash, squash, pop (+halo, +$ × streak)
        ▲                                    │
        │                                    ▼
  next round (5 s break)          bottle runs dry → REFILL (Perfect Pour?) → jug dry → walk to a cart, $40
        ▲                                    │
        │                                    ▼
  buy a door (more space AND more spawns) / a crate (random tool) / save
```
**Where it breaks:** the reward stage is thin. Copays buy space and randomness, never *power*. Every round your damage is the same and theirs is higher. The "one more run" pull is currently just the high score.

## 3. Keep these
1. **The comedic premise and its delivery:** patients' health-code violations, Diamond's Mandatory Meeting, "EXIT (NICE TRY)", the sinus HRRRNNNKKK.
2. **The real clinic as the map.** Dead-end exam rooms, a corridor loop around the lab and MA island, and two floors joined by stairs make a genuinely good survival map.
3. **The controls stack:** spray zone, line-of-sight auto-aim, drag-aim, hold-to-buy.
4. **The architecture:** content in data files, an event bus, object pools, the flow-field pathfinder, game time that pauses, the debug switches, and CI running the smoke test.
5. **Feedback:** squash, pop and halo, STAT! crits, the streak pitch ladder, Perfect Pour.
6. **Germs that need a tactic,** not more HP: flank the Spore Pod, dodge the Sneezer.

## 4. The 15 biggest problems, ranked
1. **No power growth during a run.** Spray time needed per round grows from 8 s (round 1) to 155 s (round 13) while DPS stays at about 89. Late rounds are a slog, not chaos.
2. **Opening a room is often a net loss.** Most rooms add spawn points and nothing else. 26 rooms, about 5 with any payoff.
3. **Germ HP scales without limit** (×2.9 by round 20, bosses included). Germs become sponges.
4. **No onboarding.** A new player sees ten HUD elements and is told nothing.
5. **Game over is a dead end:** four lines of stats and no reason you died. There's no "I almost had it."
6. **Score ignores skill.** It counts kills only; the streak and Spotless only pay Copays.
7. **No power-ups, no elites, no special rounds.** Every round feels the same apart from its size.
8. **One boss, repeated,** and only scaled in HP.
9. **No music, and every sound is a synth placeholder.** That's a big gap in perceived quality.
10. **HUD clutter:** the FPS counter and build label are always on, the score and Copays sit in the center, and the tool name is long.
11. **No reduced-motion or haptics settings** (screen shake is always on).
12. **Save data is a single unversioned record.** Nothing persists between runs except two bests.
13. **The map draws about 22k vector commands every frame,** both floors, even the one you're not on. That's a risk to 60 FPS on the bigger map.
14. **`GameScene` handles too many jobs** (~1,300 lines: economy, interactables, map drawing, stairs, boss wiring). Every new station makes it worse.
15. **No offline or update handling (PWA).** A Home Screen launch on bad signal shows a blank page.

## 5. The 15 highest-leverage improvements, ranked
1. **Compounding Station** (Lab): three tiers per tool, each changing *how* it plays.
2. **A job for each kind of room:** exam tables heal (urgent care!), supply closets restock, the Lab upgrades, X-ray and bathrooms get traps (later).
3. **Cap HP growth;** escalate through composition, elites and special rounds instead.
4. **Teach the controls during play:** move, then spray, then refill, then Purge, then buy, each hint appearing only when it's first needed.
5. **"Discharge Summary" game over:** what killed you, best streak, rooms opened, records, and a big PLAY AGAIN.
6. **Score rewards skill:** streak and Spotless bonuses count toward score too.
7. **Power-ups dropped by "RESISTANT" elites:** Prior Authorization, Free Refills, ER Wait Time, and more.
8. **Special rounds:** Waiting Room Rush, Outbreak, Inspection Day, Power Outage.
9. **Music in layers** that follow intensity, plus recorded voice and SFX (Noah's honk).
10. **Only draw the floor you're on, and later bake the static map into textures.**
11. **Reduced-motion setting** now; haptics with the native wrapper later.
12. **Versioned saves with records:** best streak, total kills, runs played.
13. **Patient Zero** as the second boss (waiting room, uses the patient system).
14. **Achievements** (named jokes, which teach mechanics).
15. **Offline support (service worker) and a share card** for high scores.

## 6. Mobile / iPhone assessment
- **Good:**
  - forced landscape, which works even with rotation lock on
  - safe areas respected
  - controls are generous: the right-half spray zone, hold-to-buy, and touch targets at 44 pt or more
  - auto-pause, audio recovery, and game time that stops while paused
  - frame-rate-independent movement (Low Power Mode)
  - an installable Home Screen icon
- **Weak:**
  - **HUD:** too much is always visible (FPS counter, build label, score, Copays, room, streak, tool name).
  - **Haptics:** none. Safari can't vibrate, and the native wrapper is the real answer.
  - **Offline:** a Home Screen launch on bad signal shows a blank page.
  - **Untested sizes:** the iPhone SE and Safari with its toolbar showing haven't been checked on a device.
  - **Bigger map:** on a phone you see about a fifth of a floor. Threat arrows help, but rooms need to be recognisable at a glance (tints and signs do part of this).

## 7. Technical and performance risks
| Risk | Severity | Plan |
|---|---|---|
| ~22k static draw commands per frame on the M8 map | Medium | This sprint: draw only Eugene's floor (about half). Next: bake into textures if p95 goes over 16.7 ms. |
| `GameScene` doing too many jobs | Medium | This sprint: move the stations into an Interactables registry. |
| Smoke test is slow and timing-sensitive on slow browsers | Low | Checks now wait on game state; CI is the source of truth. |
| Save format is v1 with no migration | Low (soon High) | This sprint: versioned save with a v1 migration. |
| Orientation patch depends on Phaser internals | Low | Re-check on any Phaser upgrade. |
| Synthesized audio creates nodes on every play | Low | Fine at current counts; revisit when real recordings arrive. |

## 8. Proposed systems (beyond the M7 roadmap)
- **Compounding Station:** *Generic → Brand Name → Prescription Strength.* Per tool, two upgrades that change behavior:
  - **Bottle:** Pressure Nozzle (range) → Industrial Trigger (fire rate, pierce).
  - **Fogger:** Atomizer (a much wider cloud) → Double Tank.
  - **Bleach:** High-Pressure Hose (knockback and damage) → Splash Zone (twin stream).
  - **UV:** Wide Lens (pierces 6) → Overclocked (charge and damage).
  - **Foamer:** Extra Fizz (stronger slow) → Foam Party (wide spray).
- **Exam table "Rest":** USE at any exam table for $40 to heal 50 HP. Each table works once per round, which makes exam rooms worth opening and gives you a survival purchase.
- **Pacing:** HP growth capped at ×2.2. When Eugene is below 30% HP with a crowd around him, spawns slow down a little. That's pacing, not cheating, and it's never shown.
- **Discharge Summary:** what killed you (a funny "cause of death" per germ), the round, score, kills, best streak, Copays earned, rooms opened, crits, and NEW RECORD tags.
- **Onboarding hints:** DRAG TO MOVE, then HOLD TO SPRAY, then TAP REFILL, then SINUS PURGE!, then HOLD USE TO BUY. Each one appears once, at the moment it's needed, and is never shown again.
- **Records:** best streak, total kills, runs played, plus best score and round, in a versioned save.

## 9. The finished game, a few minutes in
- **Minute one:** you know what to do without reading anything. Germs pop, the streak climbs, and the pop pitch rises.
- **By round 4:** you're choosing between the Hallways and saving for the Lab. You hear "AH… AH…" and step aside. You notice the Spore Pod just doesn't care about your spray, until you circle it.
- **Round 7:** your bottle has a Pressure Nozzle. You run the lab loop with a train of germs behind you, nail a Perfect Pour, honk, and flip a Spore Pod.
- **Round 9:** a RESISTANT germ drops Prior Authorization and the whole waiting room freezes "pending approval."
- **Round 12:** chaos, two floors open, germs coming up the stairs after you. You die to a Sneezer puddle in Exam Room 14, and the summary says *Cause of death: slipped in someone else's sneeze.* You hit PLAY AGAIN before you've decided to.

## 10. Roadmap (phases)
1. **Foundation (this sprint):** draw only Eugene's floor, a cleaner HUD, the GameScene refactor, versioned saves.
2. **Survival loop (this sprint):** Compounding Station, exam-table healing, HP cap and pacing, the Discharge Summary, onboarding, reduced motion.
3. **Enemy ecology:** elites and power-ups; then Splitter, Charger, Mother Culture, Colony, Mold Spot, Chonk.
4. **Arsenal:** Wipes (melee), Gel Launcher, Defib Paddles; Supply Requisition (pick 1 of 2).
5. **Clinic:** room traps (hand dryer, curtains, X-ray blast, autoclave), vending machine, Pals.
6. **Progression:** CME Credits, the Residency board, achievements, the germ atlas.
7. **Content:** special rounds, Patient Zero, Diamond 2.0, Methicillin, the Influenza Twins, the Miracle Cure Easter egg.
8. **Presentation:** an art pass (sprite atlas), music in layers, recorded audio, menus.
9. **Release:** baked map textures if needed, offline support, the Capacitor wrapper with haptics and Game Center, a device test pass.

## 11. First sprint, M9 "Grow and Learn" (being built now)
| # | Change | Why |
|---|---|---|
| F1 | Draw only Eugene's floor; hide the FPS counter and build label unless `?debug` (build label moves to the pause menu) | Halves static draw work; declutters the HUD |
| F2 | Move stations into an Interactables registry (no behavior change) | Makes F3 and F4 clean; approved as A1 |
| F3 | **Compounding Station** in the Lab: 2 upgrades per tool, $300 / $700 | Fixes problem #1; gives the Lab a purpose and Copays a real sink |
| F4 | **Exam-table Rest:** $40 heals 50, once per table per round | Exam rooms worth opening; a survival purchase |
| F5 | Cap germ HP growth (×2.2); slightly slower spawns when Eugene is low on HP and crowded | Difficulty from composition, not sponges |
| F6 | **Discharge Summary** game over, run stats, versioned save with records | "I almost had it. Again." |
| F7 | **Teach during play:** one-time hints for move, spray, refill, Purge, buy | New players understand it with no help |
| F8 | Reduced-motion setting (no screen shake) | Accessibility, comfort |
