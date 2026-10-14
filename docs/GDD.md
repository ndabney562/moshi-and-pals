# Game Design Document

*Living summary of the current design. Full original brief: the project thread.*

**MoshiMonsters.** Comedic top-down wave survival. Dr. Eugene "Moshi" Moshkovich defends a fictional urgent-care clinic from escalating waves of germs using absurd disinfection equipment.

**Parody map:** zombies → germs, guns → disinfection equipment, ammo → cleaning supplies, outbreak → urgent-care contamination disaster.

**Core loop:** move → aim → disinfect → dodge → earn → upgrade → unlock → survive → repeat.

## Current state (v0.6.0)
- Title screen, tap to start.
- MoshiLand Urgent Care (fictional layout): you start in the waiting room; bathroom, exam rooms, lab, staff break room and X-ray are bought open with Copays.
- Eugene (placeholder art) moves with left stick, faces right-stick aim.
- Holding SPRAY sprays the alcohol bottle (cone of droplets, limited supply, manual refill). Eugene auto-aims at the nearest germ in range.
- Germs come in escalating rounds through the doors and hurt Eugene on contact. Health regenerates after a few seconds without a hit.
- Round 3+: Viral Sprinters. Every 5th round: Diamond the Practice Manager.
- Patients wander in from round 2; their health code violations let germs loose. Spray them clean for points and Copays.
- **Copays** (currency, Noah's name) earned per kill. REFILL pours from a limited jug; the SUPPLIES cart restocks the jug for Copays.
- **Sinus Purge** button: a honking shockwave that damages and blasts away nearby germs, on a cooldown.
- **Supply crates** in most rooms: $250 Copays for a random tool (Lysol Fogger, Bleach Super Soaker, UV Wand, Peroxide Foamer). Carry the bottle plus one crate tool; SWAP switches.
- Score per kill; death shows a game over screen with high score; restart in one tap.

## Controls
- Left thumb: floating move stick. Right thumb: hold SPRAY (Noah preferred a button to a hold-to-aim stick). Auto-aim picks the nearest germ; Noah asked for it to be optional, so an AUTO-AIM ON/OFF toggle (saved per device) sits in the top-left HUD.
- Buttons: SPRAY, REFILL, SINUS PURGE (left of SPRAY), RESTOCK (appears at the supply cart).
- Alternative scheme kept in code: twin-stick (`CONTROLS.scheme = 'twinStick'`).
- Desktop testing: WASD/arrows to move, mouse to aim, hold mouse or Space to spray, R to refill, Q to Sinus Purge, E to restock.

## Eugene (from Noah)
Stocky, thinning grey hair, no facial hair, an oddly shaped mouth, glasses. White lab coat over a dark scrub top. Wears a dark patterned scrub cap at work (possible outfit later). Reference photo shared in the project thread (not stored in this public repo).

## Bosses
- **Diamond the Practice Manager** (Noah's pick; replaced the earlier Babushka Bacillus idea): a grouchy practice manager from Trinidad who has it out for Moshi: a big, heavy, slimy germ monster with a bun, a pencil and a clipboard. Fictional. She grumbles in speech bubbles ("Your charts are three days late!"). Moves: Mandatory Meeting (ties Eugene in red tape and drags him to the EXIT; spray to break free), Write-Ups (flings angry pink slips when hurt), Policy Tantrum (clipboard-slam knockback at low health).

## Not yet decided (with Noah)
Clinic name, Eugene's final look, weapon upgrade path, bosses, power-up names.
