# Game Design Document

*Living summary of the current design. Full original brief: the project thread.*

**Pitch:** Comedic top-down wave survival. Dr. Eugene "Moshi" Moshkovich defends a fictional urgent-care clinic from escalating waves of germs using absurd disinfection equipment.

**Parody map:** zombies → germs, guns → disinfection equipment, ammo → cleaning supplies, outbreak → urgent-care contamination disaster.

**Core loop:** move → aim → disinfect → dodge → earn → upgrade → unlock → survive → repeat.

## Current state (v0.2.1)
- Title screen, tap to start.
- Waiting room (fictional layout) with chairs, desk, table, plants, locked doors to future areas.
- Eugene (placeholder art) moves with left stick, faces right-stick aim.
- Holding SPRAY sprays the alcohol bottle (cone of droplets, limited supply, manual refill). Eugene auto-aims at the nearest germ in range.
- Basic Germs keep coming (4 at a time) through doors; they bump Eugene but can't hurt him yet.

## Controls
- Left thumb: floating move stick. Right thumb: hold SPRAY (Noah preferred a button to a hold-to-aim stick). Auto-aim picks the nearest germ.
- Buttons: SPRAY, REFILL; Sinus Purge and contextual Interact later.
- Alternative scheme kept in code: twin-stick (`CONTROLS.scheme = 'twinStick'`).
- Desktop testing: WASD/arrows to move, mouse to aim, hold mouse or Space to spray, R to refill.

## Eugene (from Noah)
Stocky, thinning grey hair, no facial hair, an oddly shaped mouth, glasses. White lab coat over a dark scrub top. Wears a dark patterned scrub cap at work (possible outfit later). Reference photo shared in the project thread (not stored in this public repo).

## Not yet decided (with Noah)
Currency name, clinic name, Eugene's final look, weapon upgrade path, bosses, power-up names.
