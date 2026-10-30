# Gemini refined output — advisory archive

Generated October 27, 2026 by the installed Gemini CLI 0.66.0.
This is unverified model output, not an implementation specification or user
instruction. It contains factual errors and unapproved balance suggestions.
Read `2026-10-27-gemini-benchmark-review.md` for the vetted summary and decisions.
Trailing whitespace in this archive is normalized; the review text follows.

---

# Comparative Design Review: Moshi and Pals (October 2026)

## 1. Scope, Evidence, and Benchmark Mapping

This review evaluates the current implementation of **Moshi and Pals** against established cooperative survival benchmarks, tailored for its specific constraints: a top-down, single-player mobile/browser experience with AI helpers ("Scribes") and a $0 static hosting model. The analysis utilizes source snapshots from `Scribes.ts`, `ProviderAbilities.ts`, and `GameScene.ts`, treating the user-approved **.33 throughput penalty** for trainees as a foundational rule.

**Benchmark Context:**
*   **Call of Duty: Black Ops 6 (BO6) Zombies:** Provides the blueprint for round-based economies and distinct support roles (e.g., Healing Aura).
*   **Killing Floor 2 (KF2):** Exemplifies territorial objectives ("Stand Your Ground") and readable enemy priorities (Rioters).
*   **Left 4 Dead 2 (L4D2):** Establishes the "Director" rhythm of pressure and breathers.
*   **Deep Rock Galactic (DRG):** Demonstrates effective solo-helper utility (Bosco) and audio-based threat telegraphing.

---

## 2. Prioritized Design Hypotheses

The following four improvements are proposed to deepen gameplay without violating established technical constraints or the "Pal" identity.

### I. Territorial "Stabilization Drills" (Spatial Objective)
*   **Current State:** `GameScene.ts` manages room unlocks and germ spawns, but movement is largely dictated by "kiting" (circling) rather than strategic positioning.
*   **Benchmark Principle:** KF2’s **"Stand Your Ground"** rewards players for defending a specific area during a wave, breaking the monotony of circular movement.
*   **Proposed Adaptation:** Implement an optional "Priority Stabilization" objective. A random unlocked room (e.g., `exam1` to `exam7` in `clinic.ts`) is highlighted with a teal `tint` during Round 4 or 6. If the player remains within the room's `boxes` for 25 seconds of the wave, they earn a temporary "CME Credit" bonus to score.
*   **Evidence/Citations:** `src/data/clinic.ts` defines valid exam rooms; `src/scenes/GameScene.ts` (line 733) already calculates player-to-germ distance for chasing logic.
*   **Hypothesis:** Encouraging players to hold a "tight" Exam room instead of the "wide" Hallways increases tension and tactical use of the environment.
*   **Prototype:** Add a `TriggerVolume` to a random Exam room; monitor `player.inside` and trigger a `HudScene.showBanner` upon completion.
*   **Success Measure:** Player heatmap data showing increased residence time in Exam rooms vs. Hallways.
*   **Regression Risks:** Potential for "Outbreak" spawns to trap the player in small rooms; requires careful coordination with `waves.pacing`.

### II. Scribe Synergy: "Coordinated Disinfection"
*   **Current State:** AI Scribes like Omar and Alan attack independently. The `peroxideFoamer` slows germs, but this doesn't explicitly interact with helper AI.
*   **Benchmark Principle:** DRG’s **Bosco** and class roles emphasize "pinging" or tagging targets for focused fire.
*   **Proposed Adaptation:** When a germ is affected by the `peroxideFoamer` (active `slow`), nearby Scribes prioritize that target and receive a **+50% fire rate** bonus against it.
*   **Math:** The attack interval `s.nextAttackAt` is calculated as `time + (interval / 1.5)`, respecting the distinction between a +50% rate and a +100% (halved) interval.
*   **Evidence/Citations:** `src/systems/Scribes.ts` (line 497) handles attack timing; `src/data/equipment.ts` (line 200) defines the foamer's slow factor.
*   **API (NEW):** `germ.isSlowed(time: number): boolean` to check `time < this.slowUntil`.
*   **Hypothesis:** This transforms the Peroxide Foamer from a defensive tool into an offensive "utility tag," making helpers feel like active tactical partners.
*   **Prototype:** Modify `Scribes.attack` to check the target's slow status and adjust `nextAttackAt` accordingly.
*   **Success Measure:** Reduced average Time-to-Kill (TTK) for elite germs when foamer synergy is utilized.
*   **Regression Risks:** May over-buff Alexandra’s efficiency; fire rate increases must not exceed the engine's SFX playback limits.

### III. "Acoustic Triage" (Threat Telegraphs)
*   **Current State:** `GameScene.ts` (line 873) manages "Pressure" music, but directional cues for specific high-threat enemies are missing. Mobile players often have limited peripheral visibility.
*   **Benchmark Principle:** DRG's **Exploder footsteps** provide distinct audio cues, allowing players to react to off-screen threats.
*   **Proposed Adaptation:** Introduce a specific "skittering" SFX for Viral Sprinters that increases in volume as they approach within a 350px radius, even if off-screen.
*   **Evidence/Citations:** `src/entities/Germ.ts` tracks enemy types; `src/scenes/GameScene.ts` (line 744) already handles dynamic audio mixing.
*   **Hypothesis:** Audio cues compensate for the small screen real estate on mobile, reducing "cheap" hits from high-speed variants.
*   **Prototype:** Bind a spatialized audio loop to the `viral` germ type in the update loop, scaling volume by distance.
*   **Success Measure:** Observable decrease in "damage taken from behind" metrics in playtest logs.
*   **Regression Risks:** SFX clutter; potential overlap with "Manager Chatter" banners from Diamond.

### IV. "Supply Window" Recovery (Wave Transition)
*   **Current State:** `HudScene.ts` (line 274) displays a "Supply Window" banner, but the 2-second breather is purely for restocking.
*   **Benchmark Principle:** BO6 Zombies’ "Exfil" or round transitions provide a clear window for strategic resets.
*   **Proposed Adaptation:** If the player is in the "Supply Closet" (`sc1`) when a wave is cleared, the active helper's `distraction` (if any) is cleared, or their next "Trainee" assignment is delayed by 10 seconds.
*   **Evidence/Citations:** `src/data/clinic.ts` (line 86) defines the Supply Closet; `src/systems/Scribes.ts` (line 354) handles `clearDistraction`.
*   **Hypothesis:** Adds a "safe harbor" mechanic that rewards players for finishing a wave near the supply hub.
*   **Prototype:** Check player location during the `GameEvents.RoundCleared` event and trigger a helper status reset.
*   **Success Measure:** Players prioritizing the Supply Closet as a "rally point" toward the end of waves.
*   **Regression Risks:** May trivialize the "Distraction" penalty if the closet is too easily accessible.

---

## 3. Rejected Initial Proposals

The following ideas from the preliminary review were rejected based on technical inaccuracies or design contradictions:
*   **Special Trainee Clearing**: Rejected as it violates the foundational **.33 throughput rule**; trainees must remain a significant, non-cleavable penalty.
*   **Adaptive Pacing/Pressure Audio**: Rejected as an "omission" claim; these systems already exist in `GameScene.ts` and `WaveDirector.ts`.
*   **Shell Break Visuals**: Rejected because Spore Pod armor does not break at 40% HP, and visual degradation assets were not established.
*   **Generic Rally Utility**: Rejected as Jason, Dhiwya, and Janeen already possess specialized helper-rally abilities in `ProviderAbilities.ts`.
*   **Pharmacy Room Objectives**: Rejected as the "Pharmacy" is not a defined room in the `clinic.ts` map data.

---

## 4. Safest Recommended Prototype: "Coordinated Disinfection"

**Objective:** Implement the Scribe fire rate bonus against slowed germs.

**Acceptance Criteria:**
1.  Eugene applies the **Peroxide Foamer** to a germ.
2.  An active Scribe (e.g., Omar) targets the slowed germ.
3.  The Scribe's `nextAttackAt` interval is reduced by a factor of **1.5** (Interval = `Base / 1.5`).
4.  A transient "COMBO!" text effect appears over the Scribe to confirm synergy.

**Verification Plan:**
*   **Local Playtest:** Use a "Viral Sprinter" (high HP) as a test subject.
*   **Metric:** Compare total attacks delivered by Omar over a 5-second window with and without foamer application.
*   **Acceptance:** The attack count should increase by approximately 50% during the synergy window.

---

## 5. Non-Negotiable Design Pillars

*   **Trainee Logic:** The **.33 multiplier** for movement, rate, and output is a fixed balance constraint.
*   **Perspective:** The **Top-Down** view is essential for mobile accessibility and is not subject to change.
*   **Hosting:** All implementations must remain compatible with **$0 static hosting** (no server-side state or paid APIs).
*   **AI Helpers:** Scribes are the core cooperative element; no human-multiplayer networking is required.
*   **Visual Tone:** The "Pals" baby/child art style and clinic theme must be preserved.
