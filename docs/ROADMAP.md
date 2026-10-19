# Moshi and Pals — Audit & Roadmap (v0.6.0)

*Audit of commit `4e81186` (M6 crates). This comes from reading all of `src/` and `docs/`. I didn't run the game on a device: npm was blocked in my workspace, so there are no frame-time numbers yet. Sprint item S1 fixes that.*

---

## 1. Audit

### What's already working (keep it)

- **Architecture is better than most prototypes.** Tuning lives in `config/`, content in `data/`, and systems talk over an event bus (`core/events`). Input goes through `inputState`, so the HUD and the game stay separate. Germs and droplets come from pools. The `FlowField` pathfinder costs the same no matter how many germs there are. Safe areas and the forced-landscape rotation are handled, and CI runs a smoke test. **Keep Phaser 3.90 + TypeScript + Vite.** A different framework wouldn't buy anything. What's missing is game design and content, not engine features.
- **The game already has a personality.** Patient health-code violations are the best idea here. The game spawns its own problems and Eugene complains about them, and it's very on theme. Other good bits: Diamond's Mandatory Meeting (a boss move with real counterplay), the round titles, "EXIT (NICE TRY)", and the magazines from 2009.
- **Opening doors already involves a choice.** Each room you open adds spawn points, so more space also means more pressure. That's the right shape.
- **Tools already behave differently, not just hit harder.** The UV wand pierces and recharges itself, peroxide slows, bleach pushes back, and the fogger covers crowds.

### What's holding it back from feeling commercial

1. **One verb and one enemy behavior.** With auto-aim and hold-to-spray, all the skill is in movement. That's the right model for iPhone (Vampire Survivors and Brotato work the same way), but it only works when enemies make you solve *spatial* problems. Right now every germ just walks toward Eugene, so running in circles is always the best strategy. **This is the biggest problem with the game.**
2. **You don't get stronger during a run.** There are no weapon upgrades. Germ HP grows +10% per round with no cap (2.9× by round 20, and Diamond gets the same multiplier), while your damage never changes. Late rounds turn into slow sponge fights, which is exactly what the brief wants to avoid.
3. **Copays have almost nothing to buy.** Once the doors are open, the only things left are $40 restocks and $250 crates. From the mid game on, money piles up.
4. **Hits and kills lack punch.** Basics are there (white flash, splat, stain, number, small camera kick). Missing: a death animation, sound pitch variation, crits, streaks, and any reward for clean play.
5. **Nothing carries between runs.** You only keep a best score and best round, so there's no "one more run" pull.
6. **The title says "Pals," but there are no pals.** That's an identity hook waiting to be used (see P2-8).

### Bugs and exploits (code-verified)

| # | Problem | Where |
|---|---|---|
| B1 | **Copay farm / endless rounds.** Patients keep committing violations for as long as the round is active, and a round only ends once every germ is dead. Leave one germ alive and patients spawn round-2 germs forever, which means unlimited Copays. Without exploiting it, patients still drag rounds out. `spawnGermAt` also skips the `maxAlive` cap. | `PatientDirector.update`, `GameScene.spawnGermAt` |
| B2 | **iOS audio can die for the rest of the session.** After a phone call, Siri, or app switch, iOS leaves the AudioContext `suspended`/`interrupted`. `play()` quietly gives up unless the state is `running`, and nothing ever calls `resume()`. | `core/sfx.ts` |
| B3 | **No pause, and no auto-pause.** Phaser freezes when the page is hidden and resumes the moment it comes back, before your thumbs are ready. There's no pause button. `setSfxMuted` exists but nothing calls it. | `HudScene`, `main.ts` |
| B4 | **Speed depends on frame rate.** Germ steering (`Linear(..., 0.1)` per frame), germ turning, and some easing all run per frame. Low Power Mode caps Safari at 30 FPS, so germs react half as fast and knockback recovers slowly. | `Germ.chase`, `Player.drive`, `Patient.walk` |
| B5 | **Auto-aim targets through walls.** `nearestGerm` has no line-of-sight check, so near doors, lab benches, and the X-ray partitions Eugene turns toward a germ behind a wall and sprays the wall. Equal-distance targets can also make him flip back and forth. | `GameScene.nearestGerm` |
| B6 | **Accidental purchases.** USE pops up right above SINUS PURGE, and one tap spends Copays. Opening a crate *silently replaces* your current crate tool (an accidental $250 tap can swap your UV wand for a fogger). | `HudScene.layout`, `GameScene.openCrate` |
| B7 | **The SPRAY target is small.** It's an 80 px hit circle. A thumb that lands just outside it does nothing, and in a chaotic round that means you stop shooting. | `HudScene.onPointerDown` |
| B8 | **Unused weapon data.** The `spore`, `biofilm`, and `fungus` tags have no germs, so most of the effectiveness tables never apply (the UV wand's ×1.5 vs spores does nothing). Crate tools have no enemies that need them. | `data/germs.ts`, `data/equipment.ts` |
| B9 | **Save data at risk (future).** Safari can delete a website's localStorage after 7 days without a visit (Home Screen apps are mostly exempt). That's fine for a high score, but risky once there's progression between runs. | `core/save.ts` |

Lower priority: `GameScene` handles too many jobs in 790 lines (economy, interactables, map drawing, spawning, boss wiring). Its `if (kind === 'cart' | 'door' | 'crate')` chain will get messy with every new station. **I want to discuss splitting it before refactoring** (see A1). Damage numbers use `Phaser.Text`, which re-renders the text and re-uploads it to the GPU every time it changes. Bitmap text is cheaper on iOS. Text is a bit soft on Retina screens because the canvas renders at 720 lines and gets scaled up.

**Real people:** the game uses Eugene's real full name in a public repo. That's fine among friends. Before sharing it wider, get his OK.

---

## 2. Design direction (the short version)

**Pillars:** *keep moving and stay positioned* (enemies make spatial problems) → *manage your supply* (bottle, jug, refill timing) → *make trade-offs with Copays* (open space vs safety, upgrade vs gamble) → *one timed panic button* (Sinus Purge) → *escalating chaos with clear warnings before attacks*.

Auto-aim stays the default. Skill shows up in positioning, refill timing, Purge timing, which target to deal with first, and spending choices.

### Germ roster (each shape tells you its family at a glance, with real microbiology silhouettes)

| Germ | Silhouette | Behavior | Strength | Weakness | Introduced |
|---|---|---|---|---|---|
| Basic Germ (coccus) | Round blob, cilia, googly eyes | Chases | Numbers | Everything | R1 (exists) |
| Viral Sprinter | Small spiky ball | Fast chaser | Speed, flanking | 16 HP | R3 (exists) |
| **Spore Pod** | Hexagonal shell, slowly turns to face you | Slow, armored front (takes ×0.25 damage from the front 120°, ×1.5 from behind) | Blocks frontal spray, soaks damage | Circle behind it. UV pierces the shell. Purge flips it onto its back for 2 s. | R6 |
| **Sneezer** (rhinovirus) | Droopy blob with a big red nose | Keeps ~260 px away, winds up "AH… AH…" (0.7 s, nose glows), then fires a mucus glob that leaves a slowing puddle | Attacks from range, denies floor space | 24 HP. Bleach outranges it. | R4 |
| Bacillus Bulldozer | Long rod/capsule | Stops, shows a red line telegraph for 0.8 s, then charges at 520 px/s. Hitting a wall stuns it for 1.5 s and it takes ×2 damage. Knocks other germs over. | Burst damage | Sidestep it, then punish the stun | R8 |
| Diplococcus Duo | Two joined blobs (dumbbell) | Splits into two faster halves on death | Multiplies | Fogger / Purge | R7 |
| Mother Culture | Petri dish with a halo pulse | Hangs behind other germs and heals them (8 HP/s, 180 px green ring) | Makes the whole wave tougher | Fragile, so kill it first | R9 |
| Colony | A flock of 8 specks | Moves as a group | Hard to hit with single shots | Fogger ×2 | R10 |
| Mold Spot (fungus) | Fuzzy stain on the floor | Grows in rooms you haven't visited for 40 s and spawns spores | Pulls you away from your favorite spot | Bleach ×2 | R11 |
| Chonk Coccus (mini-boss) | Huge blob | Slow, can't be knocked back, bursts into 6 basics on death | Blocks paths | Kite it into chokepoints | R8/R13 |
| **"RESISTANT" elites** | Gold outline + "RESISTANT" sash | Any germ ×2.5 HP plus one trait (Shielded / Hasty / Regenerating / Splitting) | — | Always drops a power-up | R11+ |

### Disinfectants (each one changes how you play)

| Tool | Role | Notes |
|---|---|---|
| Isopropyl Bottle | Reliable starter | Exists. Upgrade tiers add a fan nozzle, then pierce 1. |
| Lysol Fogger / Bleach Super Soaker / UV Wand / Peroxide Foamer | Crowd control / long-range pushback / piercing / slowing | Exist. Bleach gets its "hazard" side: puddles that hurt germs *and* sting Eugene. |
| **Disinfectant Wipes** | Melee sweep arc. Every third swipe is a big one. | Short-range risk for a big reward. "Wet time: 4 minutes. You have 4 seconds." |
| **Gel Launcher** (hand-sanitizer cannon) | Lobbed glob that bursts in an area and leaves a sticky slow puddle | Area control |
| **Defib Paddles** | Short range hit that chains to 4 germs. "CLEAR!" | Kills clumps of small germs |
| **Nebulizer Turret** | Deployable mist tower that lasts 20 s | Holds a position |
| **Saline Flush** | Wide pushback cone, low damage | Buys breathing room |
| **Swab Javelin** | Slow, piercing, pins germs to walls | Specimen joke, precision tool |
| Autoclave | **Part of the room, not a weapon** (lab) | Lure germs inside and slam it shut |
| Ionizer 9000 | Secret wonder weapon (Easter egg) | Arcs between every germ in range. "As seen on late-night TV. Not FDA approved." |

**Upgrades (Compounding Station):** *Generic → Brand Name → Prescription Strength.* Each tier adds a **behavior**, not just damage. Examples: Bottle III pierces, Fogger III lingers as a cloud, UV III burns, Foamer III foam explodes.

### Economy (Copays)

- **Ways to earn:** kills; a **Sanitation Streak** multiplier (capped at 1.5×); a **Spotless bonus** for a round with no damage taken; cleaning patients; **Insurance Reimbursement** at the end of each round (5% of unspent Copays, capped at $100), which creates a save-vs-spend choice.
- **Ways to spend:** doors (more space, more spawns), restocks, **upgrades (the main sink)**, Supply Requisitions (gamble), vending-machine buffs (max 3 per run), room-trap fees, and a first-aid kit.
- **Supply Requisition replaces the random crate:** you *choose 1 of 2* tools. "Appeal the denial" rerolls for more Copays. Each roll has a 5% "CLAIM DENIED" chance that gives a joke item (one cotton ball) plus a 50% refund. It's still a gamble, but with a decision, and it isn't the mystery box from the game it parodies.
- **Pacing target:** around round 4 you can afford *one* of: first door, first requisition, first upgrade. Pick.

### Sinus Purge (signature ability, fully specced)

- **Tap:** 240 px, 35 damage, knockback plus a 0.6 s stun (current values). **Hold 0.8 s to charge:** 340 px and +50% damage, but Eugene can't move while charging. A radius ring previews the area.
- **Cooldown:** 18 s, and **each kill takes 0.3 s off** (minimum 6 s). Aggressive play gets it back sooner.
- **Animation:** head tilts back, cheeks puff, the mask balloons, then release with a green shockwave, a lingering snot mist, and a camera zoom punch. **Audio:** a rising "sniiiff" while charging, then the HRRRNNNKKK (Noah's recording replaces the placeholder).
- **Counterplay:** Purge **breaks Diamond's red tape** instantly and flips Spore Pods.
- **Upgrades:** Neti Pot (+radius) · Saline Rinse (heals 4 per germ hit, max 30) · Allergy Season (leaves a slime zone that slows germs 50% for 3 s) · Deviated Septum (fires a 120° cone at double range).
- **Second ability slot (later):** *Running Late*, a coffee-fuelled dash with brief invincibility.

### Power-ups (drop as pills that blink and vanish after 10 s, so grabbing one is a risk)

From the brief: STAT CLEAN, DOUBLE COPAY, STERILE FIELD, CODE BLUE. New ones:
1. **PRIOR AUTHORIZATION**: every germ freezes for 5 s "pending approval".
2. **FREE REFILLS**: unlimited supply for 15 s.
3. **ER WAIT TIME**: all germs move at 30% speed for 8 s. They have to take a number.
4. **TRIAGE**: every hit is a crit for 10 s, and germs show red tags.
5. **TELEHEALTH**: spray range ×2 for 12 s. "Remote care."
6. **SECOND OPINION**: a ghost Moshi spawns and sprays alongside you for 10 s.
7. **HAZMAT SUIT**: you grow big, slow, and invincible, and bumping germs damages them.
8. **PANDEMIC PROTOCOL**: for 8 s every kill explodes, so kills chain.
9. **MALPRACTICE INSURANCE**: your next death revives you at 50% HP.
10. **FLU SHOT** (rare): +15 max HP for the rest of the run.
11. **BILLING ERROR**: gamble. Either +$500 or −$100, shown on a fake receipt.
12. **HOUSE CALL**: a Pal joins you for 15 s.

### Bosses

| Boss | Look | Attacks | Phases | Weakness | Arena interaction | Reward |
|---|---|---|---|---|---|---|
| **Diamond 2.0** (rematch, R10+) | Same, now with a headset | Mandatory Meeting, Write-Ups, Tantrum, **Performance Review** (ring of red-tape zones), **Schedule Change** (relocks one door for the round) | At 50% she "calls corporate" and sets up clipboard turrets | Purge cuts the tape. Hits on her back (the clipboard) are crits. | Doors | Upgrade voucher |
| **Patient Zero** | A huge man in a hospital gown with tissues stuck to him, holding a "WAITING 9 HRS" ticket | Cough cone (warned by an inhale), sneeze line, "It's just allergies" (spawns Sprinters) | P2 fever aura · P3 tries to **leave against medical advice** through the EXIT | Spraying fills a Compliance meter. When it's full he puts on a mask: no coughing for 8 s and he takes ×2. | Shoot the wall sanitizer dispensers to make slick puddles he slips on | Unlock a Pal: Nurse |
| **Methicillin the Unkillable** | A bunch of armored grape-like clusters (that's what staph looks like) | Cluster Shot (grapes hatch into germs), bowling-ball Roll | Three layers peel off | **Adaptive resistance:** once one tool has dealt enough damage, he resists it 80%. Switch tools, Purge, use traps. | Lure him into the lab Autoclave (unresisted damage) | Prescription Strength tier unlock |
| **The Influenza Twins, H & N** | Two balloon-like virions joined by a strand | The tether hurts if you cross it, plus spiral spit | P2 "antigenic shift": they swap which one is vulnerable | Kill both within 6 s of each other, or the survivor revives the other | Close the exam curtains between them to break the tether and stun both | Guaranteed Flu Shot + CME credits |
| **The Last Fax Machine** (secret) | A beige 1998 fax with a paper tongue and a red LED eye | Paper Jam (paper walls), Dial-Up Screech (warned stun ring), Toner Cloud (hides germs) | P2 "OUT OF PAPER" (vulnerable) · P3 cord exposed | Unplug it from 3 wall outlets during P2 | Records Room | Alternate ending + scrub-cap cosmetic |

No boss gets the per-round HP multiplier. Bosses get harder through new moves, not more HP.

### Rooms: one job and one interaction each, before adding any new rooms

| Room | Tactical identity | Interaction |
|---|---|---|
| Waiting Room | Start, patients, cart | Wall sanitizer dispensers: spray one and it spills a puddle that slows germs. A diegetic **"NOW SERVING #"** board doubles as the round counter. |
| Bathroom | Cheap, cramped | **Jet hand dryer:** a cone that blasts germs back (20 s cooldown). Toilet flush is part of the Easter egg. |
| Exam Rooms | Bays = chokepoints | **Privacy curtains:** temporary walls for 8 s (rebuilds the pathfinding grid, which is cheap). |
| Staff Break Room | Shopping | **Vending machine** (run buffs). **Microwave a fish:** a stench cloud that makes germs and patients flee for 15 s. |
| Lab | Narrow aisles, power | **Autoclave** trap. **Compounding Station** (upgrades). Centrifuge. |
| X-Ray | Busiest room, best payoff | **X-ray blast:** line damage plus every germ on the map is revealed for 10 s. A lead apron gives armor. |

On a phone screen the map stays readable thanks to **off-screen threat arrows** (sprint S8) and room names on the floor. No minimap needed.

### Progression between runs (skill still matters more than unlocks)

- **CME Credits** (Continuing Medical Education) come from achievements and run milestones and are spent on the **Residency Board**. Unlocks are mostly *new options*, not extra power: starting tools, Specialties (start-of-run perks such as "Infectious Disease: +25% vs viruses, −10% HP"), Pals, cosmetics. Stat bonuses are capped low (about +10% total).
- **Microbiology Atlas** (bestiary) entries unlock after 25 kills of a germ, each with a joke "clinical note". Also a stats page and per-tool mastery (cosmetic nozzle colors).
- **Save safety:** a schema version, a migration step, a prompt to install to the Home Screen, and an "export save code".

### Replayability

- **DONE (v0.19.0, M17):** **Today's Shift** (daily challenge: the date seeds the run and picks 2 modifiers; `core/rng.ts`) · **Modifiers:** Flu Season · Power Outage · Inspection Day · Short-Staffed (restocks ×3, not none, so runs stay winnable) · Construction (a door closes for a round, to Eugene only) · Full Moon · **Difficulties:** Walk-In / Urgent / Trauma Center, records per difficulty.
- **Leaderboards:** GitHub Pages can't host them, so defer until the Capacitor/TestFlight wrapper (Game Center).

### Humor kit (samples to build on)

- **Achievements:** *Elbow! ELBOW!* (clean 25 coughers) · *Against Medical Advice* (die in round 1) · *Prior Authorization Approved* (open every door) · *Nasal Irrigation Specialist* (10 kills with one Purge) · *Overtime, Unpaid* (reach round 20) · *First, Do No Harm* (clear a round without spraying a patient) · *Billing Department* (hold $2,000) · *Chronic Condition* (die to the same germ 5 runs in a row) · *Antibiotic Stewardship* (kill 50 Resistant elites).
- **Loading tips:** "Germs do not respect the waiting list." · "The magazines are from 2009. So are some of the germs." · "Sinus Purge is not a substitute for medical advice." · "Copays are non-refundable." · "The EXIT has never opened. Nobody knows why." · "If symptoms persist past round 20, consult a physician. You are the physician."
- **Item warnings:** Bottle: "70% isopropyl, 30% hope." · Bleach: "Do not mix with ammonia, sanity, or other weapons." · Fogger: "Not for indoor use. This is indoors." · UV Wand: "Do not look directly into wand." · Peroxide: "Fizzing means it's working. Or that it's angry."
- **Visual gags:** germs wear tiny masks under their chins · a "Wait time" sign climbs from 3 hrs to 14 hrs to ∞ each round · Diamond's office has an "Employee of the Month" frame holding a germ · killed germs lose a tiny halo that floats up · elites wear "RESISTANT" sashes.

### Easter egg quest: "The Miracle Cure" (DONE v0.23.0; as built, below the original spec)

1. **The 2009 magazine** (waiting-room table, interact during a break between rounds): an ad reads "IONIZER 9000! Call now!" and gives half a phone number.
2. **The front-desk phone:** call it and stay near the desk through 20 s of hold music *during a live round*. The operator gives code half A.
3. **Microwave a fish** (break room, $5): during the stench, a sticky note behind the fridge becomes readable. Code half B. The code is randomized each run.
4. **X-ray the vending machine** (X-ray room controls): it shows a key in slot B4. Buy B4 for $1 ("Mystery Key, expired 2011").
5. **Flush the third stall three times during a boss round.** A panel slides open: **RECORDS**. Key + code opens it.
6. **The Records Room:** fight The Last Fax Machine and take the **Ionizer 9000**. Win the run afterwards and you get the alternate ending ("SHIFT COMPLETE": Eugene clocks out, credits roll) plus the scrub cap from the backlog.

**As built (v0.23.0; logic in `systems/MiracleCure.ts`, words in `data/miracleCure.ts`).** Each step only appears once the one before it is done. The map has no break room, so the fish and fridge are in the Manager's Office (Diamond's). The code is two random 2-digit halves per run (seeded).
1. READ the magazine table in the waiting room **between rounds**: the IONIZER 9000 ad, 1-800-466-.... (During a round you get an old headline instead.)
2. The RECEPTION desk now offers CALL **during a round**: stay within 260 px for 20 s of hold music. The operator gives half A.
3. FISH at the office microwave ($5): 25 s of stench. Meanwhile READ behind the fridge: half B.
4. Fire the X-ray (controls in the X-ray room): the film shows a key in the snack machine, slot B4. Buy it ($1, not a snack).
5. FLUSH Stall 3 (upstairs, Bathroom 3) three times in one **boss round**: the RECORDS panel opens.
6. Between rounds, Stall 3 offers RECORDS: the Records Room (its own little floor; the break waits). Beat the Last Fax Machine: the Ionizer 9000 replaces your crate tool. LEAVE puts you back by Stall 3.
7. Clear one more boss round, then CLOCK OUT at the front door: credits, SHIFT COMPLETE, and Eugene wears his scrub cap from then on.
Testing: `?secret=records` (everything found, panel open) or `?secret=clockout`.

### Controls spec (iPhone, landscape)

- **Size check:** the screen is 720 logical px tall, which on a 393-pt-tall iPhone works out to about 0.55 pt per logical px. That makes the stick 88 pt across, SPRAY 77 pt, PURGE 55 pt, REFILL 48 pt, SWAP 44 pt. Everything meets Apple's 44 pt minimum. SWAP is borderline, so grow it to 46.
- **Spray zone (fixes B7):** any touch on the right half that doesn't land on another button sprays, and the SPRAY ring floats to the thumb the way the move stick does. **Dragging more than 28 px aims manually** for as long as that touch is held. Let go and auto-aim takes over again. This hybrid gives both control schemes at once.
- **Move stick:** keep the 15% dead zone and add full speed from 90% of the way out. The stick **follows the thumb** past its edge so direction changes stay sharp.
- **Auto-aim:** line-of-sight check, plus stickiness (only switch targets if a new one is 25% closer). Later, a priority setting: nearest / most dangerous (healers and Sneezers first).
- **Purchases:** **hold to buy** (a 350 ms fill ring) for anything ≥ $100 or anything that replaces a tool. Restock stays a tap.
- **Fewer buttons in the thumb zone:** move AUTO-AIM into the pause menu. Add an optional **auto-refill** (pours automatically when you spray an empty bottle).
- **Haptics:** Safari doesn't support `navigator.vibrate`. There's an experimental iOS 18 trick (toggling a hidden `<input type=checkbox switch>`), or the real fix in the Capacitor build (Haptics plugin).
- **Device test matrix:** iPhone SE (16:9), a 6.1" phone, a Pro Max, Safari with toolbars (3.2:1), and Home Screen mode. Keep controls at least 20 pt above the home-bar swipe area.

### Tech notes

- **Keep:** Phaser 3.90 and Arcade physics. The flow field, the pools, and localStorage are all fine (IndexedDB isn't needed at this data size).
- **Add:** a `?debug` stress mode with a performance overlay · frame-rate-independent easing · bitmap text for numbers and counters · a compressor on the master audio output, pitch variation, and a cap on simultaneous voices · audio resume handling · a handwritten service worker for offline play and an update prompt (no plugin needed) · seeded random numbers · a small behavior registry for germs and an enemy projectile pool · a speed-modifier stack on `Player`, replacing the single `moveScale` Diamond uses now (puddles and buffs need it too).
- **Fragile:** `core/orientation.ts` patches Phaser internals. Re-check it on any Phaser upgrade.

---

## 3. Prioritized roadmap

*Diff = development difficulty 1–10. Perf = performance risk. "Now" = this sprint.*

### P0: Fix immediately

| ID | Change | Why / player impact | Diff | Perf | When |
|---|---|---|---|---|---|
| P0-1 | Debug/stress mode (`?round=15&copays=2000&god=1&fps=30`) + performance overlay (frame-time p95, entity counts) | Lets us measure on a real iPhone. Everything else depends on it. | 2 | None | Now (S1) |
| P0-2 | Close the Copay farm / endless rounds (B1) | Stops infinite money and dragged-out rounds | 2 | None | Now (S2) |
| P0-3 | Pause button, auto-pause, audio resume, mute (B2, B3) | Interruptions are common on a phone. Sound coming back reliably matters a lot. | 3 | None | Now (S3) |
| P0-4 | Frame-rate-independent movement (B4) | Same game in Low Power Mode | 2 | None | Now (S4) |
| P0-5 | Spray zone, drag-to-aim, line-of-sight auto-aim, hold-to-buy (B5, B6, B7) | Controls hold up in chaos and you stop losing money by accident | 4 | Low | Now (S5) |
| P0-6 | Save versioning + install prompt + export code (B9) | Protects future progress | 2 | None | With P2-9 |

### P1: Core gameplay

| ID | Change | Why / player impact | Diff | Perf | When |
|---|---|---|---|---|---|
| P1-1 | Combat juice: hit squash, death pop, halo, crits, sound pitch variation and compressor, bitmap numbers | Every kill feels good | 4 | Low–med | Now (S6) |
| P1-2 | Sanitation Streak + Spotless bonus | Rewards clean, aggressive play with money | 3 | None | Now (S6) |
| P1-3 | **Perfect Pour** active refill + auto-refill option | Turns a chore into a skill check | 3 | None | Now (S7) |
| P1-4 | Off-screen threat arrows | You can read a big map on a small screen | 2 | Low | Now (S8) |
| P1-5 | Spore Pod + Sneezer (+ behavior registry, enemy projectiles) | Ends circle-kiting and gives tools a purpose | 6 | Low | Now (S9) |
| P1-6 | Compounding Station upgrades | You grow during a run; main Copay sink | 5 | None | Next sprint |
| P1-7 | Wave Director v2: designed rounds that teach, then combine, then pressure; relief rounds; threat budgets; HP growth capped at 2.2× | Difficulty from variety, not sponges | 5 | None | Next sprint |
| P1-8 | Sinus Purge depth (charge, kill refund, breaks tape) | The signature ability gets mastery | 3 | Low | Next sprint |

### P2: Depth

| ID | Change | Why / player impact | Diff | Perf | When |
|---|---|---|---|---|---|
| P2-1 | Rest of the germ roster | Recognizable threats, more strategy | 6 | Low–med | Sprint 3 |
| P2-2 | RESISTANT elites | Exciting spikes plus power-up delivery | 4 | Low | Sprint 3 |
| P2-3 | Power-ups (start with 6) | Memorable moments | 5 | Low | Sprint 3 |
| P2-4 | New tools (Wipes, Gel Launcher, Defib first) | New ways to play | 3–6 each | Low | Sprint 3–4 |
| P2-5 | Supply Requisition (choose 1 of 2, appeal) | The gamble becomes a decision | 3 | None | Sprint 3 |
| P2-6 | One interaction per room | The map itself becomes gameplay | 4–6 each | Low | Sprint 4 |
| P2-7 | Break-room vending machine | Spend choices | 4 | None | Sprint 4 |
| P2-8 | **Pals** (summonable coworkers: Nurse, Scribe, Rad Tech) | Delivers on the title | 6 | Low | Sprint 5 |
| P2-9 | CME Credits, Residency Board, Atlas, stats | "One more run" | 6 | None | Sprint 5 |
| P2-10 | Second ability (Running Late dash) | Movement skill | 4 | None | Sprint 5 |

### P3: Polish

| ID | Change | Why / player impact | Diff | Perf | When |
|---|---|---|---|---|---|
| P3-1 | Art pass: thick-outline cartoon style, a fixed color palette per germ family, sprite atlas | One coherent look; atlases also render faster | 7 | Positive | After the roster settles |
| P3-2 | HUD redesign (grouped info, bitmap fonts, "Now Serving" counter) | Readable while chaotic | 4 | Positive | Sprint 4 |
| P3-3 | Game over as a "Discharge Summary" (cause of death, best streak, what killed you), settings screen | Fair deaths make players retry | 3 | None | Sprint 4 |
| P3-4 | ~~Adaptive music in layers (calm / pressure / boss)~~ (v0.22.0) + Noah's voice lines | Tension curve | 5 | Low | Sprint 5 |
| P3-5 | Standard attack warnings (red floor decals, wind-up sounds) | Every hit feels avoidable | 3 | Low | With P1-5 |
| P3-6 | Transitions, loading tips, round banners | Feels finished | 2 | None | Sprint 4 |
| P3-7 | Sharper text, PWA offline, haptics trick | Feels finished | 1–3 | None | Opportunistic |

### P4: Expansion

| ID | Change | Diff | When |
|---|---|---|---|
| P4-1 | Bosses: Diamond 2.0, Patient Zero, Methicillin, H & N | 6–8 each | One per sprint, from Sprint 4 |
| P4-2 | ~~Miracle Cure Easter egg + Fax Machine + alternate ending~~ DONE v0.23.0 | 8 | After P2-6 rooms |
| P4-3 | ~~Today's Shift dailies, modifiers, difficulty modes~~ DONE v0.19.0 | 5 | After P2-9 |
| P4-4 | Night Shift map variant (lighting, then layout) | 6 | Late |
| P4-5 | Leaderboards / Game Center | 6 | With Capacitor |
| — | **Recommend cutting:** the first-person raycast view in the backlog. Costly, and a separate game. | — | — |

**A1 (architecture; needs your OK before Sprint 2):** split `GameScene` into an **Interactables** registry (each station is data + a handler: cart, door, crate, then upgrade station, vending machine, traps), an **Economy** module (Copays, prices, bonuses), and a **MapRenderer**. No behavior changes, and the smoke test has to pass unchanged. Diff 4.

---

## 4. Sprint M7 "Feel & Fairness": DONE (v0.7.0, Oct 14 2026; PRs #18–#26)

Built and shipped one item at a time, in this order. Each item: build → `npm run build && npm run smoke` → changelog/balance notes → you playtest.

### S1: Debug & stress mode
- **What:** URL options `?debug&round=N&copays=N&god&fps=30` plus an overlay showing frame-time p95, active germs, droplets, and particles.
- **Files:** new `core/debug.ts`; `main.ts` (fps limit); `WaveDirector` (start round); `GameScene.create`; `HudScene` (overlay).
- **Approach:** read the options once at boot. Everything stays off unless they're present.
- **Risks:** debug paths leaking into normal play. Keep them behind a single `DEBUG` flag.
- **Test:** smoke test still passes without options. On iPhone, `?round=15` gives the baseline numbers we compare against for the rest of the sprint.

### S2: Close the Copay farm / endless rounds
- **What:** patients only commit violations while the round still has germs left to spawn. Germs from violations respect `maxAlive`.
- **Files:** `WaveDirector` (`spawning` getter), `PatientDirector.update`, `GameScene.spawnGermAt`.
- **Risks:** the end of a round gets a bit quieter (intended). Patients stay in the room either way.
- **Test:** a new smoke step kills all but one germ, waits 20 s, and checks that no new germs appeared. Manual: round 2 ends on its own.

### S3: Pause, auto-pause, audio resume, mute
- **What:** a ⏸ button (top right) opens a menu with Resume / Sound / Auto-aim / Quit. The game pauses itself when the app is hidden or the phone rings. Tapping Resume brings audio back.
- **Files:** `core/sfx.ts` (`resumeAudio`, mute), `core/settings.ts` (`sound`), `HudScene` (button and menu; the AUTO-AIM toggle moves here), `GameScene` (pause/resume, clears stuck input), `main.ts` (visibilitychange / pagehide).
- **Risks:** stuck input after resume (firing stays on, or a stick is still held). Clear `inputState` and release the sticks on pause. Timers use scene time, so they freeze correctly.
- **Test:** iPhone: lock and unlock mid-round, take a call, switch apps, switch Safari tabs. Sound should come back every time. Smoke: fire `visibilitychange` and check the Game scene is paused.

### S4: Frame-rate independence
- **What:** replace per-frame easing with time-based easing (`1 − (1−k)^(dt/16.7)`), which is identical at 60 FPS.
- **Files:** `Germ.chase`, `Player.drive`, `Patient.walk`, plus a small `core/math.ts` helper.
- **Risks:** small feel changes. The formula matches 60 FPS exactly, so there should be none at 60.
- **Test:** `?fps=30` vs 60: knockback distance and time for a germ to reach Eugene within 5%. Noah tries Low Power Mode.

### S5: Controls pass
- **What:** (a) spray zone with drag-to-aim; (b) line-of-sight auto-aim with stickiness; (c) hold-to-buy, and the crate prompt says "REPLACES UV WAND".
- **Files:** `HudScene`, `HudButton` (hold option), `VirtualJoystick` (reused for the spray zone), `inputState` (aim override), `config/controls.ts`, `GameScene.nearestGerm` / `updateInteract`, `FlowField` (`lineClear()` grid raycast on a non-inflated wall grid).
- **Risks:** right-half touches used to be ignored and now spray. Three-finger conflicts (stick + spray + PURGE). The twin-stick and desktop mouse modes have to keep working. The smoke test taps SPRAY by coordinates and needs updating.
- **Test:** an updated smoke test (spray from an off-button right-half touch, drag-aim, hold-to-buy) and an iPhone checklist: thumb landing anywhere on the right, a germ behind the lab bench, Eugene standing next to a crate.

### S6: Combat juice + Sanitation Streak
- **What:** hit squash in the hit direction, a death "pop" (swell, then burst) with a halo floating off, 10% "STAT!" crits (×2, yellow), bitmap-font numbers, sound pitch variation (±8%) with the pop pitch climbing as your streak grows, a master compressor, a STREAK counter (kills within 2 s keep it going; Copays ×1 + 0.05 per 5 kills, capped at 1.5×), and a Spotless round bonus.
- **Files:** `Fx`, `Germ`, `GameScene.damageGerm` / `addCopays` / round end, `sfx`, `HudScene`, `BootScene` (font, halo texture), `config/balance.ts`, `events.ts` (`StreakChanged`).
- **Risks:** too much on screen, money inflation (the cap covers it), and performance (pooled, capped).
- **Test:** at `?round=15`, p95 frame time within +1 ms of the S1 baseline; log Copays per round before and after; you judge the feel.

### S7: Perfect Pour
- **What:** while REFILL pours, a bright window shows at 45–65% of the bar. Tap again inside it and the bottle is full instantly, plus FRESH BOTTLE (+20% damage for 4 s). Miss and it's "SPILLED!" (+0.5 s). Optional auto-refill setting. The self-charging UV wand is excluded.
- **Files:** `Sprayer`, `HudButton` (window arc), `BottleMeter`, `GameScene`, `data/equipment.ts` (window per tool), `config/balance.ts`, `sfx`, `settings`.
- **Risks:** the second tap landing late from lag. The window is generous and checked against game time.
- **Test:** smoke: request a refill, wait for the window, tap again, check it filled early. Manual: does it feel good, or like a chore?

### S8: Off-screen threat arrows
- **What:** edge arrows for germs within 900 px but off screen, colored by type, with bigger ones for the boss. Max 8, pooled.
- **Files:** `HudScene` (indicator layer), `GameScene` (getter for camera and germs).
- **Risks:** overlapping the HUD in the safe areas. Clamp the arrows inside a margin.
- **Test:** debug-spawn germs behind Eugene and check the arrows. Performance stays flat.

### S9: Spore Pod + Sneezer
- **What:** the first two germs that change how you move (specs in §2).
- **Files:** `data/germs.ts` (`behavior` field), new `systems/GermBehaviors.ts` (chase / armored / spitter), `entities/Germ.ts` (per-germ state), new `entities/Glob.ts` + a puddle pool, `Player` (speed-modifier stack, replacing `moveScale`, which Diamond also uses), `GameScene` (behavior dispatch, armor angle in `damageGerm`, overlaps), `BootScene` (textures), `data/waves.ts` (Sneezer from R4 with at most 3 alive, Spore from R6).
- **Risks:** speed modifiers stacking with Diamond's meeting slow (hence the stack), germs that keep their distance getting stuck on furniture (strafe using the flow field), the 60-germ pool, and auto-aim wasting spray on a shell's front (S5's priority handles it).
- **Test:** `?round=4` and `?round=6` with no console errors in smoke. Manual: flanking a Spore Pod works, UV pierces the shell, Purge flips it, Sneezer warnings are readable, puddles show clearly.

**Next (M8), agreed with Noah:** rebuild MoshiLand as a faithful version of the real clinic's floor plan (Noah's photos of the ground floor and upstairs; keep the photos out of the repo). Ground floor: waiting room on the street side, reception and manager's office, central lab island with a corridor loop around it, exam rooms 1–7 on the edges, two bathrooms, X-ray, elevator and egress stairs. Upstairs (bought via the stairs): exam rooms 8–15, the MA station island with its own loop, bathrooms, supply closets. Then: A1 refactor → Compounding Station → Wave Director v2 → Purge depth → elites + the first 6 power-ups.
