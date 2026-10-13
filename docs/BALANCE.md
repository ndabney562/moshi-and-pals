# Balance Notes

Values live in `src/config/balance.ts` and `src/config/controls.ts`.

| Value | Current | Notes |
|---|---|---|
| Eugene move speed | 260 px/s | Room is 1800×1100; crossing it takes ~7 s |
| Joystick radius | 80 px | Logical pixels (screen is 720 tall) |
| Joystick dead zone | 15% | |
| Aim threshold | 30% | Right stick must be pushed this far to count as aiming |
| Bottle capacity | 120 mL | 1 mL per shot, ~11 shots/s → ~11 s of continuous spray |
| Droplet damage | 4 × 2 per shot | ~88 DPS if every droplet lands |
| Spray range / spread | 200 px / 14° | Was 300; Noah: too long |
| Auto-aim range | 240 px | Slightly beyond spray range so Eugene turns before germs arrive |
| Refill time | 1.1 s | Free for now; costs currency from M4 |
| Basic Germ HP / speed | 40 / 95 px/s | Was 75; Noah: round 1 too easy |
| Eugene HP / invulnerability | 100 / 0.7 s | |
| Regen | 6 HP/s after 6 s unhurt | Was 12/s after 4.5 s; Noah never lost health |
| Contact damage | Basic 15, Sprinter 8, Cousin 6, Babushka 22 | |
| Viral Sprinter | 16 HP, 165 px/s | From round 3; up to 50% of a round's mix |
| Round size | 10, 13, 16, 20, 23... | `10 + 3(r-1) + 0.15(r-1)²` (was 6 + ...) |
| Max alive | 10 at r1, up to 28 | Readability + iPhone performance |
| HP / speed scaling per round | +10% / +3.5% (speed capped 1.6×) | |
| Spawn interval | 750 ms at r1, -50 ms/round, min 260 | Was 940 ms at r1 |
| Boss rounds | every 5th, boss + 50% escort | |
| Babushka Bacillus | 700 HP, 62 px/s, 85% knockback resist | Tuning in `BALANCE.babushka` |
| Homesick Haul | every 10 s within 320 px; pull 150 px/s, Eugene walks at 35% | Break free with 80 damage; door = 30 damage + shove |
| Little Cousins | 3 per 20% of her health lost | 10 HP, 170 px/s |
| Guilt Trip | below 40% health, every 7 s, 280 px wail | 8 damage + knockback |
| Intermission | 5 s | Time to refill |
