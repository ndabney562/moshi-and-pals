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
| Boss rounds | every 5th, boss + 50% escort | |
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
| Power-ups | elites always drop; others 1.2%; 10 s on the floor (blinks last 3 s) | Durations in `src/data/powerups.ts`, tuning in `BALANCE.powerups` |
| Special rounds | 7 Rush, 9 Slow Tuesday, 12 Outbreak, 14 Inspection, 17 Superbug; then odd non-boss rounds | `SPECIAL_ROUNDS` and `WAVES.specialFor` in `src/data/waves.ts` |
