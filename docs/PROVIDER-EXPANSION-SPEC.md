# Provider and helper expansion: working specification

Status: approved ability designs and six photo-based appearances, October 26, 2026. User requirements below are recorded separately from proposed designs. New-provider designs were approved before implementation; commit only after the full local suite passes. The user has authorized other test-gated pushes with reviewable change lists.

## Implementation order

| Order | Milestone | Reason and review gate |
|---|---|---|
| 1 | Shared provider/helper model: affinity, independent helper attendance, temporary availability, trainee effects, distraction/reactivation, and saved-shift state | These systems support most requested abilities. Implement the existing providers' explicit damage changes first. PSRs remain noncombat and affinity scales their bonus copays. Trainees reduce speed and raw damage/output to 33%; random mid-shift assignments expire after a timed period; duration and frequency remain tunable. |
| 2 | Dedicated Providers menu, NPS unlocks, first/second ability definitions, and web/native menu parity | A growing roster cannot remain on the title screen. Preserve current hires and settings. Prepare scalable data-driven cards before adding characters. |
| 3 | Existing-provider revisions, normally stationed Selina, then the approved new providers and Alexandra | Kaya needs an approved new signature; his patient-triggered ER buff is separate. Lidiya depends on the shared companion system. New-provider code/art remains uncommitted until approval. |
| 4 | Flu Season endless mode and mode-aware score recording/leaderboard | Separate mode identifiers from the existing fluSeason modifier. Confirm local vs shared scores and name handling. Keep modes/difficulties distinguishable. |
| 5 | Puzzle mode, developed together, then final roster/art/balance QA | Prototype an approved puzzle loop with existing rooms, clues and tools before investing in content. |

Each milestone keeps the shared web/iOS bundle, save migrations and current QA gate intact. Implementation order is based on dependencies rather than the order of the supplied note.

## Confirmed requirements

Provider means a playable character. Helper means a scribe, X-ray technician, or PSR. Every eligible helper gets an independent call-out result for the shift. Their silhouette appears normally; opening their assigned room reveals the absence and a randomized reason based on provider affinity/personality. Calling out, being distracted, being sent to X-ray, and having a trainee are distinct states, not interchangeable disappearances.

Provider affinity raises helper damage; lower affinity raises independent call-out probability. Existing combat-helper damage multipliers are explicit: Eugene 0.75, Lucien 1.50, Ken 1.25. Kaya's affinity value is not specified yet; leave his helper damage at 1.00 until revised. Apply these once on top of earned helper upgrades, not once per chained target or twice through the general damage path.

Providers get their own unlock/selection menu and an NPS-unlocked second ability. Existing NPS hires stay owned. Do not spend NPS or silently assign new ability purchases during migration.

Kaya receives an occasional patient request asking whether an ER doctor is present. For Kaya, the request grants +25% movement speed and +50% spray rate for 5 seconds. The label supplied was “I’m and ER Doc”; proposed corrected display label: “I’M AN ER DOC.” His current CODE BLUE signature needs a separate rework.

Scribes and X-ray technicians can be drawn toward in-world distractions. The provider intervenes between the helper and distraction to reactivate them. X-ray technicians can also be temporarily sent to image a patient. Omar, Selina and Elaine can receive trainees. A trainee imposes a 67% slowdown; the user confirmed that movement/action speed and raw damage/output all drop to 33%. This compounds to about 10.89% of normal damage/output per second when both rate and per-action output apply. Confirmed lifecycle: random mid-shift assignments that expire after a timed period. Initial duration and event frequency remain balance settings to choose and test.

Selina normally stays at the front desk, but the user confirmed that she may call out like every other helper. This differs from the current timed PSR pill mechanic. Since the front desk begins open, her silhouette reveals the absence and reason when the provider first approaches the front desk; do not quietly make her normal presence depend on buying a pill.

Flu Season is an infinite mode. Leaderboard names accept up to 10 player-visible characters. Puzzle mode must be designed together. The leaderboard is shared across all players. Flu Season is a separate mode with special rules; confirmed rules: continuous waves, rising outbreak pressure, and short supply windows. Exact pressure curves and window timings remain balance settings.

## Proposed shared model

| State or rule | Proposed behavior (not yet approved) |
|---|---|
| Affinity | Start with a fixed provider profile. Keep helper damage and call-out odds as separate tunable fields so exact requested damage percentages do not force unwanted absence odds. Progression/relationship levels can be added later if desired. |
| Attendance | Roll once independently per eligible helper at shift creation using a dedicated seeded attendance stream. Saving/reloading never rerolls it. Store the selected reason with the attendance result. Reveal the result when the room unlocks. |
| Call-out reasons | Use approved provider-specific reason pools with affinity tiers. Proposed examples: Eugene: “Called out. The HONK reached my apartment.” Lucien: “At a conference. He said it was a teaching opportunity.” Ken: “Avoiding Diamond. Ken understands.” These lines need creative approval. |
| Availability | Per-helper state: waiting, active, distracted, assignedToXray, calledOut. Presence/silhouette, target, return time and reactivation are explicit. Do not use a helper's permanent unlock as attendance state. |
| Distractions | Spawn an obvious world marker, tether the helper toward it, and use crossing/intervention plus a brief proximity threshold to resume work. Reuse navigation, floor checks and existing input; avoid a new required button until playtesting shows it is necessary. |
| Trainees | Keep a separate trainee modifier and trainee eligibility in helper data. Confirmed: apply 0.33 to movement, action rate and raw damage/output. Rate multipliers change the interval by division: 33% speed means approximately 3.03 times the interval, not interval × 0.33. Store the independent dimensions explicitly so each is applied once. |
| Selina | Confirmed: stationed at the front normally, eligible for independent call-outs and temporary trainees. Reveal her absence and reason when the provider first approaches the front desk, which begins open. |
| Score names | Trim surrounding whitespace; count grapheme clusters rather than UTF-16 code units; accept 1–10 visible characters; render as text; persist names safely. Confirmed shared scope; use the same validation on the server before accepting submissions. |

## Provider proposals requiring approval

The user approved all proposed new-provider first and second abilities on October 26, 2026. The six photo-based appearances were approved before implementation. Numbers are an initial tested balance pass, subject to playtesting. Supplied descriptions take priority over these suggestions. New-provider hire prices remain unset except Janeen's confirmed 10,000 NPS.

| Provider | Required identity and supplied behavior | Proposed first ability | Proposed NPS-unlocked second ability |
|---|---|---|---|
| Eugene | Existing provider; helpers deal 25% less damage | Keep SINUS PURGE | COVER MY SHIFT: briefly rally available helpers and clear nearby distractions |
| Lucien | Existing provider; helpers deal 50% more damage | Keep CLEAN FIELD | TEACHING MOMENT: a temporary provider/helper coordination buff |
| Kaya | Rework CODE BLUE; patient-triggered ER buff is separate | RAPID ASSESSMENT: marks nearby threats, briefly improves auto-aim range and damage against marked targets | DISCHARGE ORDERS: clears a short path and refills part of the current tool |
| Ken | Existing provider; helpers deal 25% more damage | Keep FILE A GRIEVANCE | STAFF ADVOCATE: interrupt distractions/assignments and briefly protect helper availability |
| Jason | Asian man, about 30, medium-length black hair, always burgundy scrubs; calisthenics, collectible-monster games, loves scribes; no reference PNG | REP ROUNDS: a three-pulse calisthenics shockwave; nearby scribes get a short coordinated attack burst | SPOT ME: recalls distracted available scribes and grants a brief movement/attack-rate boost |
| Dhiwya | Loved by all, intelligent; a new scrub color per shift | CLINICAL CLARITY: marks high-priority germs; provider and helpers exploit marked targets | COLOR CODE: a clearly announced rotating team buff, visually matched to her shift's scrub palette |
| Raj | Provider-only vending options: honey, ginger, lemon, tea; these recharge Raj | THE HOME REMEDY (selected by the user): honey slows, ginger knocks back, lemon ricochets, and tea creates steam | STEEP DISCOUNT: combines purchased recharge ingredients into a temporary refill/ability bonus |
| Lidiya | Strongest alone; each added teammate reduces her power and prompts complaints; upstairs reveals one randomized second provider acting as a helper; unlocking that provider doubles her power | I CAN DO IT MYSELF: a solo burst, with damage scaled by the current crew count | FINE, YOU CAN STAY: coordinates a short joint attack with the upstairs provider |
| Dharma | Throws medication; prefers medication attacks over natural remedies; medication-based unlocks do more damage | POLYPHARMACY: a fan of original fictional medication projectiles | REFILL AUTHORIZED: a temporary medication-tool chain/cadence boost |
| Amanda | Original gloomy gag provider; 0.01× normal movement and 0.01× normal attack; complains throughout the shift | RAIN CHECK: a despondent cloud slows nearby germs while her own movement/attack remain deliberately tiny | NOT MY PROBLEM: a short defensive distraction effect without silently removing the gag penalties |
| Janeen | “Can do anything”; Goddess provider; no provider should surpass her with upgrades; unlock costs exactly 10,000 NPS | DIVINE COVERAGE: a large-area cleanse and emergency sustain | ALL SPECIALTIES: an apex version of existing signature effects; price and precise supremacy rule need approval |

Proposed helper affinity ordering for discussion: Janeen and Dhiwya highest; Lucien and Jason very high; Ken positive; Raj/Kaya neutral unless clarified; Dharma lower with natural-remedy helpers; Eugene lower; Amanda very low. Lidiya's solo mechanic is separate from how helpers feel about her, so do not infer that she is disliked merely because she prefers working alone.

### Raj: selected direction and alternatives considered

| Option | Joke and readable game effect |
|---|---|
| CHAI REACTION — alternative | “It needs another minute.” The kettle erupts into a steam cone while lemons bounce between germs. Vending ingredients restore the ability meter. |
| THE HOME REMEDY — selected | Honey makes sticky slowing puddles; ginger launches a knockback burst; lemon ricochets; tea finishes with steam. More build variety, more interaction/testing work. |
| STEEP CONSEQUENCES | A dramatic teacup orbital grows stronger while Raj avoids using it, then spills across the room. Simpler to read, but the waiting mechanic needs playtesting. |

The user selected THE HOME REMEDY as Raj’s first special. Exact ingredient strengths, recharge quantities and prices remain tunable. The user subsequently approved the remaining roster ability proposals. These are game effects and jokes, not real-world treatment claims.

## Alexandra and helper changes

Alexandra is an original animated cloud/essence with a black medical mask. She must exceed the other scribes' combined combat output, be expensive to unlock, and use the same helper state/affinity/attendance framework. Proposed first pass: a premium CME unlock (amount not approved), a cloud movement animation, and a readable multi-target ink/steam attack. Define “combined” using comparable upgrades and target counts before choosing damage/cadence numbers; do not make one enormous damage number miss the desired DPS behavior.

Omar, Selina and Elaine are trainee-eligible. Donald can be distracted by transfers and assigned to patient imaging, temporarily stopping his combat contribution. Availability should return once rather than creating duplicate helpers. All states must survive save/resume with game-time-based durations.

## Puzzle mode options for the next discussion

| Concept | How it uses current infrastructure |
|---|---|
| Clinic Escape — recommended starting prototype | A short authored clinic route with locked rooms, clue objects, tools and helper interventions. Reuse the existing Miracle Cure clue/door machinery; no infinite spawning. |
| Shift Handoff | Solve a fixed sequence of room/patient/helper tasks with limited supplies. Success depends on routing and assignments rather than survival time. |
| Chart Logic | Read charts and clues to match patients, rooms and fictional orders. Stronger pure-puzzle focus, but requires substantially more dedicated UI. |

## Decisions still needed

| Decision | Why it matters |
|---|---|
| Leaderboard: shared across players vs local to each device | Confirmed: shared across all players. This needs a service beyond static GitHub Pages. Preserve the $0 constraint; the user has no existing backend account selected; account creation/provisioning is pending. |
| Flu Season: ordinary endless waves vs new special rules | Confirmed: a separate mode with special rules. The user selected continuous waves, rising outbreak pressure, and short supply windows. Define the exact pressure progression and supply timing through playtesting. The existing fluSeason modifier must stay distinct. |
| Trainee slowdown: rate/movement only vs damage/output too | Applying 0.33 to both damage and action rate yields about 0.109× DPS, a much larger penalty than 67%. Confirmed: random mid-shift events, timed expiry. Choose and playtest duration/frequency. |
| PSR affinity behavior | Confirmed: keep PSRs noncombat and improve front-desk output. Initial implementation scales the existing PSR bonus copay once with provider affinity and permanent staff power; check-in speed and ordinary patient-cleaning rewards are unchanged. |
| Selina attendance | Confirmed: Selina may call out. Confirmed reveal: when the provider first approaches the front desk. |
| Second abilities | Confirm whether they are separately usable buttons or an equip-one replacement; proposed implementation uses a distinct unlocked action with its own cooldown. |
| Lidiya crew counting and double power | Confirm whether Selina counts, whether only active helpers count, whether the upstairs provider is exempt, and whether the 2× applies before/after the remaining solo penalty. |
| Janeen supremacy | Existing vending snacks can stack without a finite limit. “Strongest at equal upgrades” is implementable directly; “beats any other arbitrarily upgraded build” requires caps or a different explicit apex rule. Do not silently cap existing builds. |
| Amanda stats | Confirm whether 0.01× attack means damage per hit, attack rate, or both. |
| Initial ability designs and new content prices | Obtain the user's explicit new-provider approval before committing. |

## Asset intake

All six photo references were supplied October 26, 2026. The user explicitly mapped their attachment order as follows. The delivered files are JPEG photographs despite the earlier `.png` labels; preserve the original format and use these as likeness references for game art, rather than displaying the source photographs in the game.

| Attachment | Provider | Local reference (gitignored) |
|---|---|---|
| Photo 1 | Janeen | `.local/provider-references/janeen.jpg` |
| Photo 2 | Amanda | `.local/provider-references/amanda.jpg` |
| Photo 3 | Dharma | `.local/provider-references/dharma.jpg` |
| Photo 4 | Dhiwya | `.local/provider-references/dhiwya.jpg` |
| Photo 5 | Lidiya | `.local/provider-references/lidiya.jpg` |
| Photo 6 | Raj | `.local/provider-references/raj.jpg` |

The local copies are byte-identical to the attachments. Source photographs stay outside public assets and Git. Existing provider art uses procedural Phaser textures in `src/scenes/BootScene.ts`; use that visual framework for recognizable provider previews. Jason remains description-based without a supplied photo; Alexandra remains an original masked-cloud essence. Receipt of these six references resolves the photo prerequisite for these six providers; the six appearances and all seven ability sets have since been approved; commit only after passing the local QA gate.

## QA additions

Cover provider damage exactly once, helper upgrades stacking correctly, independent seeded call-out rolls, persistent absences/reasons, silhouettes until reveal, distraction intervention and floor transitions, trainee math and expiry, Donald's return, Selina's normal stationing and call-out exception, Lidiya's crew accounting/companion persistence, Kaya's exact five-second buff/rate semantics, second-ability purchases and migrations, endless-mode score isolation, name grapheme limits, and web/native menu parity. Include browser regression, native bridge checks, shared-artifact verification and the existing full smoke suite before any push.

## Shared leaderboard architecture research

The game stays on GitHub Pages. The shared score service must be separately hosted; a localStorage list will not be presented as a global leaderboard. A Cloudflare Worker with D1 is the initial recommendation if the user has no existing preference. Workers and D1 offer free plans, subject to their request/query/storage limits; keep the account on the free plan and do not enable paid overages. The user has no existing backend account selected. Account creation and provisioning remain pending; local preparation does not require an account.

Official sources checked October 26, 2026: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/). A server-side API should validate names and score fields, use parameterized SQL, constrain submissions and duplicates, and expose separate rankings by mode/difficulty/provider. No database credentials belong in the public game bundle. A static client alone cannot prove that a submitted score was earned honestly; define whether this is a casual scoreboard or needs stronger run verification before claiming anti-cheat protection.

Initial backend-independent code validates 1–10 visible name characters with Unicode normalization and grapheme counting where supported. This is preparation only; no shared leaderboard is live yet.
