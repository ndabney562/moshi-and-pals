# Balance Notes

Values live in `src/config/balance.ts` and `src/config/controls.ts`.

| Value | Current | Notes |
|---|---|---|
| Eugene move speed | 260 px/s | Ground floor 3400×3740, upstairs 3080×3400 (side by side); waiting room ~1230×1480 |
| Joystick radius | 80 px | Logical pixels (screen is 720 tall) |
| Joystick dead zone | 15% | |
| Aim threshold | 30% | Right stick must be pushed this far to count as aiming |
| Bottle capacity | 120 mL | 1 mL per shot, ~11 shots/s → ~11 s of continuous spray |
| Droplet damage | 4 × 2 per shot | ~88 DPS if every droplet lands |
| Spray range / spread | 200 px / 14° | Was 300; Noah: too long |
| Auto-aim range | 240 px | Slightly beyond spray range so Eugene turns before germs arrive |
| Refill time | 1.1 s | Pours from the jug |
| Jug (reserve) | 480 mL (4 refills) | Restock at SUPPLIES cart for $40 Copays |
| Copays per kill | Basic 5, Sprinter 8, Write-Up 2, Diamond 100 | Cleaning a patient: 10 |
| Door prices (M8) | Hallways 250, Exam 1-4 150, Exam 5-7 200, Supply Closet 150, Bathrooms 100, Manager 150, Lab 500, X-Ray 600, Egress 200, Upstairs 1000; upstairs Exam 8-11 150, 12-15 200, Supply Closet 2 150 | In `src/data/clinic.ts`; round 1 earns ~$50 |
| Map scale (v0.19.1) | 2.4 game px per floor-plan px (was 3) | `S` in `src/data/clinic.ts`; furniture, rooms and spawns scale with it, door widths (110-140) and wall thickness (30) don't |
| USE range | 80 px from a cart or door's edge | Hold 350 ms to buy at $100+ or when replacing a tool |
| Spray zone / drag-aim | right half below 22% of height / 28 px drag | `CONTROLS.sprayZoneTop`, `dragAimDistance` |
| Auto-aim stickiness | keeps target unless another is 25% closer | Line of sight required |
| Germ spawn distance | at least 380 px from Eugene, preferably within 1600 px | Only from rooms that are open |
| Sinus Purge | 240 px, 35 damage, big knockback, 0.6 s stun | 18 s cooldown; ready at start |
| Supply crate | $250 Copays, random tool not already held | `BALANCE.economy.crateCost`; tools in `src/data/equipment.ts` |
| Lysol Fogger | 6 puffs × 3 dmg every 120 ms, 75° cone, 160 px | 200 mL tank, 2/shot, jug 600 |
| Bleach Super Soaker | 1 × 10 dmg every 70 ms, 400 px, knockback 45 | 300 mL tank, 3/shot, jug 900 |
| UV Wand | 1 × 6 dmg every 60 ms, 280 px, pierces 3 | 100% charge, 2/shot, recharges 22%/s after 0.4 s; spores ×1.5 |
| Peroxide Foamer | 3 × 4 dmg every 110 ms, 24° cone, 220 px | Slows to 45% for 1.6 s (not bosses); 150 mL, jug 450 |
| Basic Germ HP / speed | 40 / 95 px/s | Was 75; Noah: round 1 too easy |
| Eugene HP / invulnerability | 100 / 0.7 s | |
| Regen | 6 HP/s after 6 s unhurt | Was 12/s after 4.5 s; Noah never lost health |
| Contact damage | Basic 15, Sprinter 8, Write-Up 6, Diamond 30 | |
| Viral Sprinter | 16 HP, 165 px/s | From round 3; up to 50% of a round's mix |
| Round size | 10, 13, 16, 20, 23... | `10 + 3(r-1) + 0.15(r-1)²` (was 6 + ...) |
| Max alive | 10 at r1, up to 28 | Readability + iPhone performance |
| HP / speed scaling per round | +10% (capped 2.2×, round 13) / +3.5% (capped 1.6×) | Bosses' HP capped at 1.5× |
| Breather | spawns ×1.6 slower while Eugene < 30% HP with ≥ half the round's max alive | `WAVES.breather` |
| Score bonuses | streak ≥ 10: +5 per kill; Spotless: +25 × round | `BALANCE.streak.scorePerKill`, `economy.spotlessScorePerRound` |
| Spawn interval | 750 ms at r1, -50 ms/round, min 260 | Was 940 ms at r1 |
| Boss rounds | every 5th, boss + 50% escort | Order: Diamond, Patient Zero, Methicillin, Influenza Twins (`WAVES.bossOrder`) |
| Diamond | 850 HP, 55 px/s, 92% knockback resist, radius 62 | Tuning in `BALANCE.diamond` |
| Mandatory Meeting | every 10 s within 320 px; pull 150 px/s, Eugene walks at 35% | Break free with 80 damage; door = 30 damage + shove |
| Write-Ups | 3 per 20% of her health lost | 10 HP, 170 px/s |
| Policy Tantrum | below 40% health, every 7 s, 280 px stomp | 8 damage + knockback |
| Intermission | 5 s | Time to refill |
| Patients | from round 2, max 1 + round/3 (cap 3), every 9-16 s | None in boss rounds; leave after 30 s |
| Violations | every 5-8.5 s while the round still has germs to spawn | 1-2 germs each (Basic or Sprinter); skipped at the max-alive cap |
| Cleaning a patient | 8 droplet hits | +25 points |
| STAT! crit | 10% of droplet hits, ×2 damage | `BALANCE.feedback.critChance/critMult` |
| Sanitation Streak | kills within 2 s chain; +5% Copays per 5 kills, max 1.5× | `BALANCE.streak` |
| Spotless round | $10 × round number if Eugene isn't hurt | `BALANCE.economy.spotlessPerRound` |
| Perfect Pour | sweet spot 45-65% of the refill; +20% damage for 4 s; miss = +0.5 s once | `BALANCE.pour` |
| Spore Pod | 50 HP, 70 px/s, 18 contact, $15 | Front 120° ×0.25, back 120° ×1.5, turns 70°/s; Purge flips 2 s; from r6, 2-5 alive |
| Sneezer | 24 HP, 110 px/s, 8 contact, $10 | Keeps 260 ± 60 px; 0.7 s wind-up; glob 10 dmg, 300 px/s, 420 px; puddle 52 px, 2.5 s, Eugene ×0.55; from r4, 2-4 alive |
| Compounding Station | tier II $300, tier III $700, per tool | `tiers` in `src/data/equipment.ts` |
| Exam table rest | $40 for +50 HP, once per table per round | `BALANCE.economy.restCost/restHeal` |
| RESISTANT elites | from r8, 5% +1%/round (max 14%); ×2.5 HP, ×1.25 size, ×3 Copays/points | Shielded 50% bubble, Hasty ×1.35, Regenerating 4%/s, Splitting into 2 basics; `BALANCE.elites` |
| Power-ups | elites always drop; others 1.2%; 10 s on the floor (blinks last 3 s); Flu Shot +15 max HP, ×0.25 as likely as the others | Durations in `src/data/powerups.ts`, tuning in `BALANCE.powerups` |
| Special rounds | 7 Rush, 9 Slow Tuesday, 12 Outbreak, 14 Inspection, 17 Superbug; then odd non-boss rounds | `SPECIAL_ROUNDS` and `WAVES.specialFor` in `src/data/waves.ts` |
| Patient Zero | 1100 HP, 52 px/s, 20 contact, $150 | Cough every 4.2-6 s (55° × 330 px, 14 dmg, 3 Sprinters); sneeze below 60% every 9 s (5 globs); mask after 70 hits for 8 s (×2 damage); leaves below 25%; `BALANCE.patientZero` |
| Methicillin | 1300 HP, 48 px/s, 20 contact (26 rolling), $175 | Resists a source for 14 s (×0.2) after 260 damage from it; autoclave ×1.5, never resisted; drops a Prescription (tool in hand to tier III free; $700 if all maxed, `BALANCE.economy.prescriptionMaxedCopays`); layers peel at 2/3 and 1/3 (4 Basic Germs each, attacks ×0.8 interval); Cluster Shot every 4.5-6.5 s (3 grapes); Roll every 7-9.5 s (560 px/s, 1.5 s); `BALANCE.methicillin` |
| Influenza Twins | H and N 520 HP each, 70 px/s, 16 contact, $90 each | Strand 12 dmg; only a shut exam curtain snaps it (2.2 s stun, 5 s regrow); revive after 6 s at 50%; shift below 50% combined (other twin ×0.15, swap every 6 s); spiral of 8 globs every 5-7 s; always drops a Flu Shot; `BALANCE.influenza` |
| Diplococcus Duo | 46 HP, 90 px/s, 14 contact, $10; from r7, 10% +2%/round (max 20%) | Splits into 2 Monococci (16 HP, 135 px/s, 8 contact, $3) |
| Bacillus Bulldozer | 60 HP, 80 px/s, 12 contact, $14; from r8, 7% +1%/round (max 14%), 2-4 alive | Charges within 420 px with line of sight: 0.8 s aim, 560 px/s for 0.9 s, 24 damage; cooldown 2.8-4.2 s; a wall dazes it 1.5 s at ×2 damage taken |
| Chonk Coccus | 380 HP, 55 px/s, 22 contact, $35, no knockback; from r8, 2.5%, 1 alive | Bursts into 6 Basic Germs |
| Mother Culture | 40 HP, 95 px/s, 6 contact, $16; from r9, 5%, 1 alive (2 from r14) | Keeps 330 px away; heals germs within 200 px by 10 HP/s (not bosses) |
| Colony | from r10, 5%, 2 alive | 8 Specks (6 HP, 150 px/s, 4 contact, $1) |
| Mold Spot | 120 HP, rooted, 10 contact, $20; from r11, 3.5%, 2 alive | Spawns at the farthest open door; a spore every 6 s (12 HP, 120 px/s), up to 5 per Mold Spot. Fungus: bottle ×0.6, fogger ×0.8, bleach ×2, UV ×1, foamer ×0.8 |
| Supply Requisition | $250; pick 1 of 2; appeal $100 +$50 per appeal; 5% denied (50% back) | `BALANCE.economy.crateCost/appealCost/appealStep/claimDeniedChance/deniedRefund`; pool `CRATE_POOL` |
| Disinfectant Wipes | 16 per swipe in a 150° × 100 px arc, every 3rd ×2.5 at 135 px; 0.28 s; 40 wipes, box of 160 | Biofilm ×1.6, fungus ×1.3, spore ×0.6; tiers 200° / 120 px, then DEEP CLEAN every 2nd |
| Gel Launcher | 30 in a 95 px burst, up to 380 px; 0.62 s; 10 gels, case of 40 | Gel 85 px, 3.5 s, germs ×0.45 (not bosses); tiers 5.5 s at ×0.3, then 42 damage, 125 px burst |
| Defib Paddles | 26 to the first germ within 170 px in front, then 4 jumps of 170 px at ×0.85 each; 0.35 s stun | 25% charge per zap, 30%/s recharge; tiers 6 jumps and 32 damage, then 60%/s and 0.9 s stun |
| Hand dryer (bathrooms) | free; 240 px; 20 damage, 950 knockback, 0.9 s stun; 20 s recharge | `BALANCE.traps.dryer` |
| Autoclave (Lab) | $25; 1.2 s hiss, then 140 in 175 px (ignores armor); 30 s recharge | `BALANCE.traps.autoclave` |
| Exam curtains (each exam doorway) | free; a wall for 8 s; 20 s recharge | `BALANCE.traps.curtain` |
| X-ray (controls) | $40; 60 to everything within 520 px of the machine, through walls; 25 s recharge | `BALANCE.traps.xray` |
| Vending machine | 3 random of 5 snacks, each once, 3 per run; $100-150 | `src/data/vending.ts`, `BALANCE.vending` |
| CME Credits | 1 per 2 rounds, 3 per new achievement, 2 per boss | `CME` in `src/data/residency.ts` |
| Specialties | 8-12 CME each; one active | `SPECIALTIES` in `src/data/residency.ts` |
| Starter Kit | 15 CME; start with any crate tool | `STARTER_KIT_COST` |
| NPS Scores | 1 per round reached, 1 per patient cleaned, 3 per boss | `BALANCE.nps`; a round-8 shift with a few patients is ~12 |
| Hiring the Pals | Kaya 30, Lucien 45, Ken 60 NPS (Eugene free) | `BALANCE.nps.prices` |
| Hired Pals' edge | All ×1.1 tool damage; Kaya ×1.12 speed, Lucien +30 health, Ken +15 health | `BALANCE.doctors` |
| Atlas notes | unlock at 25 lifetime kills (bosses 1) | `src/data/atlas.ts` |
| Dr. Kaya: CODE BLUE | 320 px sprint in 0.23 s, untouchable +0.25 s; 90 px lane, 30 damage, 650 knockback, 0.7 s stun; 9 s recharge. Passive ×1.12 speed, ×1.1 damage | `BALANCE.codeBlue`, `src/data/characters.ts` |
| PA Lucien: CLEAN FIELD | 180 px zone for 6 s; germs ×0.4 speed, 22 damage/s; 20 s recharge. Passive +30 health, ×1.1 damage | `BALANCE.cleanField` |
| Ken: FILE A GRIEVANCE | 35 damage in 210 px, 420 knockback, 0.9 s stun; Diamond within 900 px goes to HR for 3.5 s (frozen, no meeting or tantrum, a meeting ends); 15 s recharge. Passive ×1.5 damage to Diamond from every source, +15 health, ×1.1 damage | `BALANCE.grievance`, `src/data/characters.ts` |
| Scribes | 12 CME each to hire; pill joins the drop pool once hired; 20 s per visit; follow 85 px behind, 300 px/s (×1.5 when 220 px+ away); teleport past 650 px or 1.5 s stuck | `BALANCE.scribes`, costs in `src/data/scribes.ts` |
| Omar | 13 damage every 0.42 s to the nearest germ within 280 px | `BALANCE.scribes.omar` |
| Alan | 26 damage every 0.95 s, jumps to 2 more germs within 160 px, 0.4 s stun | `BALANCE.scribes.alan` |
| Scribes vs patients | one "spray" every 0.3 s on a patient with a violation within 240 px (8 to clean, as Eugene's droplets) | `BALANCE.scribes.cleanEveryMs`, `BALANCE.patients.hitsToClean` |

## M17: Today's Shift, modifiers, difficulty (`BALANCE.difficulty`, `daily`, `modifiers`)

| Value | Current | Notes |
|---|---|---|
| Walk-In | germ HP ×0.75, damage to Eugene ×0.6, spawn interval ×1.25, kill Copays ×1.2 | Own records |
| Urgent | all ×1 | The game as tuned; Today's Shift always uses it. v2 records became Urgent's |
| Trauma Center | germ HP ×1.35, damage ×1.4, spawn interval ×0.8, kill Copays ×0.85 | Own records |
| Today's Shift | 2 modifiers from the date; first finished shift each day +2 CME | Day's best kept apart from difficulty records |
| Flu Season | Sprinter spawn weight ×2; weight 0.15 (×2) in rounds 1-2 | |
| Power Outage | dark at 90% opacity, light radius 330 px, soft outer 45% | Texture drawn at 1/4 size |
| Inspection Day | Spotless ×3 | Stacks with the Inspection Day special round (×9) |
| Short-Staffed | restock ×3 ($120) | Not "no restocks": runs must stay winnable |
| Construction | from round 2, one opened room per round closes to Eugene | Not his room, no door within 140 px, only if he can still walk to the waiting room; germs pass |
| Full Moon | germ looks ×0.7-1.45 (hitboxes unchanged), moonlit floor, patients walk backwards | |

## Music (`src/config/music.ts`, songs in `src/data/music.ts`)
| Value | Current | Notes |
|---|---|---|
| Music volume | 0.32 | Sound effects are 0.5; paused ducks music to 30% |
| Clinic theme / boss theme | 108 BPM, light swing / 140 BPM, straight | Song changes wait for the next bar |
| Pressure layer in a round | at least 35%; climbs from 20% to 70% of the round's germ cap | Full at or below 30% health; off between rounds |
| Layer fade | 0.8 s time constant | Fade-out on game over 1.2 s |

## The Miracle Cure (`BALANCE.miracleCure`, `BALANCE.faxMachine`; walkthrough in ROADMAP)
| Value | Current | Notes |
|---|---|---|
| Phone hold | 20 s within 260 px of the front desk, during a live round | Walking away or the round ending drops the call |
| Fish | $5, 25 s of stench | The fridge's sticky note is readable only during the stench |
| Mystery Key (vending B4) | $1 | Doesn't count toward the 3-snack limit |
| Stall 3 | 3 flushes in one boss round | Needs the key and both code halves |
| Last Fax Machine | 1400 HP (× the round's HP scaling, boss cap), 18 contact | Fought between rounds; the break waits |
| Fax volley | 4 pages every 3.2 s (2.4 s below half health) | Fax Page: 9 HP, 190 speed, 5 contact |
| Dial-up screech | below 75%: every 7 s, 1.1 s wind-up, 230 px, 22 damage | Step outside the red ring |
| Paper jam | below 50%: every 9 s, 2.6 s, takes ×2 damage | |
| Ionizer 9000 | 3 droplets × 9, ×1.3 vs everything, pierces 2, 300 range, recharges 30%/s | Replaces the crate tool |
| Clock out | after one more cleared boss round with the Ionizer | Ends the run as SHIFT COMPLETE; unlocks the scrub cap |
