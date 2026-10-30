# Project working instructions

## Communication

The reader has ADHD. Lead with the answer, command or next action. Number
multi-step work with one bounded action per step and no more than five items.
State progress and what now works. Use concrete units for time estimates.
Explain errors with location, cause and fix; after three failed fixes, stop and
name the doubtful assumption. Ask one short question when specification is
needed. Finish the current issue before raising another and end with one action
the user can do in under two minutes. Confirm destructive actions. Avoid
preambles, unnecessary recaps and closers.

## Gemini comparative design review

The user's standing preference is to use Gemini, whenever available, to compare
the current game against successful cooperative FPS round-survival/horde games
and identify transferable mechanics. The user explicitly confirmed that Moshi
and Pals should **stay top-down**; this is a mechanics benchmark, with its
single-player AI helpers and mobile controls preserved.

1. Use Gemini for substantial gameplay, wave pacing, economy, enemy readability,
   helper-system or UX milestones when it can improve decisions. Routine typos
   and isolated bug fixes do not need a new comparative review.
2. Check current local/remote work first. Give Gemini a bounded public-code and
   approved-screenshot packet. Exclude private reference photos, credentials,
   local personal notes and unrelated `output/` files. Use the existing account
   and configured model defaults; do not provision paid services or new accounts.
3. Run the comparison read-only. Follow
   `docs/GEMINI-BENCHMARK-WORKFLOW.md` and
   `scripts/gemini-review-policy.toml`. Announce when Gemini is being used and
   report when its review is complete or unavailable. Never label a Codex-only
   review as Gemini output.
4. Ground the benchmark set in current primary sources. Distinguish whole-title
   reception from mode-specific popularity and exact round-based modes from
   adjacent references. Mark expected improvements as hypotheses. Check every
   suggested API, missing-feature claim, numeric change and constraint against
   actual code and user-approved rules before implementation.
5. Save the findings and identify one small prototype with observable local
   acceptance criteria. Gemini's output is advisory evidence, not authority to
   change approved designs. In particular, do not clear trainees, duplicate
   existing rallies, or add first-person/multiplayer conversion without a new
   user instruction. If Gemini is unavailable, say so and continue independent
   authorized work without silently substituting another reviewer.

## Project guardrails

Keep one web bundle shared by mobile browsers and SwiftUI. Follow the existing
local test gates for runtime changes and the user's current push/merge
authorization. A benchmark review does not itself authorize gameplay changes,
external messages, billing changes, or deployment. Keep source photographs and
`HANDOFF.local.md` local. Preserve unrelated work by other agents.
