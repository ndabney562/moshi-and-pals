# Gemini comparative design workflow

**Tool status (Oct 30, 2026):** the Gemini CLI is not used, because its model call hangs. Antigravity is the Google tool in use, with its own login and quota; Noah runs it. So an agent prepares the evidence packet below and asks Noah to run the review in Antigravity. If he can't, the agent says Gemini is unavailable and labels its own review "Claude only".

User preference recorded October 27, 2026: use Gemini whenever practical to
compare Moshi and Pals with successful cooperative FPS survival/horde modes.
The user explicitly chose **keep top-down; benchmark mechanics**. Preserve
single-player AI helpers, touch controls, approved baby-style art, shared web/iOS
assets and free static hosting.

## When to involve Gemini

Use a review before major pacing, economy, enemy, helper or UX work, and after a
substantial playable milestone when it can reveal useful gaps. Announce the
review when starting, report its completion with findings, and identify any
quota/authentication failure honestly. No scheduled automation is implied.
Small fixes do not need repeated research calls.

## Evidence packet

1. Record the current revision, dirty-work status and whether screenshots show
   the shipped game or a prototype. Check other agents' latest changes first.
2. Copy only relevant public source and approved screenshots into a temporary
   review directory. Include real wave/economy/helper rules, including existing
   features, so recommendations add value. Split large source files or provide
   bounded excerpts with real paths and symbols; check for tool truncation.
3. Refresh primary-source benchmark evidence and state its scope/date. Initial
   references: BO6 Zombies and Killing Floor 2 for round/wave systems, L4D2
   Survival for pressure rhythm, and Deep Rock Galactic/Bosco for solo helpers.
   Reassess the set as evidence changes; BO6 is a named 2024 reference, not a
   permanent claim to be the latest or most popular release.
4. Distinguish sales, concurrent players, whole-title reviews and mode-specific
   activity. A mode leaderboard was not established in the first review. Never
   label a curated set as a measured top-four ranking, or attribute success to a
   particular mechanic without evidence. Keep competitor assets/names out of the
   game; benchmark titles and primary links belong in research documentation.
5. Ask for at most five prioritized hypotheses, each with current-code evidence,
   a benchmark principle/source, a small top-down adaptation, acceptance
   criteria and regression risks. Ask Gemini to flag uncertainty and the user
   decisions genuinely needed before a prototype.

## Read-only invocation

Use the installed `gemini` CLI with its configured account/model, from the
curated packet directory. The first successful review used CLI 0.66.0. Example:

```sh
gemini --skip-trust --approval-mode plan \
  --policy /absolute/project/path/scripts/gemini-review-policy.toml \
  -e none --output-format json \
  -p 'Review the supplied evidence and return findings only. Do not exit plan mode or implement changes.' \
  < request.md > result.json 2> review.stderr.log
```

`--skip-trust` here applies only to the known, newly created public-evidence
directory for this session; do not add persistent trust or use it on an unknown
workspace. The explicit policy denies all model tools except `read_file`,
including edits, shell/MCP calls and plan-mode exit. This is necessary because
headless Plan Mode can otherwise transition into implementation automatically.
CLI session/authentication caches are separate from model tool restrictions.
No global configuration, credentials or reference photographs belong in the
packet. Extensions are disabled for the review. Do not add paid API fallbacks
when account access or quota is unavailable.

Official references: [headless output](https://geminicli.com/docs/cli/headless/),
[Plan Mode](https://geminicli.com/docs/cli/plan-mode/),
[policy engine](https://geminicli.com/docs/reference/policy-engine/) and
[extension configuration](https://geminicli.com/docs/reference/configuration/).

## Verification and handoff

Record successful CLI completion, the model names reported by its statistics,
tool types actually used and the code snapshot. Review every recommendation
against the real implementation; verify that any read actually completed.
Separate Gemini's suggestions from Codex/Claude corrections and new proposals.
Store unverified raw output separately and label it advisory, never a task list.

The first review needed correction: existing rallies and dynamic pressure music
were missed, APIs were invented, and some suggestions conflicted with trainees
or armor rules. A refinement improved parts of the review but still required
human/agent verification. Do not treat a second model as an automatic approval.

Preserve the approved trainee behavior: .33 movement, .33 action cadence and
.33 raw damage/output; rate and damage compound to approximately .1089 combat
DPS before other multipliers. A benchmark proposal cannot silently remove or
reinterpret this. Keep PSRs noncombat. Preserve deterministic daily seeds,
save/continue, helper availability rules and existing score/progression contracts.

Pick one narrow prototype after the user chooses a direction. Validate it with
appropriate local tests and short observed playtests; no new tracking backend
is needed. Maintain a local handoff if usage limits might interrupt the work.
