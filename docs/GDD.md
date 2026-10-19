# Game Design Document

*Living summary of the current design. Full original brief: the project thread.*

**Moshi and Pals.** Comedic top-down wave survival. Dr. Eugene "Moshi" Moshkovich defends a fictional urgent-care clinic from escalating waves of germs using absurd disinfection equipment.

**Parody map:** zombies → germs, guns → disinfection equipment, ammo → cleaning supplies, outbreak → urgent-care contamination disaster.

**Core loop:** move → aim → disinfect → dodge → earn → upgrade → unlock → survive → repeat.

## Current state (v0.18.0)
- Title screen, tap to start.
- MoshiLand Urgent Care, laid out after the real clinic (M8): ground floor and upstairs joined by two staircases. You start in the waiting room; the hallway loop, 15 exam rooms, bathrooms, supply closets, lab, X-ray, manager's office, egress stairs and the whole upstairs are bought open with Copays.
- Four playable Pals, picked on the title screen: Dr. Moshkovich (Sinus Purge), Dr. Kaya (Code Blue sprint), PA Lucien (Clean Field zone) and Ken (File a Grievance; hits Diamond harder). Noah's coworkers; their reference photos stay out of the repo.
- Scribes Omar and Alan: hired on the Residency Board, then each shift they wait in a random first-floor exam room; open it and they follow you for the rest of the shift, fighting germs and cleaning up violating patients.
- Holding SPRAY sprays the alcohol bottle (cone of droplets, limited supply, manual refill). Eugene auto-aims at the nearest germ in range.
- Germs come in escalating rounds through the doors and hurt Eugene on contact. Health regenerates after a few seconds without a hit.
- Round 3+: Viral Sprinters. Round 4+: Sneezers (ranged, slowing puddles). Round 6+: Spore Pods (armored front; flank, UV, or Purge-flip them). Every 5th round a boss: Diamond the Practice Manager (5, 15, 25) or Patient Zero (10, 20). From round 8, RESISTANT elites drop power-ups; special rounds from round 7. Ecology (M11): Diplococcus Duo splits (7+), Bacillus Bulldozer charges and gets dazed by walls (8+), Chonk Coccus bursts into six (8+), Mother Culture heals (9+), Colony flocks (10+), Mold Spot spawns spores (11+).
- Sanitation Streak (kill chains raise Copays up to 1.5×), Spotless bonus for a no-damage round, STAT! crits, Perfect Pour active refill.
- Pause menu (II, top right) with sound, auto-refill and auto-aim settings; auto-pauses when the app is left.
- Patients wander in from round 2; their health code violations let germs loose. Spray them clean for points and Copays.
- **Copays** (currency, Noah's name) earned per kill. REFILL pours from a limited jug; the SUPPLIES cart restocks the jug for Copays.
- **Sinus Purge** button: a honking shockwave that damages and blasts away nearby germs, on a cooldown.
- **Supply Requisition** at the crates in most rooms: $250 Copays, then pick 1 of 2 tools (Lysol Fogger, Bleach Super Soaker, UV Wand, Peroxide Foamer, Disinfectant Wipes, Gel Launcher, Defib Paddles). Appeal for a new pair at a rising price; 5% of claims are denied (joke item, half back). Carry the bottle plus one crate tool; SWAP switches.
- Score per kill; death shows the Discharge Summary (cause of death, records, achievements this shift); restart in one tap.
- Room traps: bathroom hand dryers (free blast), the Lab autoclave (steam cycle), the X-ray (pulse through walls). A waiting-room vending machine sells run-long snacks (3 per run).
- 27 achievements (pause menu list, toasts). Shifts earn CME Credits for the Residency Board (Specialties with trade-offs, a Starter Kit tool) and fill the Microbiology Atlas. Works offline from the Home Screen; the title screen offers updates.

## Controls
- Left thumb: floating move stick. Right thumb: hold SPRAY (Noah preferred a button to a hold-to-aim stick). Auto-aim picks the nearest germ; Noah asked for it to be optional, so an AUTO-AIM ON/OFF toggle (saved per device) sits in the pause menu (II, top right).
- Right half of the screen sprays (the SPRAY ring floats to the thumb); drag the spraying thumb to aim by hand. Auto-aim only targets germs Eugene can see.
- Buttons: SPRAY, REFILL, SINUS PURGE (left of SPRAY), USE (stations; hold to buy $100+), II pause (top right).
- Alternative scheme kept in code: twin-stick (`CONTROLS.scheme = 'twinStick'`).
- Desktop testing: WASD/arrows to move, mouse to aim, hold mouse or Space to spray, R to refill, Q to Sinus Purge, E to restock.

## Eugene (from Noah)
In game he looks like the man on Noah's title poster: messy brown-grey hair, blue surgical mask, stethoscope. White lab coat over a dark scrub top. Wears a dark patterned scrub cap at work (possible outfit later). Reference photo shared in the project thread (not stored in this public repo).

## Bosses
- **Diamond the Practice Manager** (Noah's pick; replaced the earlier Babushka Bacillus idea): a grouchy practice manager from Trinidad who has it out for Moshi: a big, heavy, slimy germ monster with a striped knit headwrap, beaded dreadlocks, gold hoops and a clipboard (look from Noah's picture, v0.18). Fictional. She grumbles in speech bubbles ("Your charts are three days late!"). Moves: Mandatory Meeting (ties Eugene in red tape and drags him to the EXIT; spray to break free), Write-Ups (flings angry pink slips when hurt), Policy Tantrum (clipboard-slam knockback at low health).

## Not yet decided (with Noah)
Clinic name, Eugene's final look, weapon upgrade path, bosses, power-up names.
