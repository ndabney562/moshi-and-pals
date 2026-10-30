# Gemini benchmark review — vetted summary

October 27, 2026. User request: use Gemini when practical for comparative game
design reviews. Explicit clarification: **keep top-down; benchmark mechanics**.
No gameplay, balance, camera or multiplayer changes were made in this review.

## What Gemini actually reviewed

The installed Gemini CLI 0.66.0 completed two read-only passes against a curated
public-code packet and current title, Providers and gameplay screenshots. The
game snapshot is published merge `fd005b3`, source prefix `330205bb9be1`.
Gemini did not play the game or inspect every repository file. The second pass
received verified excerpts correcting omissions and conflicts in the first.

CLI statistics reported `gemini-3.1-pro-preview-customtools` and
`gemini-3-flash-preview`; the configured model/account defaults were retained.
The completed passes used five and three `read_file` calls respectively, with
no model edit, shell or MCP calls. Extensions were disabled. The input packet
excluded private source photographs, credentials and personal notes. See the
[execution receipt](2026-10-27-gemini-review-receipt.json).

## Benchmark evidence and limits

This is an initial comparison set. The sources establish whole-game reception
and documented mechanics; a current cross-game ranking of the individual modes
was not available. Steam figures are dated, potentially cached page snapshots
accessed October 27, and measure **English whole-title reviews**, not mode
population, sales or a mechanic's effect on retention.

| Reference | Scope and evidence | Transferable principle |
| --- | --- | --- |
| BO6 Zombies | Exact round-based reference. A deliberately selected 2024 installment; no Zombies-only success metric verified. [Treyarch deep dive](https://www.callofduty.com/blog/2024/08/call-of-duty-black-ops-6-zombies-deep-dive-terminus-map-intel). | Spend decisions compete with opening routes; support tools have distinct purposes. |
| Killing Floor 2 Survival/Endless | Exact wave/horde reference. Steam snapshot: 88% positive, 42,295 English reviews. [Steam](https://store.steampowered.com/app/232090/Killing_Floor_2/?l=english), [Endless and optional territory defense](https://killingfloor2.com/InfiniteOnslaught18/). | Optional positioning objectives and distinct enemy priorities. |
| Left 4 Dead 2 Survival | Open-ended holdout reference, with different round/economy structure. Steam snapshot: 97% positive, 234,560 English reviews. [Valve store](https://store.steampowered.com/app/550/Left_4_Dead_2/). | Pressure/recovery and overlapping enemy threats. Valve's [foundational Survival scheduling article](https://www.l4d.com/blog/post.php?id=2417) describes L4D1; it does not establish identical L4D2 timings. |
| Deep Rock Galactic/Bosco | Adjacent mission-based reference. Steam snapshot: 97% positive, 171,518 English reviews. [Valve store](https://store.steampowered.com/app/548430/Deep_Rock_Galactic/), [developer solo-helper FAQ](https://www.deeprockgalactic.com/faq-test-page), [historical audio/helper notes](https://www.deeprockgalactic.com/updatesold). | Complementary jobs and recognizable threat cues; no need to import its camera, mining or networking. |

## Priorities after verification

These are **hypotheses for prototypes**, not measured improvements. Codex
adaptations below are explicitly separate from Gemini's raw proposals.

| Priority | Current evidence | Vetted next experiment | Validation and risks |
| --- | --- | --- | --- |
| 1. Clearer actual enemy states | `GameScene.armorMult` uses facing, piercing and `Germ.isFlipped`; `GameScene.hit` already gives shell-block text/SFX, and `Germ.chase` already tints flipped Pods. | Codex adaptation of Gemini's readability idea: make a Spore Pod's protected facing and real flipped/vulnerable state easier to recognize with a consistent shape cue. Preserve existing feedback and damage rules. No HP-triggered armor removal. | Compare recognition in five short muted-screen scenarios before/after; record correct flank/UV/Purge choices and obscured cues. Risks: clutter, falsely signaling vulnerability, reduced-motion conflicts. |
| 2. Optional spatial objective | `WAVES.specialFor` supplies special rounds; `WAVES.bossEvery` makes round 5 a boss. `clinic.ts` defines actual exam rooms and costs. | Retain Gemini's optional room-objective concept for a later prototype: use an already unlocked, reachable, nonsecret exam room in an ordinary round. No additional purchases, forced participation, cleared-round delay or permanent-currency reward by default. | Observe whether players deliberately visit different rooms and still understand the main survival objective. Risks: door bottlenecks, room closures, unfair spawns and reward inflation. Objective timing/reward remain user decisions. |
| 3. More intentional helper teamwork | `Scribes` already has targeting, distractions, imaging, trainees and rallies. `peroxideFoamer.slow` and `Germ.slowUntil` already exist; slow effects currently skip bosses in `GameScene.hit`. | Gemini proposed a helper bonus against slowed enemies. Codex narrows the initial experiment to **target-priority/focus feedback**, with existing rate, damage and trainee multipliers preserved. Foamer-specific attribution would require an explicit new contract; any general slow is not automatically a foamer tag. | Observe whether players understand which enemy a helper is helping against and deliberately use the interaction. Risks: target oscillation, changing provider strength, misattributed debuffs and buff stacking. Do not assume a DPS increase is needed. |
| 4. Complement existing pressure feedback | `GameScene.updateMusic`, `setMusicMix`, hidden low-health pacing, threat arrows and the Flu Season supply banner already exist. | Retain Gemini's audio-readability direction only as an optional distinct cue for an actual high-threat event, paired with a visual cue when sound is muted. Use real IDs such as `sprinter`; do not add a constant per-enemy audio loop or announce hidden assistance by default. | Ask players to identify the threat with sound on/off while observing hits and audio clutter. Risks: confusing music/callouts, performance, accessibility and falsely implying safety. |

## Recommended first prototype

**Spore Pod state readability**, selected by Codex after reviewing Gemini's
ideas. Gemini's refined first choice was a +50% helper fire-rate bonus; that
numerical buff is not approved or established as the safest next change.

1. Show one clear protected-facing cue and a distinct cue only while the Pod is
   actually flipped. Make them work without sound or color alone.
2. Keep `armorMult`, health, damage, attack cadence, rewards, wave composition,
   trainee rules and provider abilities unchanged.
3. Respect pause, reduced motion, viewport rotation and the existing pool of
   germs; leave no stale effects when a Pod expires or is reused.
4. Use the same five local encounter scenarios with baseline/new visuals. Treat
   four correct identifications out of five as a **proposed target**, not a
   result already achieved; note time to identify and mobile screen obstruction.
5. Only proceed after the user selects this prototype. Run appropriate local
   regressions for armor, Purge, pooling and mobile rendering before delivery.

An alternative low-balance-risk next step, added by Codex, is a compact persistent
helper availability display. `HudScene` currently announces helper events via
transient banners and `Scribes` has world markers/bubbles. A persistent display
would need to add value beyond those existing cues and preserve PSRs' noncombat
role. This was not Gemini's selected first prototype.

## Suggestions rejected or corrected

1. Clear/delay trainees or remove their penalty with a special, supply closet
   or new rally. Approved .33 movement, .33 cadence and .33 raw output remain;
   rate and damage compound to approximately .1089 combat DPS.
2. Claim adaptive pacing, pressure music, shell-hit feedback or helper rallies
   are missing. Each already exists in the current source.
3. Display armor as broken below 40% HP, invent a Pharmacy room, or place a
   new ordinary objective in boss round 5. These do not match the implementation.
4. Treat invented names such as `Scribe.omar`, `SinusPurge.trigger`, `viral` or
   `TriggerVolume` as existing integrations; treat a low-HP Sprinter as a
   high-HP benchmark; or equate halving interval with +50% attack rate.
5. Call temporary score a CME credit, award permanent currency without a
   progression decision, assume a documented whole-title metric ranks a mode,
   or promise player-retention gains without playtests.

The [initial](2026-10-27-gemini-initial-raw.md) and
[refined](2026-10-27-gemini-refined-raw.md) outputs are archived as **unverified
advisory text** for transparency. Neither is an implementation instruction.

## Outcome

Standing workflow is recorded in `AGENTS.md`, `GEMINI.md`, `CLAUDE.md` and
`docs/GEMINI-BENCHMARK-WORKFLOW.md`. Announce future substantial Gemini reviews
and their completion, retain source/constraint checks, and report unavailability
honestly. No prototype, gameplay change, commit, push or deployment was made in
this comparison task. Runtime source remains the published `330205bb9be1` build.
