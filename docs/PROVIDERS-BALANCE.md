# Approved provider implementation and initial balance

October 26, 2026. The user approved all seven first/second ability designs and the six photo-based appearances before implementation. Jason uses the original burgundy-scrub description. Reference photos stay local and gitignored.

| Provider | Hire / second NPS | First cooldown | Second cooldown | Initial tuning |
|---|---:|---:|---:|---|
| Jason | 180 / 120 | 18 s | 24 s | Three 28-damage pulses, 185 radius, 450 ms apart; 5 s helper cadence ×1.35. Second recalls helpers with ×1.25 damage / ×1.5 cadence for 7 s. |
| Dhiwya | 240 / 160 | 18 s | 24 s | Eight nearby priority targets marked for +50% damage for 6.5 s. Second gives 8 s of +35% damage, +50% action rate, or +30% movement, tied to the seeded scrub palette and announced on screen. |
| Raj | 160 / 100 | 16 s | 22 s | Honey: 9 DPS / 60% slow for 6 s. Ginger: 70 damage / strong knockback. Lemon: up to five unique targets, 42 initial damage with 10% falloff. Tea: 20 DPS for 4.5 s. Ingredient purchases restore 5 s of first charge and select the effect. Second combines one of each available ingredient at ×1.2 strength and restores up to 12 s of first charge; with an empty pantry, makes a stronger tea. |
| Lidiya | 260 / 180 | 18 s | 26 s | Solo multiplier starts at ×1.6, drops 0.15 per present helper, floor ×0.65. Companion is exempt and doubles the resulting multiplier. First: 66 base area damage. Second: 70 base with companion / 45 alone, plus a 100-damage companion strike. Companion has a separate 18-damage / 900 ms ranged attack. |
| Dharma | 200 / 140 | 16 s | 24 s | Starts with thrown fictional capsules; +40% medication damage. First: five-ray volley, 24 damage per connecting ray before medication bonus. Second: 8 s of +50% medication cadence and chain attacks, plus half a tool refill. |
| Amanda | 25 / 25 | 20 s | 22 s | Movement and normal tool damage ×0.01; no hidden removal of the gag penalties. First: 7 s cloud, 65% slow / 1 DPS. Second: 5.5 s decoy pulling normal germs toward its fixed location; bosses retain their control rules. Complains every 18 s. |
| Janeen | 10,000 / 1,500 | 28 s | 30 s | Tool damage ×4, movement ×1.4, +250 HP, helper output ×2. First: 240 area damage, 80 healing, 6.5 s rally. Second: 360 area damage, 100 healing, 5 s protection, 8.5 s apex rally. |

All second abilities have separate buttons/cooldowns, use F on a keyboard, require the provider to be hired and the second ability purchased, and spend NPS only after confirmation. Q activates the first. Existing saved hires remain owned. The dedicated Providers scene supports all eleven providers and is opened by both the web title and the iOS Play menu.

**Intentional (Noah, Oct 30, 2026):** Janeen's 4x damage, +250 HP and 10,000 NPS price and Amanda's 1% movement and damage are jokes on purpose, not bugs. Don't rebalance them.

Janeen is strongest at equivalent tools/upgrades, including comparison with Lidiya's doubled solo multiplier. The game permits unlimited health-snack purchases; this does not claim an unupgraded Janeen has more health than an arbitrarily upgraded different run. No existing snack caps or saves were silently changed.

Call-out scheduling, trainee events, the full distraction event system, Flu Season, Alexandra and the shared leaderboard remain separate expansion milestones. Rally abilities gather active combat helpers and clear their interruption flag; the separate random distraction system has not been shipped here. Standard shift saves restart the round with temporary effects fresh, as before. Raj's consumed pantry is explicitly persisted and restored; Lidiya's companion identity is derived from the run seed and returns when upstairs is open.
