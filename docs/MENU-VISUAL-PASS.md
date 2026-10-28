# Menu visual pass

October 27, 2026. Approved direction: illustrated arcade menus with warm ivory,
teal and mint, and baby caricatures matching the original title illustration.

## Changes

1. Title: one action column, rounded navigation, live currency balances, selected
   provider portrait, mode/difficulty controls, daily challenge and saved-shift
   entry. The clinic illustration is no longer covered by large dark panels.
2. Providers: eleven menu portraits, a touch-selectable paginated roster, a large
   selected portrait, real affinity/ability information and existing confirmed
   NPS purchases. Overhead gameplay textures and balance are unchanged.
3. Board, Locker and Leaderboard: shared menu typography and light palette;
   rebuild layouts after viewport changes. Board spacing fits tablet widths.
4. Browser coverage: controls stay in bounds without overlap at phone/tablet
   sizes, all eleven atlas frames are distinct, roster touch selection works,
   secondary menus survive resize without starting gameplay, and an immediate
   Continue tap restores the saved shift rather than starting a fresh one.

## Art provenance

`public/assets/provider-portraits.png` was generated with the built-in imagegen
tool from the approved `docs/previews/menu-concept-v2.png`. No source photos
were added to public assets. Prompt: an exact four-column, three-row uniform
portrait atlas, ivory backgrounds, glossy softly rendered three-quarter baby
doctor caricatures, oversized round heads, full cheeks, tiny bodies, consistent
lighting, no labels, no logos, and recognizable hair/clothing/complexion.

Frame order: Eugene, Ken, Lucien, Kaya; Jason, Dhiwya, Raj, Lidiya; Dharma,
Amanda, Janeen, empty. A correction pass gave Dharma straight short side-swept
black hair and a clean-shaven face to distinguish him from Lucien. Menu portraits
are separate from the existing procedural top-down gameplay art.

October 28 identity correction: Ken is the dark-fleece portrait (row 1, column 2);
Kaya is the cap-and-sunglasses portrait (row 1, column 4). Only the menu atlas
mapping changed; provider IDs, names, abilities, unlocks and saves retain their
existing associations. Mobile regressions cover both identities in the roster,
after persisted selection on the title screen and when starting a shift.
The correction passed the full local gate: 153 unit, 124 Chromium/WebKit browser,
206 gameplay smoke and six bundle/service-worker checks. Both new identity
tests reproduced the original atlas mismatch before the correction.

## Verification

Final local gate passed: **153 unit, 120 Chromium/WebKit browser, 206 smoke,
six bundle/service-worker, 36 Swift and seven iOS simulator tests**. Type checks,
production build, sealed-artifact verification and `git diff --check` passed.
Web log: `/private/tmp/moshi-menu-delivery-qa.log`; Swift:
`/private/tmp/moshi-menu-swift.log`; simulator:
`/private/tmp/moshi-menu-delivery-native.log`. Source fingerprint:
`ff8df9acc098` (prefix). Actual implementation screenshots:
`previews/menu-title-implemented.png`, `previews/menu-providers-implemented.png`
and `previews/menu-board-implemented.png`.

Delivery source: `3611550c2637` (prefix). Staging identified one extra blank line
at the end of the new menu helper. After that whitespace-only cleanup, type,
153 unit, production build and six bundle checks passed again. The rebuilt
compiled JavaScript was verified byte-identical to the full-suite artifact after
normalizing its build-version string; no runtime logic changed.

Final palette source: `330205bb9be1` (prefix). Populated leaderboard rows now
use the light menu palette consistently, including rank, score and date text.
After this color-only correction, type/build, 153 unit, six bundle and 16
Chromium/WebKit leaderboard/menu checks passed. A populated-table visual check
found minimum row-text contrast of 4.94:1 and no runtime errors. Its screenshot,
`previews/menu-leaderboard-implemented.png`, uses **sample scores**, not a live
provisioned backend. Focused browser log:
`/private/tmp/moshi-menu-palette-regression.log`. The full functional gate above
preceded this palette-only change; gameplay, data and request logic are unchanged.

The first full run passed 153 unit,
114 browser, six artifact/worker and 36 Swift tests; seven iOS simulator tests
also passed. Smoke found an outdated uppercase provider-label expectation and
an immediate Save & Quit / Continue input-routing race. The label assertion now
matches the intended title-case display. Title's input routing now honors a
button's visible bounds even before Phaser registers it for hit testing, so a
Continue tap cannot fall through to the legacy normal-shift start action. A
browser regression covers Save & Quit followed by Continue without reloading.
The complete gate passed after those corrections. One intermediate simulator
rerun overlapped the web build replacing `dist/`; its artifact verifier correctly
refused a missing manifest before any tests ran. The final simulator suite ran
after the completed artifact passed verification and exited successfully.

Do not treat the design concepts
as screenshots of working controls. Actual local implementation screenshots
are saved separately after browser verification.

No game balance, progression costs, leaderboard provisioning or puzzle-mode
work is included in this visual pass. The shared web bundle remains the source
for browser and native gameplay.

## Delivery review

- Update Ready is placed above Continue when a saved shift is available.
- Secondary menus rebuild only when logical dimensions change. Repeated Phaser
  refresh notifications no longer queue duplicate restarts or leaderboard loads.
- Leaderboard requests carry a generation number. Responses from an older
  request, a pre-resize scene, or a closed scene cannot update the current table.
- Browser regressions cover concurrent update/Continue prompts and intentionally
  delayed leaderboard responses across resize and close. Runtime exceptions,
  console errors and failed requests remain checked.
- `HANDOFF.local.md` is ignored so local coordination notes remain local.
