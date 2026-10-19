/**
 * Gameplay tuning values. Change numbers here, not inside systems.
 * Speeds are in logical pixels per second.
 */
export const BALANCE = {
  player: {
    moveSpeed: 260,
    /** Radius of Eugene's collision circle. */
    bodyRadius: 22,
    /** How quickly Eugene turns toward his aim direction (0..1 per frame at 60fps). */
    turnSmoothing: 0.35,
    maxHp: 100,
    /** After a hit, Eugene can't be hurt again for this long. */
    invulnerableMs: 700,
    /** Health comes back on its own after this long without being hit... */
    regenDelayMs: 6000,
    /** ...at this many HP per second. */
    regenPerSecond: 6,
    /** Below this fraction of health the screen edges pulse red. */
    lowHealth: 0.3,
  },
  spawning: {
    /** Germs never spawn closer than this to Eugene. */
    minSpawnDistance: 380,
    /** ...and prefer spawn points within this distance, so germs in far-off rooms don't take forever to arrive. */
    maxSpawnDistance: 1600,
  },
  germs: {
    /** How often germ paths are recalculated around furniture. */
    pathRefreshMs: 250,
    /** Within this distance germs stop pathing and lunge straight at Eugene. */
    directChaseDistance: 90,
  },
  feedback: {
    /** How long a germ flashes white when hit. */
    hitFlashMs: 60,
    /** Camera kick on a kill. Kept small on purpose; phones get nauseous fast. */
    killShakeMs: 70,
    killShakeIntensity: 0.003,
    /** How long a hit germ stays squashed (its jelly "boing"). */
    squashMs: 110,
    /** Chance a droplet lands a STAT! critical hit, and its damage multiplier. */
    critChance: 0.1,
    critMult: 2,
  },
  /** SANITATION STREAK: kills in quick succession build a Copay multiplier. */
  streak: {
    /** Each kill keeps the streak alive this long. */
    windowMs: 2000,
    /** +this much Copay multiplier per `killsPerStep` kills... */
    multPerStep: 0.05,
    killsPerStep: 5,
    /** ...up to this. */
    maxMult: 1.5,
    /** Streaks this long get a shout-out when they end, and score this much per kill in them. */
    announceFrom: 10,
    scorePerKill: 5,
  },
  camera: {
    /** How quickly the camera catches up to Eugene (0..1, higher is snappier). */
    followLerp: 0.12,
  },
  /** Diamond the Practice Manager, boss #1. Moves are in systems/DiamondBrain.ts. */
  diamond: {
    /** Something grouchy every this often while she stomps after Eugene. */
    chatterMs: [5500, 8500] as [number, number],
    speechMs: 2400,

    /** MANDATORY MEETING: she ties Eugene up in red tape and drags him out the EXIT door. */
    meetingFirstMs: 5000,
    meetingCooldownMs: 10000,
    meetingRange: 320,
    meetingWindupMs: 800,
    /** Eugene is dragged toward the door at this speed... */
    meetingPullSpeed: 150,
    /** ...and can only walk at this fraction of his normal speed. */
    meetingMoveScale: 0.35,
    /** Her own walking speed toward the door during the meeting. */
    meetingWalkSpeed: 110,
    /** Spray this much damage into her during the meeting to rip the tape. */
    meetingBreakDamage: 80,
    meetingMaxMs: 7000,
    /** Reaching the door: damage and a shove back into the room. */
    meetingDoorDistance: 120,
    meetingDoorDamage: 30,
    meetingDoorShove: 650,

    /** WRITE-UPS: each time she loses this fraction of her health, she flings write-ups. */
    writeUpsEvery: 0.2,
    writeUpsPerBatch: 3,
    writeUpsThrowSpeed: 260,

    /** POLICY TANTRUM: below this health fraction she slams her clipboard, knocking Eugene back. */
    tantrumBelow: 0.4,
    tantrumCooldownMs: 7000,
    tantrumWindupMs: 1000,
    tantrumRadius: 280,
    tantrumShove: 750,
    tantrumShoveMs: 320,
    tantrumDamage: 8,
  },
  /** PATIENT ZERO, boss #2 (systems/PatientZeroBrain.ts). */
  patientZero: {
    firstCoughMs: 3500,
    coughEveryMs: [4200, 6000] as [number, number],
    coughWindupMs: 850,
    coughRange: 330,
    coughConeDeg: 55,
    coughDamage: 14,
    /** Viral Sprinters launched by each cough. */
    coughGerms: 3,
    sneezeBelow: 0.6,
    sneezeEveryMs: 9000,
    sneezeWindupMs: 1000,
    sneezeRange: 520,
    sneezeGlobs: 5,
    /** Spray hits that shame him into a mask, how long it stays on, and the damage he takes meanwhile. */
    complianceHits: 70,
    maskedMs: 8000,
    maskedDamageTaken: 2,
    leaveBelow: 0.25,
    leaveSpeed: 85,
    escapeDistance: 130,
  },
  /** METHICILLIN THE UNKILLABLE, boss #3 (systems/MethicillinBrain.ts). */
  methicillin: {
    /** Damage from one source (a tool, the signature move, a trap) before he adapts to it. */
    adaptAfter: 260,
    /** Damage he still takes from the source he's resisting. */
    resisted: 0.2,
    /** He forgets the resistance after this long (so a one-tool doctor still gets windows). */
    resistMs: 14000,
    /** The Lab autoclave is never resisted, and cooks him this much harder. */
    autoclaveMult: 1.5,
    /** His three layers: health fractions where the outer two peel off. */
    layers: [2 / 3, 1 / 3],
    /** Grapes that burst off when a layer peels (Basic Germs), and how much quicker his attacks come per layer lost. */
    peelGerms: 4,
    peelPaceMult: 0.8,
    firstShotMs: 3000,
    shotEveryMs: [4500, 6500] as [number, number],
    shotWindupMs: 700,
    /** Cluster Shot: grapes fired at Eugene that hatch into Basic Germs. */
    shotGrapes: 3,
    shotSpeed: 360,
    /** ROLL: curls up (a red line shows the path), then bowls straight down it. */
    rollEveryMs: [7000, 9500] as [number, number],
    rollRange: 600,
    rollWindupMs: 1000,
    rollSpeed: 560,
    rollMs: 1500,
    rollDamage: 26,
  },
  /** THE INFLUENZA TWINS, H & N, boss #4 (systems/InfluenzaBrain.ts). */
  influenza: {
    /** Kill the second twin within this long of the first, or the first one gets back up. */
    reviveMs: 6000,
    /** Health a revived twin comes back with (fraction of max). */
    reviveHp: 0.5,
    /** The strand between them: how close to it counts as touching, and the damage. */
    tetherWidth: 18,
    tetherDamage: 12,
    tetherMaxLength: 620,
    /** A closed exam curtain between them snaps the strand: both stunned, and it takes a while to grow back. */
    snapStunMs: 2200,
    regrowMs: 5000,
    /** They circle Eugene from opposite sides, this far out, so the strand sweeps across him. */
    orbitRadius: 230,
    orbitDegPerSec: 38,
    /** Spiral spit: globs fired in a turning spiral. */
    spitEveryMs: [5000, 7000] as [number, number],
    spitGlobs: 8,
    spitStepDeg: 45,
    spitIntervalMs: 120,
    /** P2 ANTIGENIC SHIFT (combined health below this): only one twin is vulnerable, and they swap. */
    shiftBelow: 0.5,
    shiftEveryMs: 6000,
    /** Damage the protected twin takes during the shift. */
    shieldedDamageTaken: 0.15,
  },
  /** Patients with health code violations (data/patients.ts). */
  patients: {
    /** First round they show up in. Boss rounds stay patient-free so Diamond gets the spotlight. */
    firstRound: 2,
    /** Most patients in the room at once, by round. */
    maxActive: (r: number) => Math.min(1 + Math.floor(r / 3), 3),
    spawnEveryMs: [9000, 16000] as [number, number],
    speed: 60,
    radius: 20,
    /** How long they wander before heading home. */
    stayMs: 30000,
    /** Time between violations (each one lets germs in). */
    violationEveryMs: [5000, 8500] as [number, number],
    /** Droplets it takes to shame a patient into cleaning up and leaving. */
    hitsToClean: 8,
    cleanPoints: 25,
    /** Eugene only grumbles about violations he can actually see. */
    grumbleRange: 650,
  },
  /** Copays (currency). Per-germ payouts live in data/germs.ts. */
  economy: {
    /** Methicillin's Prescription when every tool you carry is already at Prescription Strength: Copays instead. */
    prescriptionMaxedCopays: 700,
    /** Cost to refill the jug at the supply cart. */
    restockCost: 40,
    /** Paid for spraying a health code violator into compliance. */
    cleanPatientCopays: 10,
    /** How close Eugene must be to a supply cart or locked door (from its edge) to use it. Door prices live in data/rooms.ts. */
    interactRange: 80,
    /** Price of a Supply Requisition at a crate (pick 1 of 2 tools). */
    crateCost: 250,
    /** Appealing the decision for a fresh pair: the first appeal, then this much more each time. */
    appealCost: 100,
    appealStep: 50,
    /** Chance a claim or an appeal is CLAIM DENIED, and the share of the money that comes back. */
    claimDeniedChance: 0.05,
    deniedRefund: 0.5,
    /** SPOTLESS: finish a round without getting hurt for this many Copays × the round number. */
    spotlessPerRound: 10,
    /** ...and this much score × the round number. */
    spotlessScorePerRound: 25,
    /** EXAM TABLE: lie down for a moment. Heals this much for this many Copays, once per table per round. */
    restCost: 40,
    restHeal: 50,
    /** Purchases this expensive need a press-and-hold on USE (CONTROLS.holdToBuyMs). */
    holdToBuyFrom: 100,
  },
  /** RESISTANT elites ("antibiotic-resistant" versions of normal germs). */
  elites: {
    firstRound: 8,
    /** Chance a spawning germ is an elite, by round. */
    chance: (r: number) => (r < 8 ? 0 : Math.min(0.05 + 0.01 * (r - 8), 0.14)),
    hpMult: 2.5,
    copaysMult: 3,
    pointsMult: 3,
    /** Shielded: a bubble that soaks this fraction of max health first. */
    shield: 0.5,
    hastySpeed: 1.35,
    /** Regenerating: heals this fraction of max health per second. */
    regenPerSec: 0.04,
    /** Splitting: bursts into this many basic germs. */
    splitInto: 2,
  },
  /** Power-up pickups. */
  powerups: {
    /** Chance any normal germ drops one (elites always do). */
    dropChance: 0.012,
    /** Seconds on the floor before it vanishes; it blinks for the last `blinkMs`. */
    lifeMs: 10000,
    blinkMs: 3000,
    pickupRadius: 46,
    statCleanRadius: 520,
    /** FLU SHOT: max health it adds (and heals), and how often random drops pick it next to the others (1). */
    fluShotHp: 15,
    fluShotWeight: 0.25,
    /** Stat Clean takes this much of a boss's max health instead of killing it. */
    statCleanBoss: 0.15,
    erWaitSlow: 0.3,
  },
  /** PERFECT POUR: tap REFILL again while the pour is in its sweet spot. */
  pour: {
    /** The sweet spot, as a fraction of the refill time. */
    windowStart: 0.45,
    windowEnd: 0.65,
    /** Nailing it: the bottle is full instantly and FRESH BOTTLE boosts damage this much for this long. */
    freshMult: 1.2,
    freshMs: 4000,
    /** Missing it: the pour takes this much longer (once per refill). */
    spillMs: 500,
  },
  /** SINUS PURGE: Eugene's signature honk. A shockwave that damages and blasts germs away. */
  purge: {
    cooldownMs: 18000,
    radius: 240,
    damage: 35,
    knockback: 750,
    /** Germs hit are stunned this long, so the blast buys breathing room. */
    stunMs: 600,
  },
  /** M14: the clinic fights back. Room traps are used at their station (USE) and then recharge. */
  traps: {
    /** BATHROOM jet hand dryer: free, blasts every germ nearby back out of the room. */
    dryer: { cost: 0, cooldownMs: 20000, radius: 240, damage: 20, knockback: 950, stunMs: 900 },
    /** LAB autoclave: after a hiss, a steam cycle cooks everything around it (ignores armor). */
    autoclave: { cost: 25, cooldownMs: 30000, windupMs: 1200, radius: 175, damage: 140 },
    /** X-RAY: a pulse from the machine through walls and all (Eugene's behind the lead partition). */
    xray: { cost: 40, cooldownMs: 25000, radius: 520, damage: 60 },
    /** EXAM ROOM privacy curtain: free, pulled across the doorway as a wall for `closedMs`. It snaps the Influenza Twins' strand. */
    curtain: { cost: 0, cooldownMs: 20000, closedMs: 8000 },
  },
  /** Break-time snacks from the waiting-room vending machine: three random choices, each once, a few per run. */
  vending: { maxPerRun: 3, choices: 3 },
  /** DR. KAYA's signature: a sprint that bowls over every germ in his lane (he can't be hurt mid-sprint). */
  codeBlue: { cooldownMs: 9000, distance: 320, ms: 230, guardMs: 250, width: 90, damage: 30, knockback: 650, stunMs: 700 },
  /** PA LUCIEN's signature: a sterile zone where he stands; germs inside are slowed and take damage. */
  cleanField: { cooldownMs: 20000, ms: 6000, radius: 180, slow: 0.4, dps: 22 },
  /**
   * DIFFICULTY (title screen; data/difficulties.ts). Multipliers on germ health, every hit Eugene takes,
   * the time between spawns (more = slower), and Copays from kills. Urgent is the game as tuned.
   */
  difficulty: {
    walkIn: { germHp: 0.75, germDamage: 0.6, spawnInterval: 1.25, copays: 1.2 },
    urgent: { germHp: 1, germDamage: 1, spawnInterval: 1, copays: 1 },
    trauma: { germHp: 1.35, germDamage: 1.4, spawnInterval: 0.8, copays: 0.85 },
  },
  /** TODAY'S SHIFT (daily challenge). */
  daily: {
    /** Modifiers rolled from the date. */
    modifiers: 2,
    /** CME Credits for the first finished Today's Shift each day. */
    firstFinishCme: 2,
  },
  /** MODIFIERS (data/modifiers.ts). */
  modifiers: {
    /** Flu Season: Viral Sprinter spawn weight ×, and their weight in rounds before they'd normally show up. */
    fluSeason: { sprinterMult: 2, earlyWeight: 0.15 },
    /**
     * Power Outage: how dark the map gets (0..1), the flashlight's radius around the doctor and how soft its
     * edge is (fraction of the radius that fades). The dark is one pre-drawn texture, drawn at 1/`texScale` size.
     */
    powerOutage: { darkness: 0.9, lightRadius: 330, softEdge: 0.45, texScale: 4 },
    /** Inspection Day: Spotless bonus × (stacks with the Inspection Day special round). */
    inspectionDay: { spotlessMult: 3 },
    /** Short-Staffed: supply cart restock price ×. */
    shortStaffed: { restockCostMult: 3 },
    /**
     * Construction: from this round, one opened room's doors close to Eugene for the round (germs fit under).
     * Never a room he's in, never within `clearance` px of him, and only if he can still walk back to the
     * waiting room.
     */
    construction: { fromRound: 2, clearance: 140 },
    /** Full Moon: germ size range (looks only, hitboxes stay put), the moonlit floor tint. Patients walk backwards. */
    fullMoon: { sizeMin: 0.7, sizeMax: 1.45, floorTint: 0xb8a8ff },
  },
  /**
   * KEN: his passive (damage × against Diamond, from everything) and his signature, FILE A GRIEVANCE: a blast
   * of paperwork that hits and stuns germs around him, and summons Diamond to HR (frozen, no meetings,
   * no tantrums) if she's within `hrRange`. Breaks a Mandatory Meeting in progress.
   */
  grievance: {
    diamondDamage: 1.5,
    cooldownMs: 15000, radius: 210, damage: 35, knockback: 420, stunMs: 900,
    hrRange: 900, hrMs: 3500,
  },
  /**
   * SCRIBES (Omar and Alan), unlocked on the Residency Board, then dropped as power-ups. They follow Eugene for
   * `ms`, attack germs in `range` and shame violating patients (one "spray" every `cleanEveryMs`, the same
   * hitsToClean as Eugene's droplets). They can't be hurt and teleport back if left behind or stuck.
   */
  scribes: {
    ms: 20000,
    speed: 300,
    /** Where they stand: this far behind Eugene, off to one side. */
    followDistance: 85,
    teleportDistance: 650,
    stuckMs: 1500,
    range: 280,
    cleanRange: 240,
    cleanEveryMs: 300,
    /** Omar sprays: quick, light hits on the nearest germ. */
    omar: { everyMs: 420, damage: 13, knockback: 120 },
    /** Alan zaps: slower, harder, jumps to `chain` more germs and stuns each. */
    alan: { everyMs: 950, damage: 26, knockback: 60, chain: 2, chainRange: 160, stunMs: 400 },
  },
  /**
   * NPS SCORES: the saved currency that hires the Pals. Eugene is free; everyone else is bought once with NPS
   * and is a bit stronger than him. Earned at the end of every shift.
   */
  nps: {
    perRound: 1,
    perPatient: 1,
    perBoss: 3,
    prices: { kaya: 30, lucien: 45, ken: 60 } as Record<string, number>,
  },
  /** What a hired Pal has over Eugene (on top of their signature move). toolDamage = damage × with every tool. */
  doctors: {
    kaya: { moveSpeed: 1.12, toolDamage: 1.1 },
    lucien: { maxHp: 30, toolDamage: 1.1 },
    ken: { maxHp: 15, toolDamage: 1.1 },
  },
  /**
   * THE MIRACLE CURE (secret quest; content in data/miracleCure.ts, logic in systems/MiracleCure.ts).
   * Phone: stay within `phoneRange` of the front desk for `holdMs` during a live round. Fish: `fishCost` buys
   * `stenchMs` of stench (the fridge's sticky note is readable meanwhile). Key: `keyPrice` at the vending machine.
   * Stall 3 opens after `flushes` flushes in one boss round.
   */
  miracleCure: {
    holdMs: 20000,
    phoneRange: 260,
    fishCost: 5,
    stenchMs: 25000,
    keyPrice: 1,
    flushes: 3,
  },
  /**
   * THE LAST FAX MACHINE (Records Room boss; systems/FaxMachineBrain.ts). Shuffles along its shelf, faxes out
   * `pages` Fax Pages every `faxEveryMs`, and below `screechBelow` health winds up a DIAL-UP SCREECH (hurts within
   * `screechRadius`). Below `jamBelow` it jams now and then: stopped and taking `jamDamageTaken` × damage for `jamMs`.
   */
  faxMachine: {
    shuffle: 260,
    faxEveryMs: 3200, pages: 4, pageSpeed: 300,
    screechBelow: 0.75, screechEveryMs: 7000, screechWindupMs: 1100, screechRadius: 230, screechDamage: 22,
    jamBelow: 0.5, jamEveryMs: 9000, jamMs: 2600, jamDamageTaken: 2,
  },
};
