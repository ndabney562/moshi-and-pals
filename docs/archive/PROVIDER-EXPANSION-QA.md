# Provider expansion foundation: local verification

Scope: existing-provider helper affinity and leaderboard-name validation only. This report does not claim the full roster, call-outs, trainee events, distractions, Flu Season or shared leaderboard have shipped.

## Changes under review

- Existing providers apply combat-helper damage multipliers once: Eugene 0.75, Kaya 1.00, Lucien 1.50, Ken 1.25. Permanent helper upgrades continue to stack once.
- PSRs stay noncombat. Provider affinity multiplies their bonus copay output, with one final rounding step. Check-in timing and base patient rewards are unchanged.
- Backend-independent leaderboard name validation accepts 1–10 visible characters, normalizes Unicode and rejects control/bidi characters. A shared leaderboard service and UI are not deployed.
- The legacy smoke test now waits for the queued Phaser scene resume as well as the equipped tool, preventing an early transition assertion. It still fails if gameplay does not resume within 10 seconds.
- The working specification records independent helper call-outs, Selina's call-out exception, random timed trainee assignments, and the need to provision a free shared-score backend. New-provider abilities remain proposals requiring approval before committing.

## Verification

October 26, 2026, local Node 22.23.4:

| Check | Result |
|---|---|
| TypeScript source/test checks | Passed |
| Unit suite | 105 passed across 17 files |
| Static production build and sealed bundle | Passed |
| Artifact parity and offline-worker checks | 6 passed |
| Chromium/WebKit regression | 46 passed |
| Legacy gameplay smoke | 206 passed, 0 failed |

Unit checks cover exact provider multipliers, chained targets, permanent staff-power preservation, PSR bonus rounding and unchanged check-in intervals, and Unicode name limits. Browser additions exercise all four providers through the real combat-helper damage path.

The initial full command reached browser startup but the sandbox denied localhost listening (`EPERM`, port 4174). All 46 browser checks subsequently passed with local-server/browser permissions. This was an environment restriction, not a game assertion failure. No Swift source changed; the artifact checks copy and verify the same sealed web bundle used by the iOS wrapper. Native simulator tests from the earlier remaster have not been rerun for this foundation increment.

The initial gameplay smoke run reported 205 passing checks and one early assertion after picking a requisition tool. Inspection showed that equipment is applied synchronously while Phaser queues scene resume for the next frame. The assertion now waits for both conditions, without swallowing its timeout; the complete rerun passed all 206 checks, including tool selection and resumed play.

Selected designs recorded after clarification: Raj uses The Home Remedy; Flu Season uses continuous waves, rising outbreak pressure and short supply windows; Selina reveals her call-out on the provider’s first approach to the front desk. These remain specification choices, not shipped gameplay.

No expansion changes have been committed or pushed. No backend account has been created and no paid service enabled.
