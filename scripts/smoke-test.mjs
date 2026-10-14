/**
 * Smoke test: builds must already exist (npm run build). Serves dist/, opens
 * the game in a phone-sized landscape browser with touch, taps to start,
 * drags the move stick, and checks Eugene actually moved with no errors.
 * Screenshots land in the repo root as smoke-*.png (git-ignored).
 *
 *   npm run build && npm run smoke
 */
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4173, strictPort: true } });
const url = 'http://localhost:4173/moshi-and-pals/';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
// iPhone 15-ish, landscape
const context = await browser.newContext({
  viewport: { width: 852, height: 393 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) failed = true;
  // On GitHub Actions, failures also become annotations (readable from the PR's checks without the raw log)
  if (!ok && process.env.GITHUB_ACTIONS) console.log(`::error title=Smoke test::${String(msg).replace(/\r?\n/g, ' ')}`);
};

try {
  await page.goto(url);
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await page.screenshot({ path: 'smoke-title.png' });

  await page.touchscreen.tap(426, 200);
  await page.waitForFunction(() => window.game.scene.isActive('Hud'));
  await page.waitForTimeout(300);

  const pos = () => page.evaluate(() => {
    const p = window.game.scene.getScene('Game').children.list.find((c) => c.texture?.key === 'eugene');
    return { x: p.x, y: p.y, rotation: p.rotation };
  });
  const start = await pos();
  const firstHint = await page.evaluate(() => window.game.scene.getScene('Hud').hintText.text);

  // Screen position of a HUD button, in page pixels
  const buttonAt = (name) => page.evaluate((n) => {
    const b = window.game.scene.getScene('Hud')[n];
    const canvas = window.game.canvas.getBoundingClientRect();
    const k = canvas.width / window.game.scale.width;
    return { x: canvas.left + b.x * k, y: canvas.top + b.y * k };
  }, name);

  // Drag the left stick up-right with one finger
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  /** Press and hold a screen point until `done()` is true in the page (or 15 s pass), then lift. */
  const holdAt = async (p, done) => {
    await touch('touchStart', [{ x: p.x, y: p.y, id: 7 }]);
    await page.waitForFunction(done, null, { timeout: 15000 }).catch(() => {});
    await touch('touchEnd', []);
    await page.waitForTimeout(100);
  };
  const L = { x: 120, y: 300, id: 1 };
  await touch('touchStart', [L]);
  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', [{ ...L, x: L.x + i * 4, y: L.y - i * 4 }]);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'smoke-game.png' });
  const end = await pos();
  await touch('touchEnd', []);

  // Hold SPRAY for a few seconds and let auto-aim find the germs
  const game = () => page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const eugene = scene.children.list.find((c) => c.texture?.key === 'eugene');
    const germs = scene.children.list.filter((c) => c.texture?.key?.startsWith('germ-') && c.active);
    germs.sort((a, b) => Math.hypot(a.x - eugene.x, a.y - eugene.y) - Math.hypot(b.x - eugene.x, b.y - eugene.y));
    const g = germs[0];
    return {
      ammo: scene.sprayer.ammo, kills: scene.kills, germs: germs.length,
      // Distance to auto-aim's target (only germs Eugene can see count; none = Infinity, so no sample)
      dist: (() => { const t = scene.aimLock?.active ? scene.aimLock : undefined; return t ? Math.hypot(t.x - eugene.x, t.y - eugene.y) : Infinity; })(),
      nearest: g ? Math.hypot(g.x - eugene.x, g.y - eugene.y) : Infinity,
      facing: eugene.rotation,
      // Auto-aim sticks with its current target (scene.aimLock) until another is clearly closer, so check against that
      aim: (() => { const t = scene.aimLock?.active ? scene.aimLock : g; return t ? Math.atan2(t.y - eugene.y, t.x - eugene.x) : 0; })(),
    };
  });
  // Let the germs come to Eugene (within spray range) before spraying
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    const e = scene.children.list.find((c) => c.texture?.key === 'eugene');
    return scene.children.list.some((c) => c.texture?.key?.startsWith('germ-') && c.active && Math.hypot(c.x - e.x, c.y - e.y) < 180);
  }, null, { timeout: 90000 });
  const before = await game();
  check(before.germs > 0, `germs spawned and approached (${before.germs} alive)`);
  const spray = await buttonAt('sprayButton');
  await touch('touchStart', [{ ...spray, id: 3 }]);
  let aimSamples = 0;
  let aimHits = 0;
  for (let i = 0; i < 70; i++) {
    await page.waitForTimeout(100);
    if (i === 8) await page.screenshot({ path: 'smoke-spray.png' });
    // Whenever a germ is clearly in range, Eugene should be facing it
    const { aim, dist, facing } = await game();
    if (dist < 180) {
      aimSamples++;
      if (Math.abs(Math.atan2(Math.sin(facing - aim), Math.cos(facing - aim))) < 0.5) aimHits++;
    }
  }
  check(aimSamples > 0 && aimHits / aimSamples >= 0.6, `auto-aim faces its target germ (${aimHits}/${aimSamples} samples)`);
  await touch('touchEnd', []);
  const after = await game();
  check(after.ammo < before.ammo, `spraying used alcohol (${before.ammo} -> ${after.ammo} mL)`);
  check(after.kills > 0, `germs disinfected (${after.kills})`);

  // Tap the Refill button
  const refillAt = await buttonAt('refillButton');
  await page.touchscreen.tap(refillAt.x, refillAt.y);
  // Refill takes 1.1 s of game time (which runs slower than real time when frames drop)
  await page.waitForFunction(() => window.game.scene.getScene('Game').sprayer.ammo === 120, null, { timeout: 15000 }).catch(() => {});
  const refilled = await game();
  check(refilled.ammo === 120, `Refill button refilled the bottle (${refilled.ammo} mL)`);
  // Perfect Pour: REFILL again in the gold sweet spot fills instantly and gives FRESH BOTTLE; too early spills
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.sprayer.ammo = 10;
    scene.sprayer.reserve = scene.sprayer.def.reserve;
    scene.refillPressed(scene.time.now);
  });
  const pour = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    // Put the pour right in the gold window (slow browsers can skip past it between frames)
    scene.sprayer.refillStartedAt = scene.time.now - scene.sprayer.def.refillMs * 0.55;
    scene.refillPressed(scene.time.now);
    return { ammo: scene.sprayer.ammo, fresh: scene.sprayer.fresh(scene.time.now), label: window.game.scene.getScene('Hud').toolText.text };
  });
  check(pour.ammo === 120 && pour.fresh, `Perfect Pour fills the bottle at once with FRESH BOTTLE (${JSON.stringify(pour)})`);
  const spill = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.sprayer.ammo = 10;
    scene.refillPressed(scene.time.now);
    scene.refillPressed(scene.time.now); // way too early
    return { spilled: scene.sprayer.spilled, refilling: scene.sprayer.refilling };
  });
  check(spill.spilled && spill.refilling, 'tapping REFILL too early spills (the pour takes longer)');
  await page.waitForFunction(() => !window.game.scene.getScene('Game').sprayer.refilling, null, { timeout: 15000 }).catch(() => {});
  // Pause: the button freezes the game and opens the menu; AUTO-AIM lives there now
  const pauseAt = await buttonAt('pauseButton');
  await page.touchscreen.tap(pauseAt.x, pauseAt.y);
  await page.waitForTimeout(250);
  const pausedState = await page.evaluate(() => {
    const hud = window.game.scene.getScene('Hud');
    const scene = window.game.scene.getScene('Game');
    return { paused: window.game.scene.isPaused('Game'), menu: hud.pauseMenu.visible, t: scene.time.now, tip: hud.pauseTip.text };
  });
  await page.waitForTimeout(400);
  const frozenT = await page.evaluate(() => window.game.scene.getScene('Game').time.now);
  check(pausedState.paused && pausedState.menu && frozenT === pausedState.t, `PAUSE button freezes the game and shows the menu ("${pausedState.tip}")`);
  await page.screenshot({ path: 'smoke-paused.png' });
  // Tap AUTO-AIM to turn it off; it should be saved for next time
  const toggle = await buttonAt('autoAimToggle');
  await page.touchscreen.tap(toggle.x, toggle.y);
  await page.waitForTimeout(200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}'));
  check(saved.autoAim === false, `AUTO-AIM toggle turns it off and saves it (${JSON.stringify(saved)})`);
  // SOUND toggles and saves too (turn it back on afterwards)
  const soundAt = await buttonAt('soundToggle');
  await page.touchscreen.tap(soundAt.x, soundAt.y);
  await page.waitForTimeout(200);
  const muted = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}').sound);
  await page.touchscreen.tap(soundAt.x, soundAt.y);
  await page.waitForTimeout(200);
  check(muted === false, 'SOUND toggle mutes and saves');
  // RESUME
  const resumeAt = await buttonAt('resumeItem');
  await page.touchscreen.tap(resumeAt.x, resumeAt.y);
  await page.waitForTimeout(300);
  const resumed = await page.evaluate(() => !window.game.scene.isPaused('Game') && !window.game.scene.getScene('Hud').pauseMenu.visible);
  check(resumed, 'RESUME unpauses the game');
  await page.screenshot({ path: 'smoke-after.png' });

  // Waves and score
  const run = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { round: scene.waves.round, score: scene.score, hud: window.game.scene.getScene('Hud').roundText.text };
  });
  check(run.round >= 1 && run.hud === `ROUND ${run.round}`, `wave system running (${run.hud})`);
  check(run.score > 0, `score counts kills (${run.score})`);

  // Copays from kills
  const money = await page.evaluate(() => ({
    copays: window.game.scene.getScene('Game').copays,
    hud: window.game.scene.getScene('Hud').copaysText.text,
  }));
  check(money.copays > 0 && money.hud === `$${money.copays} COPAYS`, `kills earn Copays (${money.hud})`);

  // Sinus Purge: tap the button with a germ right next to Eugene
  const purgeBefore = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.player.hp = 100;
    scene.spawnGermAt('basic', scene.player.x + 80, scene.player.y);
    const g = scene.germs.getChildren().filter((c) => c.active).sort((a, b) =>
      Math.hypot(a.x - scene.player.x, a.y - scene.player.y) - Math.hypot(b.x - scene.player.x, b.y - scene.player.y))[0];
    window.__purgeTarget = g;
    return { hp: g.hp, kills: scene.kills };
  });
  const purgeAt = await buttonAt('purgeButton');
  await page.touchscreen.tap(purgeAt.x, purgeAt.y);
  await page.waitForTimeout(300);
  const purged = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const g = window.__purgeTarget;
    return { hp: g.active ? g.hp : 0, kills: scene.kills, cooling: scene.purgeReadyAt > scene.time.now, dim: window.game.scene.getScene('Hud').purgeButton.alpha < 1 };
  });
  await page.screenshot({ path: 'smoke-purge.png' });
  check(purged.hp < purgeBefore.hp || purged.kills > purgeBefore.kills, `Sinus Purge hurts nearby germs (hp ${purgeBefore.hp} -> ${purged.hp})`);
  check(purged.cooling && purged.dim, 'Sinus Purge goes on cooldown');

  // Supply cart: empty jug, walk over, buy a restock
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.sprayer.reserve = 0;
    scene.addCopays(100 - scene.copays);
    const cart = scene.carts[0];
    scene.player.setPosition(cart.x + cart.w / 2, cart.y - 50);
  });
  await page.waitForFunction(() => window.game.scene.getScene('Hud').interactButton.visible, null, { timeout: 15000 });
  const restockAt = await buttonAt('interactButton');
  await page.touchscreen.tap(restockAt.x, restockAt.y);
  await page.waitForTimeout(200);
  const restocked = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { reserve: scene.sprayer.reserve, copays: scene.copays };
  });
  check(restocked.reserve === 480 && restocked.copays === 60, `supply cart restocks the jug for Copays (${JSON.stringify(restocked)})`);

  // Rooms: walk up to the HALLWAYS gate and buy it open with Copays.
  // Eugene is made untouchable from here (slow browsers take a while) until the death test.
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.player.hp = scene.player.maxHp;
    scene.player.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    scene.addCopays(300 - scene.copays);
    const door = scene.lockedDoors.find((d) => d.o.opens === 'halls').o;
    scene.player.setPosition(door.x + door.w / 2, door.y + door.h + 40);
  });
  await page.waitForFunction(() => window.game.scene.getScene('Hud').interactButton.label?.text?.startsWith('OPEN'), null, { timeout: 15000 }).catch(() => {});
  const doorLabel = await page.evaluate(() => window.game.scene.getScene('Hud').interactButton.label?.text);
  const openAt = await buttonAt('interactButton');
  // Purchases of $100+ need a press-and-hold: a quick tap does nothing
  await page.touchscreen.tap(openAt.x, openAt.y);
  await page.waitForTimeout(600);
  const tapOnly = await page.evaluate(() => window.game.scene.getScene('Game').unlocked.has('halls'));
  check(!tapOnly, 'a quick tap on USE does not buy the $250 HALLWAYS gate');
  await holdAt(openAt, () => window.game.scene.getScene('Game').unlocked.has('halls'));
  const opened = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return {
      unlocked: scene.unlocked.has('halls'),
      doorGone: !scene.lockedDoors.some((d) => d.o.opens === 'halls'),
      copays: scene.copays,
      room: window.game.scene.getScene('Hud').roomText.text,
    };
  });
  check(opened.unlocked && opened.doorGone && opened.copays === 50, `USE (${JSON.stringify(doorLabel)}) buys the HALLWAYS gate open (${JSON.stringify(opened)})`);
  check(opened.room.includes('WAITING ROOM'), `HUD shows which room Eugene is in (${opened.room})`);
  // Walk into the west hallway (plan 460, 900)
  await page.evaluate(() => window.game.scene.getScene('Game').player.setPosition(930, 1590));
  await page.waitForFunction(() => window.game.scene.getScene('Hud').roomText.text.includes('HALLWAYS'), null, { timeout: 15000 }).catch(() => {});
  check((await page.evaluate(() => window.game.scene.getScene('Hud').roomText.text)).includes('HALLWAYS'), 'walking into the hallways updates the room label');
  await page.screenshot({ path: 'smoke-rooms.png' });

  // Supply crate: buy a random new tool, spray with it, then SWAP back to the bottle
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.addCopays(300 - scene.copays);
    const crate = scene.crates[0];
    scene.player.setPosition(crate.x + crate.w / 2, crate.y - 45);
  });
  await page.waitForFunction(() => window.game.scene.getScene('Hud').interactButton.label?.text?.startsWith('CRATE'), null, { timeout: 15000 }).catch(() => {});
  const crateAt = await buttonAt('interactButton');
  await holdAt(crateAt, () => window.game.scene.getScene('Game').loadout.length === 2);
  const crated = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { tools: scene.loadout.map((t) => t.def.id), slot: scene.slot, copays: scene.copays, swap: window.game.scene.getScene('Hud').swapButton.visible };
  });
  check(crated.tools.length === 2 && crated.slot === 1 && crated.copays === 50 && crated.swap, `supply crate gives a new tool for Copays (${JSON.stringify(crated)})`);
  await page.screenshot({ path: 'smoke-crate.png' });
  const toolFired = await page.evaluate(async () => {
    const scene = window.game.scene.getScene('Game');
    const before = scene.sprayer.ammo;
    scene.sprayer.tryFire(scene.player.x, scene.player.y, 0, scene.time.now + 10000);
    return { before, after: scene.sprayer.ammo, name: scene.sprayer.def.name };
  });
  check(toolFired.after < toolFired.before, `the crate tool sprays (${toolFired.name}: ${toolFired.before} -> ${toolFired.after})`);
  const swapAt = await buttonAt('swapButton');
  await page.touchscreen.tap(swapAt.x, swapAt.y);
  await page.waitForTimeout(200);
  const swapped = await page.evaluate(() => window.game.scene.getScene('Game').sprayer.def.id);
  check(swapped === 'squirtBottle', `SWAP switches back to the bottle (${swapped})`);

  // A second crate would replace the crate tool: USE says so
  await page.waitForFunction(() => window.game.scene.getScene('Hud').interactNote.text.length > 0, null, { timeout: 15000 }).catch(() => {});
  const note = await page.evaluate(() => window.game.scene.getScene('Hud').interactNote.text);
  check(/Replaces your/.test(note), `crate warns which tool it replaces (${JSON.stringify(note)})`);

  // Spray zone: a touch anywhere on the right half sprays, and dragging it aims by hand
  await page.evaluate(() => { const sc = window.game.scene.getScene('Game'); sc.player.setPosition(sc.room.playerSpawn.x, sc.room.playerSpawn.y); });
  const zone = await page.evaluate(() => {
    const r = window.game.canvas.getBoundingClientRect();
    return { x: r.left + r.width * 0.62, y: r.top + r.height * 0.55 };
  });
  await touch('touchStart', [{ ...zone, id: 8 }]);
  const zoneFire = { firing: await page.waitForFunction(() => window.game.scene.getScene('Hud').sprayTouchId !== null, null, { timeout: 15000 }).then(() => true, () => false) };
  for (let i = 1; i <= 6; i++) {
    await touch('touchMove', [{ x: zone.x, y: zone.y - i * 12, id: 8 }]);
    await page.waitForTimeout(30);
  }
  await page.waitForFunction(() => {
    const e = window.game.scene.getScene('Game').player;
    return Math.abs(Math.atan2(Math.sin(e.rotation + Math.PI / 2), Math.cos(e.rotation + Math.PI / 2))) < 0.3;
  }, null, { timeout: 15000 }).catch(() => {});
  const dragAim = await page.evaluate(() => ({ rot: window.game.scene.getScene('Game').player.rotation }));
  await touch('touchEnd', []);
  const zoneOff = await page.waitForFunction(() => window.game.scene.getScene('Hud').sprayTouchId === null, null, { timeout: 15000 }).then(() => true, () => false);
  check(zoneFire.firing && zoneOff, 'touching the right half (off the SPRAY button) sprays until lifted');
  check(Math.abs(Math.atan2(Math.sin(dragAim.rot + Math.PI / 2), Math.cos(dragAim.rot + Math.PI / 2))) < 0.3, `dragging the spray thumb up aims Eugene up (rotation ${dragAim.rot.toFixed(2)})`);

  // Auto-aim needs line of sight: nothing through walls
  const los = await page.evaluate(() => {
    const f = window.game.scene.getScene('Game').flow;
    const sp = window.game.scene.getScene('Game').room.playerSpawn;
    return { throughWall: f.lineClear(sp.x, sp.y, sp.x, sp.y - 1800), open: f.lineClear(sp.x - 100, sp.y, sp.x + 280, sp.y) };
  });
  check(!los.throughWall && los.open, `line of sight is blocked by walls, clear across open floor (${JSON.stringify(los)})`);
  // Sanitation Streak: quick kills build a Copay multiplier; each kill pops and drops a halo
  const streak = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (let i = 0; i < 6; i++) scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 });
    const before = scene.copays;
    const targets = scene.germs.getChildren().filter((g) => g.active && !g.def.boss).slice(0, 6);
    for (const g of targets) scene.damageGerm(g, 9999, 0, 0);
    return { streak: scene.streak, mult: scene.streakMult, gained: scene.copays - before, halos: scene.fx.halos.filter((h) => h.visible).length };
  });
  check(streak.streak >= 6 && streak.mult > 1 && streak.halos > 0, `kills build a Sanitation Streak with a Copay multiplier and halos (${JSON.stringify(streak)})`);
  await page.waitForFunction(() => window.game.scene.getScene('Hud').streakText.text.startsWith('STREAK'), null, { timeout: 15000 }).catch(() => {});
  check((await page.evaluate(() => window.game.scene.getScene('Hud').streakText.text)).startsWith('STREAK ×'), 'HUD shows the streak');
  // Off-screen threat arrows: a germ just off the right edge of the screen gets an arrow pointing at it
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.player.setPosition(1350, 3330); // in front of reception, so the camera isn't against a wall
    scene.cameras.main.centerOn(1350, 3330);
    scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 });
    const g = scene.germs.getChildren().find((c) => c.active);
    const v = scene.cameras.main.worldView;
    g.setPosition(v.right + 60, scene.player.y);
    g.freeze();
  });
  // Other germs may spawn meanwhile, so look for an arrow at the right edge pointing right
  const rightArrow = () => {
    const hud = window.game.scene.getScene('Hud');
    return hud.arrows.some((a) => a.visible && a.x > hud.scale.width * 0.85 && Math.abs(a.rotation) < 0.4);
  };
  const arrowOk = await page.waitForFunction(rightArrow, null, { timeout: 15000 }).then(() => true, () => false);
  const arrows = await page.evaluate(() => window.game.scene.getScene('Hud').arrows.filter((a) => a.visible).map((a) => [Math.round(a.x), +a.rotation.toFixed(2)]));
  check(arrowOk, `off-screen germ gets an edge arrow pointing at it (${JSON.stringify(arrows)})`);
  await page.evaluate(() => window.game.scene.getScene('Game').germs.getChildren().forEach((g) => g.active && g.kill()));

  // Spotless: a round without getting hurt pays $10 x the round
  const spotless = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.hurtThisRound = false;
    const before = scene.copays;
    scene.onRoundCompleted(4);
    return scene.copays - before;
  });
  check(spotless === 40, `a spotless round 4 pays $40 (${spotless})`);

  // SPORE POD: front armor blocks, the back takes extra, UV pierces it, Sinus Purge flips it over
  const pod = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.spawnGerm('sporePod', { hpMult: 1, speedMult: 1 });
    const g = scene.germs.getChildren().find((c) => c.active && c.def.id === 'sporePod');
    g.setPosition(scene.player.x + 120, scene.player.y);
    g.rotation = Math.PI; // facing Eugene (to its left)
    const now = scene.time.now;
    const front = scene.armorMult(g, 0, false, now); // spray travelling right, into its face
    const back = scene.armorMult(g, Math.PI, false, now); // travelling left, into its back
    const uv = scene.armorMult(g, 0, true, now);
    scene.purgeReadyAt = 0;
    scene.sinusPurge(now);
    return { front, back, uv, flipped: g.active && g.isFlipped(scene.time.now + 1), alive: g.active };
  });
  check(pod.front === 0.25 && pod.back === 1.5 && pod.uv === 1, `Spore Pod armor: front ×0.25, back ×1.5, UV ignores it (${JSON.stringify(pod)})`);
  check(pod.flipped, 'Sinus Purge flips a Spore Pod onto its back');

  // SNEEZER: winds up and sneezes a glob that leaves a puddle; puddles slow Eugene
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    const sp = scene.room.playerSpawn;
    scene.player.setPosition(sp.x, sp.y);
    scene.spawnGerm('sneezer', { hpMult: 1, speedMult: 1 });
    const g = scene.germs.getChildren().find((c) => c.active && c.def.id === 'sneezer');
    g.setPosition(sp.x + 280, sp.y);
    g.nextSpitAt = 0;
  });
  const sneezed = await page.waitForFunction(() => window.game.scene.getScene('Game').puddles.count > 0, null, { timeout: 20000 }).then(() => true, () => false);
  check(sneezed, 'a Sneezer winds up, sneezes, and its glob leaves a puddle');
  const slowed = await page.evaluate(async () => {
    const scene = window.game.scene.getScene('Game');
    scene.puddles.add(scene.player.x, scene.player.y, 60, 3000, 0.55, scene.time.now);
    await new Promise((r) => setTimeout(r, 400));
    return scene.player.moveScale;
  });
  check(slowed < 1, `standing in a puddle slows Eugene (speed ×${slowed.toFixed(2)})`);

  // RESISTANT elites: tougher, with a trait; always drop a power-up. Power-ups are picked up by walking over them
  const elite = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 });
    const g = scene.germs.getChildren().find((c) => c.active);
    const hp0 = g.maxHp;
    scene.maybeElite(g, 'shielded');
    const res = { hpx: g.maxHp / hp0, shield: Math.round(g.shield), elite: g.elite };
    g.setPosition(scene.player.x + 150, scene.player.y);
    scene.damageGerm(g, 1e6, 0, 0);
    return { ...res, dead: !g.active, pills: scene.powerups.onFloor };
  });
  check(elite.elite === 'shielded' && elite.hpx === 2.5 && elite.shield > 0 && elite.dead && elite.pills >= 1, `a RESISTANT elite is tougher and drops a power-up (${JSON.stringify(elite)})`);
  const picked = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 });
    const g = scene.germs.getChildren().find((c) => c.active);
    g.setPosition(scene.player.x + 300, scene.player.y);
    scene.powerups.drop(scene.player.x, scene.player.y, scene.time.now, 'priorAuth');
    return true;
  });
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    return scene.powerups.isActive('priorAuth', scene.time.now);
  }, null, { timeout: 15000 }).catch(() => {});
  const frozen = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const g = scene.germs.getChildren().find((c) => c.active);
    return { active: scene.powerups.isActive('priorAuth', scene.time.now), frozen: !!g && g.frozenUntil > scene.time.now, hud: window.game.scene.getScene('Hud').powerRows[0].text.text };
  });
  check(picked && frozen.active && frozen.frozen, `walking over PRIOR AUTHORIZATION freezes the germs (${JSON.stringify(frozen)})`);
  const cleaned = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (let i = 0; i < 3; i++) scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 });
    for (const g of scene.germs.getChildren()) if (g.active) g.setPosition(scene.player.x + 100 + Math.random() * 200, scene.player.y);
    const before = scene.germs.countActive(true);
    scene.onPowerup({ id: 'statClean', name: 'STAT CLEAN', blurb: '', color: 0xffffff, ms: 0 }, scene.time.now);
    return { before, after: scene.germs.countActive(true) };
  });
  check(cleaned.before > 0 && cleaned.after === 0, `STAT CLEAN disinfects everything nearby (${JSON.stringify(cleaned)})`);

  // STAIRS (M8 map): buy Upstairs, walk into the west stairs and come out upstairs; germs follow the same way
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.unlockRoom('upstairs');
    const z = scene.room.stairs[0].a.zone;
    scene.stairsReadyAt = 0;
    scene.player.setPosition(z.x + z.w / 2, z.y + z.h / 2);
  });
  const wentUp = await page.waitForFunction(() => window.game.scene.getScene('Game').player.x >= 3800, null, { timeout: 15000 }).then(() => true, () => false);
  const upState = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const cam = scene.cameras.main;
    return { x: Math.round(scene.player.x), room: window.game.scene.getScene('Hud').roomText.text, camX: Math.round(cam.worldView.x) };
  });
  check(wentUp && upState.camX >= 3800, `the stairs take Eugene upstairs, camera follows (${JSON.stringify(upState)})`);
  const followed = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 });
    const g = scene.germs.getChildren().find((c) => c.active);
    const z = scene.room.stairs[0].a.zone;
    g.setPosition(z.x + z.w / 2, z.y + z.h / 2); // a germ on the ground-floor stairs...
    return true;
  });
  const germUp = await page.waitForFunction(() => window.game.scene.getScene('Game').germs.getChildren().some((g) => g.active && g.x >= 3800), null, { timeout: 15000 }).then(() => true, () => false);
  check(followed && germUp, 'germs follow Eugene up the stairs');
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.stairsReadyAt = 0;
    const z = scene.room.stairs[0].b.zone;
    scene.player.setPosition(z.x + z.w / 2, z.y + z.h / 2);
  });
  const wentDown = await page.waitForFunction(() => window.game.scene.getScene('Game').player.x < 3400, null, { timeout: 15000 }).then(() => true, () => false);
  check(wentDown, 'and back down again');

  // COMPOUNDING STATION (Lab): hold USE to upgrade the tool in hand (the bottle gets a Pressure Nozzle)
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.unlockRoom('halls');
    scene.unlockRoom('lab');
    if (scene.slot !== 0) scene.swapTool(scene.time.now);
    scene.addCopays(1000 - scene.copays);
    const o = scene.room.obstacles.find((ob) => ob.kind === 'compounder');
    scene.player.setPosition(o.x + o.w / 2, o.y + o.h + 40);
  });
  await page.waitForFunction(() => window.game.scene.getScene('Hud').interactButton.label?.text?.startsWith('UPGRADE'), null, { timeout: 15000 }).catch(() => {});
  const upAt = await buttonAt('interactButton');
  await holdAt(upAt, () => window.game.scene.getScene('Game').sprayer.tier === 1);
  const upgraded = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { tier: scene.sprayer.tier, range: scene.sprayer.def.range, copays: scene.copays, note: window.game.scene.getScene('Hud').interactNote.text };
  });
  check(upgraded.tier === 1 && upgraded.range === 280 && upgraded.copays === 700, `Compounding Station upgrades the bottle (${JSON.stringify(upgraded)})`);

  // EXAM TABLE: rest for $40 to heal 50, once per table per round
  const rest = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    // Hold the round still: a new round would (correctly) make the table usable again mid-check
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.waves.queue.length = 0;
    scene.waves.phase = 'intermission';
    scene.waves.nextRoundAt = Number.MAX_SAFE_INTEGER;
    scene.unlockRoom('exam1');
    const room = scene.room.rooms.find((r) => r.id === 'exam1');
    const o = scene.room.obstacles.find((ob) => ob.kind === 'examTable' && ob.x >= room.x && ob.x < room.x + room.w && ob.y >= room.y && ob.y < room.y + room.h);
    scene.player.setPosition(o.x + o.w + 40, o.y + o.h / 2);
    scene.player.hp = 40;
    scene.addCopays(100 - scene.copays);
    return true;
  });
  await page.waitForFunction(() => window.game.scene.getScene('Hud').interactButton.label?.text?.startsWith('REST'), null, { timeout: 15000 }).catch(() => {});
  const restAt = await buttonAt('interactButton');
  await page.touchscreen.tap(restAt.x, restAt.y);
  await page.waitForFunction(() => window.game.scene.getScene('Game').player.hp > 40, null, { timeout: 15000 }).catch(() => {});
  await page.touchscreen.tap(restAt.x, restAt.y); // already used this round
  await page.waitForTimeout(400);
  const rested = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { hp: scene.player.hp, copays: scene.copays, label: window.game.scene.getScene('Hud').interactButton.label.text };
  });
  await page.evaluate(() => { const scene = window.game.scene.getScene('Game'); scene.waves.nextRoundAt = scene.time.now + 2000; });
  check(rest && rested.hp >= 90 && rested.copays === 60 && rested.label === 'RESTED', `an exam table heals 50 for $40, once per round (${JSON.stringify(rested)})`);
  await page.evaluate(() => window.game.scene.getScene('Game').germs.getChildren().forEach((g) => g.active && g.kill()));

  // Patients: one walks in, commits a health code violation, and gets sprayed into compliance
  const violation = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    // Only the test's patient (others may have wandered in during a slow run)
    for (const other of scene.patients.group.getChildren()) if (other.active) other.retire();
    scene.patients.spawn(scene.time.now);
    const p = scene.patients.group.getChildren().find((c) => c.active);
    p.setPosition(scene.player.x + 150, scene.player.y);
    p.nextViolationAt = 0;
    p.leaveAt = Number.MAX_SAFE_INTEGER; // stay put for the test, however slow the frame rate
    // Violations only happen while the round still has germs to send in, and below the on-screen germ cap
    scene.germs.getChildren().filter((g) => g.active).slice(4).forEach((g) => g.kill());
    while (scene.waves.queue.length < 4) scene.waves.queue.push('basic');
    return { germsBefore: scene.germs.countActive(true), id: p.def.id };
  });
  await page.waitForFunction(() => window.game.scene.getScene('Game').patients.eugeneBubble.text.length > 0, null, { timeout: 15000 }).catch(() => {});
  const violated = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const p = scene.patients.group.getChildren().find((c) => c.active);
    return { said: p.bubble.text, eugene: scene.patients.eugeneBubble.text, germs: scene.germs.countActive(true) };
  });
  await page.screenshot({ path: 'smoke-patient.png' });
  check(violated.said.length > 0 && violated.eugene.length > 0, `patient violation (${violation.id}: "${violated.said}") and Eugene grumbles ("${violated.eugene}")`);
  check(violated.germs > violation.germsBefore, `the violation lets germs in (${violation.germsBefore} -> ${violated.germs})`);
  const cleaned = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const p = scene.patients.group.getChildren().find((c) => c.active);
    const before = scene.score;
    for (let i = 0; i < 12; i++) scene.patients.sprayed(p);
    return { state: p.state, gained: scene.score - before };
  });
  check(cleaned.state === 'leaving' && cleaned.gained > 0, `spraying a patient cleans them up and sends them home (${JSON.stringify(cleaned)})`);

  // No Copay farming: once a round has sent in all its germs, patients stop letting more loose and the round can end
  const farm = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.waves.queue.length = 0;
    const alive = scene.germs.getChildren().filter((g) => g.active);
    alive.slice(1).forEach((g) => g.kill());
    if (alive[0]) alive[0].freeze();
    const p = scene.patients.group.getChildren().find((c) => c.active) ?? (scene.patients.spawn(scene.time.now), scene.patients.group.getChildren().find((c) => c.active));
    if (p) { p.state = 'wander'; p.nextViolationAt = 0; p.leaveAt = Number.MAX_SAFE_INTEGER; }
    return { before: scene.germs.countActive(true), round: scene.waves.round };
  });
  await page.waitForTimeout(2500);
  const farmed = await page.evaluate(() => window.game.scene.getScene('Game').germs.countActive(true));
  check(farmed <= farm.before, `no violations once the round's germs are all in (${farm.before} -> ${farmed} germs)`);
  await page.evaluate(() => window.game.scene.getScene('Game').germs.getChildren().forEach((g) => g.active && g.kill()));
  const ended = await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    scene.germs.getChildren().forEach((g) => g.active && g.kill()); // stragglers that slipped in
    return !scene.waves.roundActive;
  }, null, { timeout: 6000 }).then(() => true, () => false);
  check(ended, `the round ends once the last germ is gone (round ${farm.round})`);


  // Diamond the Practice Manager: spawn her near Eugene and walk her through every move
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.player.hp = 100;
    const sp = scene.room.playerSpawn;
    scene.player.setPosition(sp.x, sp.y);
    scene.spawnGerm('diamond', { hpMult: 1, speedMult: 1 });
    scene.boss.germ.setPosition(sp.x + 240, sp.y);
    scene.boss.nextMeetingAt = 0;
  });
  // Game time follows frames, so on a slow (headless) browser wait for her to speak rather than a fixed time
  await page.waitForFunction(() => window.game.scene.getScene('Game').boss.bubble.text.length > 0, null, { timeout: 15000 }).catch(() => {});
  const intro = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { said: scene.boss.bubble.text, bar: window.game.scene.getScene('Hud').bossBar?.visible };
  });
  check(intro.said.length > 0, `Diamond talks ("${intro.said}")`);
  await page.waitForFunction(() => window.game.scene.getScene('Game').boss.mode === 'meeting', null, { timeout: 15000 });
  const meetingStart = await page.evaluate(() => window.game.scene.getScene('Game').player.y);
  // Headless frame rates are low, so wait for progress instead of a fixed time
  await page.waitForFunction((y0) => window.game.scene.getScene('Game').player.y > y0 + 30, meetingStart, { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: 'smoke-boss.png' });
  const meeting = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { y: scene.player.y, pull: scene.player.pull.length(), aim: scene.nearestGerm(2000) === scene.boss.germ };
  });
  check(meeting.pull > 0 && meeting.y > meetingStart + 30, `Mandatory Meeting drags Eugene toward the exit (y ${meetingStart | 0} -> ${meeting.y | 0})`);
  check(meeting.aim, 'auto-aim locks onto Diamond during the meeting');

  // Spray her hard enough to rip the red tape (also costs her enough health to fling write-ups)
  const hitBoss = (amount) => page.evaluate((n) => {
    const scene = window.game.scene.getScene('Game');
    const d = scene.droplets.get();
    d.fire(scene.boss.germ.x, scene.boss.germ.y, 0, 1, 100, { ...scene.loadout[0].def, damage: n, knockback: 0, effectiveness: {} });
    scene.onDropletHit(d, scene.boss.germ);
  }, amount);
  await hitBoss(200);
  const freed = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { mode: scene.boss.mode, pull: scene.player.pull.length(), writeUps: scene.germs.getChildren().filter((g) => g.active && g.def.id === 'writeUp').length };
  });
  check(freed.mode === 'chase' && freed.pull === 0, `spraying her breaks Eugene free (${JSON.stringify(freed)})`);
  check(freed.writeUps >= 1, `Write-Ups fly when she is hurt (${freed.writeUps})`);

  // Policy Tantrum at low health
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active && g.def.id === 'writeUp') g.kill();
    scene.player.hp = 100;
  });
  // Down to 30% health, below the tantrum threshold
  await hitBoss(await page.evaluate(() => { const b = window.game.scene.getScene('Game').boss.germ; return b.hp - b.maxHp * 0.3; }));
  await page.waitForFunction(() => window.game.scene.getScene('Game').boss.mode === 'tantrumWindup', null, { timeout: 15000 });
  await page.waitForFunction(() => window.game.scene.getScene('Game').boss.nextTantrumAt > 0, null, { timeout: 15000 });
  check(true, 'Policy Tantrum winds up and stomps at low health');

  // Finish her off
  await page.evaluate(() => { window.game.scene.getScene('Game').player.hp = 100; });
  await hitBoss(5000);
  const beaten = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { active: scene.boss.active, said: scene.boss.bubble.text };
  });
  check(!beaten.active && beaten.said.length > 0, `Diamond can be defeated ("${beaten.said}")`);

  // SPECIAL ROUNDS: round 7 is a Waiting Room Rush, announced with its own banner
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.boss?.destroy();
    scene.boss = undefined;
    scene.waves.queue.length = 0;
    scene.waves.round = 6;
    scene.waves.phase = 'intermission';
    scene.waves.nextRoundAt = scene.time.now;
  });
  await page.waitForFunction(() => window.game.scene.getScene('Game').waves.round === 7, null, { timeout: 15000 }).catch(() => {});
  const special = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { id: scene.waves.special?.id, banner: window.game.scene.getScene('Hud').banner.text, queued: scene.waves.queue.length };
  });
  check(special.id === 'rush' && special.banner === 'WAITING ROOM RUSH', `round 7 is a special round with its own banner (${JSON.stringify(special)})`);

  // Eugene was untouchable since the station checks (slow CI browsers); make him mortal again for the death test
  await page.evaluate(() => { window.game.scene.getScene('Game').player.invulnerableUntil = 0; });
  // Death: drop Eugene to 1 HP and put a germ on top of him
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.player.hp = 1;
    const g = scene.germs.getChildren().find((c) => c.active) ?? (scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 }), scene.germs.getChildren().find((c) => c.active));
    g.setPosition(scene.player.x + 5, scene.player.y);
  });
  await page.waitForFunction(() => window.game.scene.isActive('GameOver'), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'smoke-gameover.png' });
  const saved2 = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.save.v2') ?? '{}'));
  check(saved2.bestScore > 0, `high score saved (${JSON.stringify(saved2)})`);

  // Restart from the game over screen
  const again = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameOver');
    const label = scene.children.list.find((c) => c.text === 'PLAY AGAIN');
    const canvas = window.game.canvas.getBoundingClientRect();
    const k = canvas.width / window.game.scale.width;
    return { x: canvas.left + label.x * k, y: canvas.top + label.y * k };
  });
  await page.touchscreen.tap(again.x, again.y);
  await page.waitForFunction(() => window.game.scene.isActive('Hud') && !window.game.scene.isActive('GameOver'), null, { timeout: 15000 });
  const fresh = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { hp: scene.player.hp, score: scene.score, round: scene.waves.round };
  });
  check(fresh.hp === 100 && fresh.score === 0 && fresh.round === 0, `restart gives a fresh run (${JSON.stringify(fresh)})`);

  // Leaving the app (page hidden) pauses by itself, and stays paused when you come back
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  const autoPaused = await page.evaluate(() => window.game.scene.isPaused('Game') && window.game.scene.getScene('Hud').pauseMenu.visible);
  check(autoPaused, 'switching away from the app auto-pauses');
  await page.evaluate(() => window.game.scene.getScene('Hud').resume());
  await page.waitForTimeout(300);
  // Paused time doesn't count: cooldowns, refills and rounds don't tick over while the menu is up
  const t0 = await page.evaluate(() => { const hud = window.game.scene.getScene('Hud'); hud.pause(); return window.game.scene.getScene('Game').time.now; });
  await page.waitForTimeout(2000);
  const t1 = await page.evaluate(async () => {
    window.game.scene.getScene('Hud').resume();
    await new Promise((r) => setTimeout(r, 150));
    return window.game.scene.getScene('Game').time.now;
  });
  check(t1 - t0 < 1000, `game time stands still while paused (${Math.round(t1 - t0)} ms passed over a 2 s pause)`);

  check(end.x > start.x + 20 && end.y < start.y - 20, `Eugene moved up-right (${start.x | 0},${start.y | 0}) -> (${end.x | 0},${end.y | 0})`);
  check(Math.abs(end.rotation - -Math.PI / 4) < 0.3, `Eugene faces where he walks (up-right), rotation ${end.rotation.toFixed(2)}`);
  check(firstHint.includes('MOVE'), `a new player is shown how to move ("${firstHint}")`);
  const learned = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}').learned ?? {});
  check(learned.move && learned.spray, `moving and spraying are learned, so those hints are gone (${JSON.stringify(learned)})`);
  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

  // Debug/stress switches: ?round=6&copays=999&god&fps=30
  const dbg = await context.newPage();
  const dbgErrors = [];
  dbg.on('pageerror', (e) => dbgErrors.push(e.message));
  await dbg.goto(url + '?round=6&copays=999&god&fps=30');
  await dbg.waitForFunction(() => window.game?.scene.isActive('Title'));
  await dbg.touchscreen.tap(426, 200);
  await dbg.waitForFunction(() => window.game.scene.getScene('Game')?.waves?.round === 6, null, { timeout: 90000 });
  await dbg.waitForTimeout(6000); // germs reach Eugene and bump him
  const dbgState = await dbg.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return {
      round: scene.waves.round, copays: scene.copays, hp: scene.player.hp,
      fps: Math.round(window.game.loop.actualFps), overlay: window.game.scene.getScene('Hud').fpsText.text,
    };
  });
  check(dbgState.round === 6 && dbgState.copays === 999, `?round=6&copays=999 starts at round 6 with $999 (${dbgState.round}, $${dbgState.copays})`);
  check(dbgState.hp === 100, `?god keeps Eugene at full health (${dbgState.hp})`);
  check(dbgState.fps <= 34, `?fps=30 caps the frame rate (${dbgState.fps} FPS)`);
  check(/p95/.test(dbgState.overlay) && /germs \d+/.test(dbgState.overlay), `debug overlay shows frame times and counts (${dbgState.overlay.split('\n')[0]})`);
  check(dbgErrors.length === 0, `no errors in debug mode${dbgErrors.length ? ': ' + dbgErrors.join(' | ') : ''}`);
  await dbg.close();

  // Phone held upright: the game still plays in landscape, turned sideways, and touches land where they look
  const tall = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const pp = await tall.newPage();
  const tallErrors = [];
  pp.on('pageerror', (e) => tallErrors.push(e.message));
  await pp.goto(url);
  await pp.waitForFunction(() => window.game?.scene.isActive('Title'));
  await pp.touchscreen.tap(196, 426);
  await pp.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 15000 });
  await pp.waitForTimeout(400);
  const shape = await pp.evaluate(() => {
    const r = window.game.canvas.getBoundingClientRect();
    return { w: window.game.scale.width, h: window.game.scale.height, rw: Math.round(r.width), rh: Math.round(r.height) };
  });
  check(shape.w > shape.h && shape.rw >= 380 && shape.rh >= 800, `portrait phone gets a sideways landscape game filling the screen (${JSON.stringify(shape)})`);
  // Turned 90° clockwise: game (x, y) sits at screen (right - y, top + x)
  const tallPurgeAt = await pp.evaluate(() => {
    const b = window.game.scene.getScene('Hud').purgeButton;
    const r = window.game.canvas.getBoundingClientRect();
    const k = r.height / window.game.scale.width;
    return { x: r.right - b.y * k, y: r.top + b.x * k };
  });
  await pp.touchscreen.tap(tallPurgeAt.x, tallPurgeAt.y);
  await pp.waitForTimeout(300);
  const purgedTall = await pp.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return scene.purgeReadyAt > scene.time.now;
  });
  await pp.screenshot({ path: 'smoke-portrait.png' });
  check(purgedTall, 'tapping SINUS PURGE works while the phone is upright');
  check(tallErrors.length === 0, `no errors in portrait${tallErrors.length ? ': ' + tallErrors.join(' | ') : ''}`);
} catch (e) {
  check(false, String(e) + (errors.length ? " | errors: " + errors.join(" | ") : ""));
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
