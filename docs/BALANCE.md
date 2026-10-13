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
| Basic Germ HP / speed | 40 / 75 px/s | Dies in ~0.5 s of focused spray |
| Eugene HP / invulnerability | 100 / 0.7 s | |
| Regen | 12 HP/s after 4.5 s unhurt | Zombies-style; encourages backing off |
| Contact damage | Basic 12, Sprinter 8, Boss 25 | |
| Viral Sprinter | 16 HP, 165 px/s | From round 3; up to 50% of a round's mix |
| Round size | 6, 9, 12, 16, 19... | `6 + 3(r-1) + 0.15(r-1)²` |
| Max alive | 8 at r1, up to 28 | Readability + iPhone performance |
| HP / speed scaling per round | +10% / +3.5% (speed capped 1.6×) | |
| Boss rounds | every 5th, boss + 50% escort | Placeholder boss: 700 HP, 60 px/s, 85% knockback resist |
| Intermission | 5 s | Time to refill |
