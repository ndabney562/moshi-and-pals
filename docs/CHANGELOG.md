# Changelog

## v0.2.2
- AUTO-AIM ON/OFF toggle in the top-left HUD, saved on the device (`src/core/settings.ts`). Off: Eugene faces and sprays where he walks.

## v0.2.1: Noah's Milestone 2 playtest
- Spraying is now a SPRAY button (hold to spray). Eugene auto-aims at the nearest germ within 240 px, otherwise faces where he walks. Twin-stick aiming is still available via `CONTROLS.scheme`.
- Spray range shortened from 300 to 200 px.
- Eugene redrawn from Noah's description: stocky, thinning grey hair with a bald top, glasses, white coat over a dark navy scrub top.
- Desktop testing: Space also sprays.

## v0.2.0: Milestone 2, squirt bottle vs. first germ
- Isopropyl alcohol squirt bottle: push the aim stick to spray. 120 mL, drains as you spray.
- Bottle meter and REFILL button (also R key). The button throbs when you're nearly empty.
- Basic Germ: chases Eugene, paths around furniture, enters through doors.
- Hit feedback: white flash, knockback, splashes, damage numbers, splat + fading floor stain, tiny camera kick.
- Placeholder synthesized sounds: spray, hit, pop, bump, empty click, refill.
- Germs bump Eugene (no damage until Milestone 3). Kill counter in the HUD.
- CI runs the build and phone-sized smoke test on every pull request.

## v0.1.0: Milestone 1, movement sandbox
- Project setup, auto-deploy to GitHub Pages, Add to Home Screen support.
- Title screen; waiting room with furniture and locked doors.
- Eugene placeholder with twin-stick touch controls, waddle, and camera follow.
- FPS counter and build label; "rotate your phone" screen in portrait.
