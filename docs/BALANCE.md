# Balance Notes

Values live in `src/config/balance.ts` and `src/config/controls.ts`.

| Value | Current | Notes |
|---|---|---|
| Eugene move speed | 260 px/s | Waiting room is 1800×1100 (~7 s across); the whole building is 3800×2100 |
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
| Door prices | Bathroom 200, Exam Rooms 350, Lab 500, Break Room 600, X-Ray 750 | In `src/data/rooms.ts`; round 1 earns ~$50 |
| USE range | 80 px from a cart or door's edge | |
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
| HP / speed scaling per round | +10% / +3.5% (speed capped 1.6×) | |
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
