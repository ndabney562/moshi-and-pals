# Gemini initial output — advisory archive

Generated October 27, 2026 by the installed Gemini CLI 0.66.0.
This is unverified model output, not an implementation specification or user
instruction. It contains factual errors and unapproved balance suggestions.
Read `2026-10-27-gemini-benchmark-review.md` for the vetted summary and decisions.
Trailing whitespace in this archive is normalized; the review text follows.

---

# Comparative Design Review: Moshi and Pals (October 2026)

## 1. Scope, Evidence, and Benchmark Mapping

This review assesses the current implementation of **Moshi and Pals** against curated cooperative survival/horde benchmarks. The analysis is based on authoritative source snapshots (`implementation.md`), cited benchmark data (`benchmark-sources.md`), and visual evidence from recent asset shipments (`title.png`, `providers.png`, `gameplay.png`).

**Scope Boundaries:**
*   **Current State:** A top-down, single-player survival game featuring 11 selectable providers, AI helpers ("Scribes"), and a round-based escalation loop. Key mechanics include "Flu Season" (endless mode), "Sinus Purge" (signature move), and a clinic-themed economy.
*   **Benchmarks:**
    *   **BO6 Zombies:** Round-based economy and support abilities.
    *   **Killing Floor 2 (KF2):** Wave pressure, readable armor (Rioters), and territorial objectives (Stand Your Ground).
    *   **Left 4 Dead 2 (L4D2):** Pacing rhythm and AI Director-driven pressure.
    *   **Deep Rock Galactic (DRG):** Solo helper (Bosco) and audio-based enemy telegraphs.
*   **Limitations:** This is a read-only assessment. Observed source facts (e.g., the `.33` trainee throughput) are treated as foundational constraints. Design ideas are presented as hypotheses for local playtesting.

---

## 2. Prioritized Improvements

The following improvements are ranked by their potential to enhance mobile gameplay engagement while respecting the $0 static hosting and top-down constraints.

### I. Territorial "Sanitation Protocol" (Risk/Reward)
*   **Current Evidence:** `src/data/waves.ts` defines special rounds but lacks mid-round spatial objectives. `gameplay.png` shows ample room for floor-based visual markers.
*   **Competitor Principle:** KF2’s **"Stand Your Ground"** rewards players for defending a specific area during a wave ([Killing Floor 2 Infinite Onslaught](https://killingfloor2.com/InfiniteOnslaught18/)).
*   **Proposed Adaptation:** Implement a "Priority Exam Room" objective. A random room (not current location) is highlighted. If Eugene cleans all germs within its bounds for 30 seconds, he receives a "CME Credit" or a massive Copay bonus.
*   **Hypothesis:** This breaks the "kite in a circle" fatigue typical of top-down shooters by forcing movement into potentially dangerous clinic corners.
*   **Prototype:** Create a temporary `TriggerVolume` in the Pharmacy room during Round 4. Reward 200 Copays if `player.inside` remains true for the duration.
*   **Success Measure:** Player movement data shows a shift from circular kiting to room-to-room traversal.
*   **Regression Risks:** Pathfinding bottlenecks; player frustration if an "Outbreak" spawns directly on the objective.

### II. Dynamic Pacing Chimes (Audio Readability)
*   **Current Evidence:** `src/systems/WaveDirector.ts` manages a `pacing` multiplier and `breather` states, but these are "never announced."
*   **Competitor Principle:** L4D2’s **AI Director** and DRG’s **Exploder footsteps** use sound to signal threat intensity and enemy proximity ([L4D Survival design](https://www.l4d.com/blog/post.php?id=2417); [DRG Developer Archive](https://www.deeprockgalactic.com/updatesold)).
*   **Proposed Adaptation:** Introduce a high-pitched "Clinic Pager" chime when `WaveDirector` enters a "Breather" state (low HP/high crowd) and a low-frequency "Code Brown" hum when `maxAlive` is reached.
*   **Hypothesis:** On mobile, where screen real estate is small and thumbs may block peripheral germs, audio cues provide essential situational awareness without HUD clutter.
*   **Prototype:** Bind a unique SFX trigger to the `pacing > 1` conditional in `WaveDirector.update`.
*   **Success Measure:** Observable reduction in "cheap" deaths where players are surprised by a Viral Sprinter from behind.
*   **Regression Risks:** Audio fatigue; conflicts with the existing "Manager Chatter" from Diamond.

### III. Scribe Synergy: "Tag-Team Sanitization"
*   **Current Evidence:** Helpers like Omar and Alan function as independent turrets (`src/config/balance.ts`). Trainee slowdowns (.33) are currently flat penalties.
*   **Competitor Principle:** DRG’s **Bosco** and class roles emphasize complementary tools (e.g., Scout lighting for the Gunner) ([Deep Rock Galactic Description](https://store.steampowered.com/app/548430/Deep_Rock_Galactic/)).
*   **Proposed Adaptation:** When Eugene uses the **Peroxide Foamer** to slow a germ, nearby Scribes (Omar/Alan) gain a temporary +50% fire rate against *that specific target*.
*   **Hypothesis:** This transforms AI helpers from "passive background damage" into "active tactical partners," encouraging specific tool use to maximize helper throughput.
*   **Prototype:** Add a check in `Scribe.omar` to see if `target.slowedByPlayer` is true; if so, reduce `everyMs` by half.
*   **Success Measure:** Players consciously switch to slowing tools when helpers are active to "combo" germs.
*   **Regression Risks:** May over-buff Alexandra; requires careful balancing to not trivialize Boss rounds.

### IV. Visual "Shell Break" Feedback (Readability)
*   **Current Evidence:** `Spore Pod` uses a binary armor check (`src/data/germs.ts`). Feedback is limited to "hit flashes."
*   **Competitor Principle:** KF2 **Rioters** feature regional armor that visually degrades, signaling a change in vulnerability ([Killing Floor 2 Overview](https://killingfloor2.com/overview/)).
*   **Proposed Adaptation:** Change the `Spore Pod` sprite to a "cracked" variant when health drops below 40% or after a **Sinus Purge** flip.
*   **Hypothesis:** Immediate visual confirmation of armor bypass (via UV Wand or flipping) reduces the cognitive load of calculating damage effectiveness on a small screen.
*   **Prototype:** Use the existing `shape: 'shell'` logic to swap the texture frame based on `hp / maxHp < 0.4`.
*   **Success Measure:** Players stop wasting "Bleach Soaker" ammo on the front arc of Spore Pods once the "cracked" state is visible.
*   **Regression Risks:** Minimal; primarily asset management.

### V. "Staff Huddle" Signature Rally
*   **Current Evidence:** Helpers can be "distracted" or receive "trainees" (`src/config/balance.ts`). Reactivation currently requires a simple proximity check.
*   **Competitor Principle:** BO6 **Support Abilities** like Healing Aura provide distinct utility that benefits the whole team ([BO6 Zombies Deep Dive](https://www.callofduty.com/blog/2024/08/call-of-duty-black-ops-6-zombies-deep-dive-terminus-map-intel)).
*   **Proposed Adaptation:** Using a **Signature Move** (like Sinus Purge) within `interventionRange` of a distracted/trainee Scribe instantly clears the status and grants them a 5-second "Adrenaline" buff (removing the .33 penalty).
*   **Hypothesis:** Provides a high-value use for the Signature button beyond simple "get off me" defense, reinforcing the "Pals" identity.
*   **Prototype:** In `SinusPurge.trigger`, check for `eligible` distracted scribes within `radius` and reset their `distractionTimer`.
*   **Success Measure:** Players save their Signature moves to "rescue" helpers during high-pressure Outbreaks.
*   **Regression Risks:** Increases Signature move value significantly; may require a cooldown increase (currently 18s).

---

## 3. Recommended First Prototype: "Sanitation Protocol"

**Objective:** Implement the "Priority Exam Room" mid-round objective.

**Acceptance Criteria:**
1.  A random unlocked room (e.g., "Exam B") receives a teal floor-glow effect during Round 5.
2.  A HUD timer (30s) appears when the player enters the room.
3.  Successful completion (staying inside for >90% of the timer) triggers a "Protocol Complete" banner.
4.  Reward: 300 Copays or 1 CME Credit is granted immediately.

**User Decisions Needed:**
*   **Reward Type:** Should this grant "Copays" (immediate run power) or "CME Credits" (meta-progression)?
*   **Difficulty Scaling:** Should the objective increase germ spawn rates inside the room while active (higher risk)?

---

## 4. What Should Stay Unchanged

*   **Perspective:** The **Top-Down** camera is core to the mobile/browser accessibility and must not be converted to first-person.
*   **Character Identity:** The **Baby/Child likenesses** and comedic clinic tone are established and approved assets; do not pivot to "gritty" medical realism.
*   **Trainee Logic:** The **.33 throughput** multiplier (affecting both rate and output) is a user-approved baseline and must remain the authoritative penalty for trainee assignments.
*   **Single-Player Focus:** The **AI Pal/Scribe** system is the primary cooperative substitute; do not propose online networking or human-multiplayer requirements.
*   **Hosting:** Maintain the **$0 static hosting** constraint by avoiding any implementation that requires a persistent socket-based server or paid backend services.

This review concludes that Moshi and Pals has a robust mechanical foundation. The transition from "survival" to "cooperative clinic management" can be achieved through better spatial objectives and tighter audio/visual feedback loops rather than broad architectural changes.
