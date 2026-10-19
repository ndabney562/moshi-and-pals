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

// SMOKE_PORT lets two checkouts run the smoke test at once
const port = Number(process.env.SMOKE_PORT ?? 4173);
const server = await preview({ preview: { port, strictPort: true } });
const url = `http://localhost:${port}/moshi-and-pals/`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
// iPhone 15-ish, landscape
const context = await browser.newContext({
  viewport: { width: 852, height: 393 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
});
const page = await context.newPage();
page.setDefaultNavigationTimeout(120000); // slow machines take a while to load the bundle
/**
 * GitHub's runners draw the game in software at ~5 fps, so game time crawls and every wait there takes a few
 * times longer than on a laptop. On CI, timeouts and fixed pauses stretch by this factor (locally they're as written).
 */
const SLOW = process.env.CI ? 3 : 1;
/** Timeouts say what they were waiting for (CI logs aren't readable, only the failure message). */
const labelWaits = (p) => {
  const wait = p.waitForFunction.bind(p);
  const pause = p.waitForTimeout.bind(p);
  p.waitForTimeout = (ms) => pause(ms * SLOW);
  p.waitForFunction = (fn, arg, opts) => wait(fn, arg, { ...opts, timeout: (opts?.timeout ?? 30000) * SLOW }).catch((e) => {
    throw new Error(`${e.message.split('\n')[0]} waiting for: ${String(fn).replace(/\s+/g, ' ').slice(0, 160)}`);
  });
};
labelWaits(page);
const errors = [];
// Page errors say where they came from (the top stack frame), so a CI annotation is enough to find them
const where = (e) => `${e.message} @ ${(e.stack ?? '').split('\n')[1]?.trim() ?? '?'}`;
page.on('pageerror', (e) => errors.push(where(e)));
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
  // The MOVE hint counts game time, which crawls below 5 fps; keep walking until it's learned so SPRAY comes up next
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}').learned?.move, null, { timeout: 15000 }).catch(() => {});
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
  // Round 1's germs spawn ~1,100 px away; on a slow test machine the walk alone can outlast the timeout.
  // Once they've spawned, bring them to the near side of the waiting room, then they still have to walk up.
  await page.waitForFunction(() => window.game.scene.getScene('Game').germs.countActive(true) > 0, null, { timeout: 90000 });
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.setPosition(scene.player.x + 300 + Math.random() * 40, scene.player.y - 20 + Math.random() * 40);
  });
  // Let the germs come to Eugene (within spray range) before spraying
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    const e = scene.children.list.find((c) => c.texture?.key === 'eugene');
    return scene.children.list.some((c) => c.texture?.key?.startsWith('germ-') && c.active && Math.hypot(c.x - e.x, c.y - e.y) < 180);
  }, null, { timeout: 90000 });
  const before = await game();
  check(before.germs > 0, `germs spawned and approached (${before.germs} alive)`);
  // The SPRAY hint is learned by spraying while it's on screen; it appears at the HUD's next 200 ms check, which
  // on a slow runner can come after a quick spray is over, so spray once it's up
  await page.waitForFunction(() => window.game.scene.getScene('Hud').hint?.id === 'spray', null, { timeout: 20000 }).catch(() => {});
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
  // On a slow runner the SPRAY hint can come up late (germs die and respawn); keep holding until it's learned
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}').learned?.spray, null, { timeout: 20000 }).catch(() => {});
  await touch('touchEnd', []);
  const after = await game();
  check(after.ammo < before.ammo, `spraying used alcohol (${before.ammo} -> ${after.ammo} mL)`);
  check(after.kills > 0, `germs disinfected (${after.kills})`);
  const firstAch = await page.evaluate(() => ({
    saved: JSON.parse(localStorage.getItem('moshi.achievements.v1') ?? '[]'),
    toast: window.game.scene.getScene('Hud').toastName.text,
  }));
  check(firstAch.saved.includes('firstKill') && firstAch.toast.startsWith('🏆'), `the first kill unlocks an achievement, saved, with a toast (${JSON.stringify(firstAch)})`);

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
  // Music: the sequencer runs during the shift and (when the browser lets audio run) steps through the song.
  // Test browsers make no sound (core/music SILENT), so this checks the sequencer, not the synthesis.
  const music = await page.evaluate(() => window.game.scene.getScene('Game').musicState());
  check(music.playing && music.song === 'clinic' && (music.context !== 'running' || music.steps > 0), `the clinic theme plays during the shift (${JSON.stringify(music)})`);
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
  const achAt = await buttonAt('achievementsItem');
  await page.touchscreen.tap(achAt.x, achAt.y);
  await page.waitForTimeout(200);
  const achList = await page.evaluate(() => {
    const l = window.game.scene.getScene('Hud').achievementList;
    const out = { open: l.visible, title: l.title.text, first: l.rows[0].name.text };
    l.back.emit('pointerup');
    return { ...out, closed: !l.visible };
  });
  check(achList.open && /ACHIEVEMENTS +\d+ \/ \d+/.test(achList.title) && achList.first.includes('🏆') && achList.closed,
    `the pause menu lists achievements, unlocked ones lit (${JSON.stringify(achList)})`);
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
  // MUSIC toggles and saves separately from SOUND (turn it back on afterwards)
  const musicAt = await buttonAt('musicToggle');
  await page.touchscreen.tap(musicAt.x, musicAt.y);
  await page.waitForTimeout(200);
  const musicOff = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}'));
  await page.touchscreen.tap(musicAt.x, musicAt.y);
  await page.waitForTimeout(200);
  check(musicOff.music === false && musicOff.sound === true, `MUSIC toggle turns the music off and saves, leaving SOUND alone (${JSON.stringify({ music: musicOff.music, sound: musicOff.sound })})`);
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
    // Past the round's on-screen cap (a fast runner can be there by now) so the nearest germ is this one, in reach
    scene.spawnGermAt('basic', scene.player.x + 80, scene.player.y, true);
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
  await page.evaluate(() => { const sc = window.game.scene.getScene('Game'); const p = sc.room.fromPlan('ground', 460, 900); sc.player.setPosition(p.x, p.y); });
  await page.waitForFunction(() => window.game.scene.getScene('Hud').roomText.text.includes('HALLWAYS'), null, { timeout: 15000 }).catch(() => {});
  check((await page.evaluate(() => window.game.scene.getScene('Hud').roomText.text)).includes('HALLWAYS'), 'walking into the hallways updates the room label');
  await page.screenshot({ path: 'smoke-rooms.png' });

  // Supply Requisition: pay at a crate, pick 1 of 2 tools (the game waits), appeal for a new pair, then SWAP back
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.addCopays(300 - scene.copays);
    scene.claimDeniedChance = 0;
    const crate = scene.crates[0];
    scene.player.setPosition(crate.x + crate.w / 2, crate.y - 45);
  });
  await page.waitForFunction(() => window.game.scene.getScene('Hud').interactButton.label?.text?.startsWith('TOOLS'), null, { timeout: 15000 }).catch(() => {});
  const crateAt = await buttonAt('interactButton');
  await holdAt(crateAt, () => window.game.scene.getScene('Hud').requisitioning);
  const form = await page.evaluate(() => {
    const hud = window.game.scene.getScene('Hud');
    return { open: hud.requisitioning, offered: hud.choicePanel.offered, paused: window.game.scene.isPaused('Game'), copays: window.game.scene.getScene('Game').copays };
  });
  check(form.open && form.offered.length === 2 && form.offered[0] !== form.offered[1] && form.paused && form.copays === 50,
    `a supply crate opens a Supply Requisition: 2 tools to pick from, game waiting (${JSON.stringify(form)})`);
  const panelAt = (what) => page.evaluate((w) => {
    const p = window.game.scene.getScene('Hud').choicePanel;
    const o = w === 'appeal' ? p.extra : w === 'cancel' ? p.cancel : p.cards[w].bg;
    const canvas = window.game.canvas.getBoundingClientRect();
    const k = canvas.width / window.game.scale.width;
    return { x: canvas.left + o.x * k, y: canvas.top + o.y * k };
  }, what);
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.addCopays(150);
    scene.showRequisition('');
  });
  const appealAt = await panelAt('appeal');
  await page.touchscreen.tap(appealAt.x, appealAt.y);
  await page.waitForFunction((first) => !window.game.scene.getScene('Hud').choicePanel.offered.includes(first[0]), form.offered, { timeout: 10000 }).catch(() => {});
  const appealed = await page.evaluate(() => ({ offered: window.game.scene.getScene('Hud').choicePanel.offered, copays: window.game.scene.getScene('Game').copays }));
  check(appealed.copays === 100 && appealed.offered.length === 2 && !appealed.offered.some((id) => form.offered.includes(id)),
    `APPEAL THE DECISION ($100) swaps in two different tools (${JSON.stringify(appealed)})`);
  const pickAt = await panelAt(0);
  await page.touchscreen.tap(pickAt.x, pickAt.y);
  await page.waitForFunction(() => window.game.scene.getScene('Game').loadout.length === 2, null, { timeout: 10000 }).catch(() => {});
  const crated = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { tools: scene.loadout.map((t) => t.def.id), slot: scene.slot, running: !window.game.scene.isPaused('Game'), swap: window.game.scene.getScene('Hud').swapButton.visible };
  });
  check(crated.tools[1] === appealed.offered[0] && crated.slot === 1 && crated.running && crated.swap, `picking a tool hands it over and play resumes (${JSON.stringify(crated)})`);
  await page.screenshot({ path: 'smoke-crate.png' });
  const toolFired = await page.evaluate(async () => {
    const scene = window.game.scene.getScene('Game');
    const before = scene.sprayer.ammo;
    scene.sprayer.tryFire(scene.player.x, scene.player.y, 0, scene.time.now + 10000);
    return { before, after: scene.sprayer.ammo, name: scene.sprayer.def.name };
  });
  check(toolFired.after < toolFired.before, `the crate tool works (${toolFired.name}: ${toolFired.before} -> ${toolFired.after})`);
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
    const front = scene.room.fromPlan('ground', 600, 1480); // in front of reception, so the camera isn't against a wall
    scene.player.setPosition(front.x, front.y);
    scene.cameras.main.centerOn(front.x, front.y);
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
  const sneezed = await page.waitForFunction(() => window.game.scene.getScene('Game').puddles.count > 0, null, { timeout: 60000 }).then(() => true, () => false);
  check(sneezed, 'a Sneezer winds up, sneezes, and its glob leaves a puddle');
  const slowed = await page.evaluate(async () => {
    const scene = window.game.scene.getScene('Game');
    scene.puddles.add(scene.player.x, scene.player.y, 60, 3000, 0.55, scene.time.now);
    await new Promise((r) => setTimeout(r, 400));
    return scene.player.moveScale;
  });
  check(slowed < 1, `standing in a puddle slows Eugene (speed ×${slowed.toFixed(2)})`);

  // ECOLOGY (M11): splitters, Chonk, Colony, Mother Culture, Bulldozer, Mold Spot
  const eco = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const clear = () => {
      for (const g of scene.germs.getChildren()) if (g.active) g.kill();
      for (const p of scene.powerups.pills) p.img.setVisible(false);
      scene.powerups.active.clear();
    };
    const count = (id) => scene.germs.getChildren().filter((c) => c.active && c.def.id === id).length;
    const make = (id, dx, dy) => {
      scene.spawnGermAt(id, scene.player.x + dx, scene.player.y + dy, true);
      return scene.germs.getChildren().find((c) => c.active && c.def.id === id);
    };
    clear();
    scene.damageGerm(make('duo', 220, 0), 1e6, 0, 0);
    const split = count('monococcus');
    clear();
    scene.damageGerm(make('chonk', 220, 0), 1e6, 0, 0);
    const burst = count('basic');
    clear();
    scene.spawnGerm('colony', { hpMult: 1, speedMult: 1 });
    const specks = count('speck');
    clear();
    const hurt = make('basic', 260, 60);
    const healer = make('healer', 260, 0);
    hurt.hp = hurt.maxHp / 2;
    hurt.freezeFor(scene.time.now, 60000); // hold it still inside the aura
    return { split, burst, specks, hurtHp: hurt.hp, healerX: healer.x };
  });
  check(eco.split === 2, `a Diplococcus Duo splits in two when disinfected (${eco.split} halves)`);
  check(eco.burst === 6, `a Chonk bursts into 6 germs (${eco.burst})`);
  check(eco.specks === 8, `a Colony arrives as a flock of 8 Specks (${eco.specks})`);
  const healed = await page.waitForFunction((hp0) => {
    const scene = window.game.scene.getScene('Game');
    const g = scene.germs.getChildren().find((c) => c.active && c.def.id === 'basic');
    return g && g.hp > hp0 + 3 ? g.hp : null;
  }, eco.hurtHp, { timeout: 20000 }).then((h) => h.jsonValue(), () => null);
  check(healed !== null, `a Mother Culture heals germs inside its aura (${Math.round(eco.hurtHp)} -> ${healed && Math.round(healed)} HP)`);

  // Bulldozer: aims (red lane), charges straight, and a wall leaves it dazed and taking double damage
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    const sp = scene.room.playerSpawn;
    scene.player.setPosition(sp.x, sp.y);
    scene.spawnGermAt('charger', sp.x + 300, sp.y, true);
    const g = scene.germs.getChildren().find((c) => c.active && c.def.id === 'charger');
    g.nextChargeAt = 0;
    window.__chargeSeen = new Set();
    scene.events.on('postupdate', () => window.__chargeSeen.add(g.chargeState));
  });
  const charged = await page.waitForFunction(() => window.__chargeSeen.has('windup') && window.__chargeSeen.has('charging'), null, { timeout: 20000 }).then(() => true, () => false);
  check(charged, `a Bacillus Bulldozer winds up, then charges (${[...(await page.evaluate(() => [...window.__chargeSeen]))].join(' -> ')})`);
  // Aim it at the nearest wall and let it go (again, if a slow runner's charge runs out short of the wall)
  const dazed = await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    const g = scene.germs.getChildren().find((c) => c.active && c.def.id === 'charger');
    if (!g) return false;
    if (g.chargeState === 'dazed') return true;
    if (g.chargeState === 'charging' && scene.time.now < g.chargeUntil) return false;
    let best = null;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      for (let d = 60; d <= 420; d += 20) {
        if (!scene.flow.lineClear(g.x, g.y, g.x + Math.cos(a) * d, g.y + Math.sin(a) * d)) {
          if (!best || d < best.d) best = { a, d };
          break;
        }
      }
    }
    g.chargeState = 'charging';
    g.chargeAngle = best ? best.a : 0;
    g.chargeUntil = scene.time.now + g.def.charge.ms * 1.5;
    return false;
  }, null, { timeout: 30000, polling: 200 }).then(() => true, () => false);
  const dazedHit = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const g = scene.germs.getChildren().find((c) => c.active && c.def.id === 'charger');
    const hp0 = g.hp;
    scene.damageGerm(g, 5, 0, 0);
    return hp0 - g.hp;
  });
  check(dazed && dazedHit === 10, `a charge into a wall leaves it dazed, taking double damage (${dazed}, 5 -> ${dazedHit})`);

  // Mold Spot: rooted in place, it lets out spores
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.spawnGermAt('moldSpot', scene.player.x + 260, scene.player.y, true);
    const g = scene.germs.getChildren().find((c) => c.active && c.def.id === 'moldSpot');
    g.nextSpawnAt = 0;
  });
  const spored = await page.waitForFunction(() => window.game.scene.getScene('Game').germs.getChildren().some((c) => c.active && c.def.id === 'spore'), null, { timeout: 20000 }).then(() => true, () => false);
  check(spored, 'a Mold Spot lets out spores');

  // ARSENAL (M12): Wipes sweep what's in front, Defib Paddles chain, the Gel Launcher bursts and leaves slowing gel
  const arsenal = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const clear = () => { for (const g of scene.germs.getChildren()) if (g.active) g.kill(); };
    const at = (id, dx, dy) => {
      const before = new Set(scene.germs.getChildren().filter((c) => c.active));
      scene.spawnGermAt(id, scene.player.x + dx, scene.player.y + dy, true);
      const g = scene.germs.getChildren().find((c) => c.active && !before.has(c));
      g.freezeFor(scene.time.now, 8000); // hold still for the test
      return g;
    };
    const hurt = (g) => !g.active || g.hp < g.maxHp;
    const use = (id) => {
      scene.giveTool(id, scene.crates[0], scene.time.now);
      return scene.sprayer.tryFire(scene.player.x, scene.player.y, 0, scene.time.now);
    };
    clear();
    const front = at('basic', 60, 0);
    const behind = at('basic', -90, 0);
    const wiped = use('wipes');
    const wipes = { fired: wiped, front: hurt(front), behind: hurt(behind), unit: window.game.scene.getScene('Hud').bottle.text.text };
    clear();
    const line = [at('basic', 80, 0), at('basic', 170, 40), at('basic', 260, 0)];
    use('defib');
    const zapped = line.filter(hurt).length;
    clear();
    const target = at('basic', 220, 0);
    window.__gelTarget = target;
    scene.aimLock = target;
    use('gelLauncher');
    return { wipes, zapped };
  });
  check(arsenal.wipes.fired === 'fired' && arsenal.wipes.front && !arsenal.wipes.behind && /wipes/.test(arsenal.wipes.unit),
    `Disinfectant Wipes sweep the germ in front, not the one behind (${JSON.stringify(arsenal.wipes)})`);
  check(arsenal.zapped === 3, `Defib Paddles zap a chain of germs (${arsenal.zapped} of 3)`);
  const gelled = await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    const g = window.__gelTarget; // the germ the glob was aimed at (others may be about)
    return scene.gel.count > 0 && (!g.active || g.hp < g.maxHp) ? { gel: scene.gel.count, slowed: g.active && g.slowUntil > scene.time.now } : null;
  }, null, { timeout: 15000 }).then((h) => h.jsonValue(), () => null);
  check(gelled && gelled.gel > 0, `the Gel Launcher's glob bursts on its target and leaves sticky gel (${JSON.stringify(gelled)})`);

  // CLAIM DENIED: no form, a joke item, half the money back
  const denied = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.addCopays(300 - scene.copays);
    scene.claimDeniedChance = 1;
    const tools = scene.loadout.map((t) => t.def.id).join();
    scene.openCrate(scene.crates[0], scene.time.now);
    scene.claimDeniedChance = 0;
    const hud = window.game.scene.getScene('Hud');
    return { copays: scene.copays, form: hud.requisitioning, same: scene.loadout.map((t) => t.def.id).join() === tools, banner: hud.banner.text, line: hud.bannerSub.text };
  });
  check(denied.copays === 175 && !denied.form && denied.same && denied.banner === 'CLAIM DENIED', `a denied claim refunds half and sends a joke item (${JSON.stringify(denied)})`);

  // ROOM TRAPS (M14): the bathroom dryer blasts germs back, the X-ray pulses through walls, the autoclave cooks
  const traps = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    for (const id of ['bath2', 'lab', 'xray']) scene.unlockRoom(id);
    scene.addCopays(500 - scene.copays);
    const st = (kind) => scene.stations.find((s) => s.o.kind === kind);
    const at = (x, y) => {
      const before = new Set(scene.germs.getChildren().filter((c) => c.active));
      scene.spawnGermAt('basic', x, y, true);
      const g = scene.germs.getChildren().find((c) => c.active && !before.has(c));
      g.freezeFor(scene.time.now, 8000);
      g.maxHp = g.hp = 1000; // tough enough to survive, so no kill Copays muddy the prices
      return g;
    };
    const hurt = (g, hp) => !g.active || g.hp < hp;
    const dryer = st('handDryer');
    const p = scene.trapOrigin(dryer.o);
    const dg = at(p.x, p.y + 10);
    const dhp = dg.hp;
    dryer.use(scene.time.now);
    const dry = { hurt: hurt(dg, dhp), after: dryer.info().verb };
    const m = scene.room.obstacles.find((o) => o.kind === 'xray');
    const xg = at(m.x + m.w / 2, m.y - 260); // the other side of the X-ray room's wall
    const xhp = xg.hp;
    st('xrayControls').use(scene.time.now);
    const xray = hurt(xg, xhp);
    const ac = st('autoclave');
    const q = scene.trapOrigin(ac.o, 70);
    window.__steamed = at(q.x, q.y);
    window.__steamedHp = window.__steamed.hp;
    ac.use(scene.time.now);
    return { dry, xray, copays: scene.copays };
  });
  check(traps.dry.hurt && traps.dry.after === 'RECHARGING', `the bathroom hand dryer blasts a germ, then recharges (${JSON.stringify(traps.dry)})`);
  check(traps.xray && traps.copays === 435, `the X-ray pulse goes through walls ($40; the autoclave $25) (${JSON.stringify(traps)})`);
  const steamed = await page.waitForFunction(() => !window.__steamed.active || window.__steamed.hp < window.__steamedHp, null, { timeout: 45000 }).then(() => true, () => false);
  check(steamed, 'the autoclave hisses, then its steam cycle cooks the germ in front of it');

  // VENDING MACHINE (M14): three snacks, buy one (a run-long perk), too poor for another, walk away
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.addCopays(1000 - scene.copays);
    scene.stations.find((s) => s.o.kind === 'vending').use(scene.time.now);
  });
  await page.waitForFunction(() => window.game.scene.isPaused('Game'), null, { timeout: 5000 }).catch(() => {});
  const vend = await page.evaluate(() => {
    const hud = window.game.scene.getScene('Hud');
    return { open: hud.choosing === 'vending', offered: hud.choicePanel.offered, paused: window.game.scene.isPaused('Game') };
  });
  check(vend.open && vend.offered.length === 3 && vend.paused, `the vending machine offers three snacks while the game waits (${JSON.stringify(vend)})`);
  const snackAt = await panelAt(0);
  await page.touchscreen.tap(snackAt.x, snackAt.y);
  await page.waitForFunction(() => !window.game.scene.getScene('Hud').choosing, null, { timeout: 10000 }).catch(() => {});
  const bought = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { snacks: scene.snacks, copays: scene.copays, running: !window.game.scene.isPaused('Game') };
  });
  check(bought.snacks.length === 1 && bought.snacks[0] === vend.offered[0] && bought.copays < 1000 && bought.running, `buying a snack takes the Copays and closes the machine (${JSON.stringify(bought)})`);
  const broke = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.addCopays(-scene.copays);
    scene.stations.find((s) => s.o.kind === 'vending').use(scene.time.now);
    const hud = window.game.scene.getScene('Hud');
    return { offered: hud.choicePanel.offered };
  });
  const brokeAt = await panelAt(0);
  await page.touchscreen.tap(brokeAt.x, brokeAt.y);
  await page.waitForTimeout(200);
  const poor = await page.evaluate(() => {
    const hud = window.game.scene.getScene('Hud');
    return { open: hud.choosing === 'vending', note: hud.choicePanel.note.text };
  });
  check(poor.open && poor.note.startsWith('INSUFFICIENT FUNDS') && !broke.offered.includes(bought.snacks[0]), `with no Copays the machine says so and stays open (${JSON.stringify(poor)})`);
  const awayAt = await panelAt('cancel');
  await page.touchscreen.tap(awayAt.x, awayAt.y);
  await page.waitForFunction(() => !window.game.scene.getScene('Hud').choosing && !window.game.scene.isPaused('Game'), null, { timeout: 10000 }).catch(() => {});
  const away = await page.evaluate(() => !window.game.scene.getScene('Hud').choosing && !window.game.scene.isPaused('Game'));
  check(away, 'WALK AWAY closes the machine and play resumes');
  await page.evaluate(() => {
    // Back to a plain Eugene for the rest of the test
    const scene = window.game.scene.getScene('Game');
    scene.snacks = [];
    scene.perks = { refill: 1, purge: 1, crit: 1 };
    for (const t of scene.loadout) t.refillScale = 1;
    scene.player.maxHp = 100;
    scene.player.hp = Math.min(scene.player.hp, 100);
    scene.player.setSpeedMod('snack', null);
  });
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.slot = 0;
    scene.sprayer.emitChanged(scene.time.now);
  });
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
  });

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
  const statCleaned = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (let i = 0; i < 3; i++) scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 });
    for (const g of scene.germs.getChildren()) if (g.active) g.setPosition(scene.player.x + 100 + Math.random() * 200, scene.player.y);
    const before = scene.germs.countActive(true);
    scene.onPowerup({ id: 'statClean', name: 'STAT CLEAN', blurb: '', color: 0xffffff, ms: 0 }, scene.time.now);
    return { before, after: scene.germs.countActive(true) };
  });
  check(statCleaned.before > 0 && statCleaned.after === 0, `STAT CLEAN disinfects everything nearby (${JSON.stringify(statCleaned)})`);

  // STAIRS (M8 map): buy Upstairs, walk into the west stairs and come out upstairs; germs follow the same way
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.unlockRoom('upstairs');
    const z = scene.room.stairs[0].a.zone;
    scene.stairsReadyAt = 0;
    scene.player.setPosition(z.x + z.w / 2, z.y + z.h / 2);
  });
  const wentUp = await page.waitForFunction(() => { const sc = window.game.scene.getScene('Game'); return sc.player.x >= sc.room.floors[1].x; }, null, { timeout: 15000 }).then(() => true, () => false);
  const upState = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const cam = scene.cameras.main;
    return { x: Math.round(scene.player.x), room: window.game.scene.getScene('Hud').roomText.text, camX: Math.round(cam.worldView.x), upX: scene.room.floors[1].x };
  });
  check(wentUp && upState.camX >= upState.upX, `the stairs take Eugene upstairs, camera follows (${JSON.stringify(upState)})`);
  const followed = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 });
    const g = scene.germs.getChildren().find((c) => c.active);
    const z = scene.room.stairs[0].a.zone;
    g.setPosition(z.x + z.w / 2, z.y + z.h / 2); // a germ on the ground-floor stairs...
    return true;
  });
  const germUp = await page.waitForFunction(() => { const sc = window.game.scene.getScene('Game'); return sc.germs.getChildren().some((g) => g.active && g.x >= sc.room.floors[1].x); }, null, { timeout: 15000 }).then(() => true, () => false);
  check(followed && germUp, 'germs follow Eugene up the stairs');
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.stairsReadyAt = 0;
    const z = scene.room.stairs[0].b.zone;
    scene.player.setPosition(z.x + z.w / 2, z.y + z.h / 2);
  });
  const wentDown = await page.waitForFunction(() => { const sc = window.game.scene.getScene('Game'); return sc.player.x < sc.room.floors[0].w; }, null, { timeout: 15000 }).then(() => true, () => false);
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
  await page.waitForFunction(() => window.game.scene.getScene('Game').patients.eugeneBubble.text.length > 0, null, { timeout: 45000 }).catch(() => {});
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
    // Hold the wave director between rounds, so a real boss round can't replace the bosses under test
    scene.waves.queue.length = 0;
    scene.waves.phase = 'intermission';
    scene.waves.nextRoundAt = Number.MAX_SAFE_INTEGER;
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
  // The music switches to the boss theme on the next bar (only when the browser lets audio run)
  const bossMusic = await page.waitForFunction(() => {
    const m = window.game.scene.getScene('Game').musicState();
    return m.context !== 'running' || m.song === 'boss';
  }, null, { timeout: 20000 }).then(() => page.evaluate(() => window.game.scene.getScene('Game').musicState()), () => null);
  check(!!bossMusic, `the boss theme plays while Diamond is about (${JSON.stringify(bossMusic)})`);
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
  // Down to 30% health, below the tantrum threshold. Set directly: a hit can crit (random) and finish her off.
  await page.evaluate(() => { const b = window.game.scene.getScene('Game').boss.germ; b.hp = b.maxHp * 0.3; });
  // (slow test browsers: allow plenty of game time for the wind-up and the stomp)
  const tantrum = await page.waitForFunction(() => window.game.scene.getScene('Game').boss.mode === 'tantrumWindup', null, { timeout: 30000 })
    .then(() => page.waitForFunction(() => window.game.scene.getScene('Game').boss.nextTantrumAt > 0, null, { timeout: 30000 }))
    .then(() => 'stomped', () => page.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      const b = sc.boss;
      return JSON.stringify({ active: b.active, mode: b.mode, hp: Math.round(b.germ.hp), maxHp: b.germ.maxHp, nextTantrumAt: b.nextTantrumAt, now: Math.round(sc.time.now), dead: sc.player.dead });
    }));
  check(tantrum === 'stomped', `Policy Tantrum winds up and stomps at low health (${tantrum})`);

  // Finish her off
  await page.evaluate(() => { window.game.scene.getScene('Game').player.hp = 100; });
  await hitBoss(5000);
  const beaten = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { active: scene.boss.active, said: scene.boss.bubble.text };
  });
  check(!beaten.active && beaten.said.length > 0, `Diamond can be defeated ("${beaten.said}")`);

  // PATIENT ZERO (boss #2): coughs Sprinters, masks up when sprayed enough (takes double), runs for the exit at low health
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.boss?.destroy();
    scene.boss = undefined;
    const sp = scene.room.playerSpawn;
    scene.player.setPosition(sp.x, sp.y);
    scene.spawnGerm('patientZero', { hpMult: 1, speedMult: 1 });
    scene.boss.germ.setPosition(sp.x + 250, sp.y);
    scene.boss.nextCoughAt = 0;
  });
  const coughed = await page.waitForFunction(() => window.game.scene.getScene('Game').germs.getChildren().some((g) => g.active && g.def.id === 'sprinter'), null, { timeout: 20000 }).then(() => true, () => false);
  check(coughed, 'Patient Zero coughs out Viral Sprinters');
  const masked = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    for (let i = 0; i < 80; i++) b.onHurt(1, scene.time.now);
    return { masked: b.masked, taken: b.damageTaken };
  });
  check(masked.masked && masked.taken === 2, `spraying Patient Zero enough makes him mask up and take double damage (${JSON.stringify(masked)})`);
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.boss.germ.hp = scene.boss.germ.maxHp * 0.2;
  });
  const leaving = await page.waitForFunction(() => window.game.scene.getScene('Game').boss?.currentMode === 'leaving', null, { timeout: 15000 }).then(() => true, () => false);
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.boss.germ.setPosition(scene.room.exit.x, scene.room.exit.y - 60);
  });
  const escaped = await page.waitForFunction(() => !window.game.scene.getScene('Game').boss.germ.active, null, { timeout: 15000 }).then(() => true, () => false);
  const escBanner = await page.evaluate(() => window.game.scene.getScene('Hud').banner.text);
  check(leaving && escaped && escBanner.includes('AGAINST MEDICAL ADVICE'), `at low health he leaves against medical advice and can escape ("${escBanner}")`);

  // METHICILLIN THE UNKILLABLE (boss #3): adapts to the tool that hurts him most, the autoclave cooks him, layers peel, Cluster Shot, Roll
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.boss?.destroy();
    scene.boss = undefined;
    scene.player.hp = 100;
    const sp = scene.room.playerSpawn;
    scene.player.setPosition(sp.x, sp.y);
    scene.spawnGerm('methicillin', { hpMult: 1, speedMult: 1 });
    scene.boss.germ.setPosition(sp.x + 260, sp.y);
    scene.boss.nextShotAt = 0;
    scene.boss.nextRollAt = Number.MAX_SAFE_INTEGER;
  });
  const shot = await page.waitForFunction(() => window.game.scene.getScene('Game').germs.getChildren().some((g) => g.active && g.def.id === 'basic'), null, { timeout: 20000 }).then(() => true, () => false);
  check(shot, 'Methicillin\'s Cluster Shot hatches Basic Germs');
  await page.screenshot({ path: 'smoke-methicillin.png' });
  const mrsa = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    const g = b.germ;
    b.nextShotAt = Number.MAX_SAFE_INTEGER;
    for (const x of scene.germs.getChildren()) if (x.active && x.def.id === 'basic') x.kill();
    const hit = (n, source) => { const before = g.hp; scene.damageGerm(g, n, 0, 0, source); return Math.round(before - g.hp); };
    const fresh = hit(100, 'squirtBottle');
    hit(200, 'squirtBottle');
    const resisting = b.resisting;
    const resisted = hit(100, 'squirtBottle');
    const otherTool = hit(100, 'bleachSoaker');
    const steam = hit(100, 'autoclave');
    // That took him past 2/3: the outer layer peeled off and grapes burst out
    const burst = scene.germs.getChildren().filter((x) => x.active && x.def.id === 'basic').length;
    return { fresh, resisting, resisted, otherTool, steam, peeled: b.peeled, texture: g.texture.key, burst };
  });
  check(mrsa.fresh === 100 && mrsa.resisting === 'squirtBottle' && mrsa.resisted === 20 && mrsa.otherTool === 100,
    `he adapts to the tool that hurt him most and resists it; switching tools works (${JSON.stringify(mrsa)})`);
  check(mrsa.steam === 150, `the Lab autoclave is never resisted and cooks him extra (${mrsa.steam})`);
  check(mrsa.peeled === 1 && mrsa.texture === 'germ-methicillin-2' && mrsa.burst >= 3, `his outer layer peels off and sheds grapes (${JSON.stringify(mrsa)})`);
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active && g.def.id === 'basic') g.kill();
    scene.player.hp = 100;
    scene.boss.nextRollAt = 0;
  });
  const rolled = await page.waitForFunction(() => window.game.scene.getScene('Game').boss.currentMode === 'rolling', null, { timeout: 30000 }).then(() => true, () => false);
  check(rolled, 'he curls up and Rolls at Eugene');
  const mrsaDown = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.player.hp = 100;
    scene.damageGerm(scene.boss.germ, 99999, 0, 0, 'autoclave');
    return { active: scene.boss.germ.active, ach: JSON.parse(localStorage.getItem('moshi.achievements.v1') ?? '[]').includes('sensitivityReport') };
  });
  check(!mrsaDown.active && mrsaDown.ach, `Methicillin can be defeated (${JSON.stringify(mrsaDown)})`);
  // His reward: a Prescription that compounds the tool in hand all the way up
  const rx = await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    const pill = scene.powerups.pills.find((p) => p.img.visible && p.id === 'prescription');
    if (pill) scene.player.setPosition(pill.img.x, pill.img.y);
    return !scene.sprayer.nextTier && scene.sprayer.tier >= 2;
  }, null, { timeout: 20000, polling: 100 }).then(() => true, () => false);
  check(rx, 'Methicillin leaves a Prescription that compounds your tool to Prescription Strength');

  // THE INFLUENZA TWINS (boss #4): two germs, one bar; the strand hurts; kill both close together or one revives the other
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.boss?.destroy();
    scene.boss = undefined;
    scene.player.hp = 100;
    const sp = scene.room.playerSpawn;
    scene.player.setPosition(sp.x, sp.y);
    scene.spawnGerm('fluH', { hpMult: 1, speedMult: 1 });
    const b = scene.boss;
    b.nextSpitAt = Number.MAX_SAFE_INTEGER;
  });
  const twinsUp = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    const hud = window.game.scene.getScene('Hud');
    return { h: b.germ.def.id, n: b.partner?.def.id, both: b.germ.active && b.partner?.active, bar: hud.bossBar.visible };
  });
  check(twinsUp.h === 'fluH' && twinsUp.n === 'fluN' && twinsUp.both, `H and N arrive together (${JSON.stringify(twinsUp)})`);
  // Stand Eugene on the strand between them
  const strand = await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    const sp = scene.room.playerSpawn;
    b.germ.setPosition(sp.x - 150, sp.y);
    b.partner.setPosition(sp.x + 150, sp.y);
    scene.player.setPosition(sp.x, sp.y);
    scene.player.invulnerableUntil = 0;
    return scene.player.hp < 100;
  }, null, { timeout: 15000, polling: 100 }).then(() => true, () => false);
  await page.screenshot({ path: 'smoke-twins.png' });
  check(strand, 'touching the strand between the twins hurts');
  // Only an exam-room curtain snaps the strand: a wall between them doesn't, a curtain pulled shut does
  const curtain = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    const c = scene.curtains.find((k) => k.o.w > k.o.h);
    const room = scene.room.rooms.find((r) => r.id.startsWith('exam') && c.o.x >= r.x && c.o.x < r.x + r.w && c.o.y >= r.y && c.o.y < r.y + r.h);
    scene.unlockRoom(room.id);
    const { o } = c;
    const cx = o.x + o.w / 2;
    const place = (x) => {
      b.germ.setPosition(x, o.y - 70);
      b.partner.setPosition(x, o.y + o.h + 70);
      b.germ.setVelocity(0, 0);
      b.partner.setVelocity(0, 0);
    };
    scene.player.setPosition(cx + 400, o.y + o.h + 200);
    // Through the wall beside the doorway
    place(o.x + o.w + 60);
    const wallBetween = !scene.flow.lineClear(b.germ.x, b.germ.y, b.partner.x, b.partner.y);
    b.update(scene.time.now);
    const wallSnapped = !b.tethered;
    // Through the open doorway, then the curtain pulled shut
    place(cx);
    const station = scene.stations.find((st) => st.o === c.o)?.info().verb;
    scene.closeCurtain(c, scene.time.now);
    const blocks = !scene.flow.lineClear(cx, o.y - 40, cx, o.y + o.h + 40);
    place(cx);
    b.update(scene.time.now);
    return { wallBetween, wallSnapped, station, blocks, snapped: !b.tethered, stunned: b.germ.stunnedUntil > scene.time.now };
  });
  check(curtain.wallBetween && !curtain.wallSnapped, `a plain wall no longer snaps the twins' strand (${JSON.stringify(curtain)})`);
  check(curtain.station === 'CURTAIN' && curtain.blocks && curtain.snapped, `a shut exam curtain is a wall and snaps the strand (${JSON.stringify(curtain)})`);
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const c of scene.curtains) c.closedUntil = 0;
  });
  const reopened = await page.waitForFunction(() => window.game.scene.getScene('Game').curtains.every((c) => !c.zone), null, { timeout: 15000 }).then(() => true, () => false);
  check(reopened, 'the curtain slides back open');
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    const sp = scene.room.playerSpawn;
    b.snappedUntil = 0;
    b.germ.setPosition(sp.x - 150, sp.y);
    b.partner.setPosition(sp.x + 150, sp.y);
    scene.player.setPosition(sp.x, sp.y);
  });
  const down = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    scene.player.hp = 100;
    scene.damageGerm(b.germ, 99999, 0, 0, 'squirtBottle');
    // Pretend six seconds went by
    b.twins[0].downAt = scene.time.now - 5990;
    return { active: b.germ.active, down: b.isDown(b.germ), aim: b.priorityTarget === b.partner };
  });
  check(down.active && down.down && down.aim, `a twin knocked out goes down, not out (${JSON.stringify(down)})`);
  const revived = await page.waitForFunction(() => {
    const b = window.game.scene.getScene('Game').boss;
    return !b.isDown(b.germ) && b.germ.hp > 0;
  }, null, { timeout: 15000 }).then(() => true, () => false);
  check(revived, 'the survivor revives its twin if you are too slow');
  await page.evaluate(() => {
    const b = window.game.scene.getScene('Game').boss;
    b.germ.hp = b.germ.maxHp * 0.3;
    b.partner.hp = b.partner.maxHp * 0.3;
  });
  const shifted = await page.waitForFunction(() => window.game.scene.getScene('Game').boss.shifted, null, { timeout: 15000 }).then(() => true, () => false);
  const shiftFactors = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    return [b.damageFactor(b.germ), b.damageFactor(b.partner)].sort();
  });
  check(shifted && shiftFactors[0] < 0.5 && shiftFactors[1] === 1, `antigenic shift: only one twin is vulnerable (${JSON.stringify(shiftFactors)})`);
  const twinsDown = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const b = scene.boss;
    const pillsBefore = scene.powerups.pills.filter((p) => p.img.visible).length;
    scene.damageGerm(b.germ, 99999, 0, 0, 'squirtBottle');
    const firstDown = b.isDown(b.germ);
    scene.damageGerm(b.partner, 99999, 0, 0, 'squirtBottle');
    return {
      firstDown, h: b.germ.active, n: b.partner.active,
      pills: scene.powerups.pills.filter((p) => p.img.visible).length - pillsBefore,
      fluShot: scene.powerups.pills.some((p) => p.img.visible && p.id === 'fluShot'),
      ach: JSON.parse(localStorage.getItem('moshi.achievements.v1') ?? '[]').includes('herdImmunity'),
    };
  });
  check(twinsDown.firstDown && !twinsDown.h && !twinsDown.n && twinsDown.ach, `knock both out together and the twins are beaten (${JSON.stringify(twinsDown)})`);
  check(twinsDown.pills >= 1 && twinsDown.fluShot, `the twins always leave a Flu Shot (${JSON.stringify(twinsDown)})`);
  const maxBefore = await page.evaluate(() => window.game.scene.getScene('Game').player.maxHp);
  const flu = await page.waitForFunction((before) => {
    const scene = window.game.scene.getScene('Game');
    const pill = scene.powerups.pills.find((p) => p.img.visible && p.id === 'fluShot');
    if (pill) scene.player.setPosition(pill.img.x, pill.img.y);
    return scene.player.maxHp === before + 15;
  }, maxBefore, { timeout: 20000, polling: 100 }).then(() => true, () => false);
  check(flu, 'the Flu Shot adds 15 max health');
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.player.hp = 100;
  });

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
  // Slow CI browsers (~5 fps) run game time far behind real time, so game-time waits get generous timeouts
  await page.waitForFunction(() => window.game.scene.isActive('GameOver'), null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'smoke-gameover.png' });
  const saved2 = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.save.v3') ?? '{}'));
  check(saved2.records?.urgent?.bestScore > 0 && saved2.records?.walkIn?.bestScore === 0, `high score saved under Urgent (${JSON.stringify(saved2.records)})`);
  const achLine = await page.evaluate(() => window.game.scene.getScene('GameOver').children.list.find((c) => typeof c.text === 'string' && c.text.includes('NEW:'))?.text ?? '');
  check(achLine.includes('Hand Hygiene Compliant'), `the Discharge Summary names the achievements unlocked this shift ("${achLine}")`);
  const cme = await page.evaluate(() => ({
    saved: JSON.parse(localStorage.getItem('moshi.progress.v1') ?? '{}'),
    line: window.game.scene.getScene('GameOver').children.list.flatMap((c) => (c.list ? [c, ...c.list] : [c])).find((c) => typeof c.text === 'string' && c.text.includes('CME CREDITS'))?.text ?? '',
  }));
  check(cme.saved.credits > 0 && cme.line.includes(`+${cme.saved.credits} CME`) && (cme.saved.kills?.basic ?? 0) > 0,
    `the shift earns CME Credits and banks lifetime kills for the Atlas (${cme.line}, ${cme.saved.credits} CME, ${cme.saved.kills?.basic} basics)`);
  check(cme.saved.nps > 0 && cme.line.includes(`+${cme.saved.nps} NPS`), `the shift earns NPS Scores (${cme.line}, ${cme.saved.nps} NPS)`);

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
  // On a slow runner another hint (Sinus Purge, the pour) can take the screen before SPRAY is learned. If so, give
  // SPRAY its moment now: one held germ in range, and hold the button until the hint is learned.
  const sprayLearned = () => page.evaluate(() => !!JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}').learned?.spray);
  if (!(await sprayLearned())) {
    await page.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      sc.spawnGermAt('basic', sc.player.x + 120, sc.player.y, true);
      for (const g of sc.germs.getChildren()) if (g.active) { g.maxHp = g.hp = 5000; g.freezeFor(sc.time.now, 60000); }
    });
    const held = await buttonAt('sprayButton');
    await touch('touchStart', [{ ...held, id: 4 }]);
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}').learned?.spray, null, { timeout: 60000 }).catch(() => {});
    await touch('touchEnd', []);
  }
  const learned = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}').learned ?? {});
  check(learned.move && learned.spray, `moving and spraying are learned, so those hints are gone (${JSON.stringify(learned)})`);

  // RESIDENCY BOARD (M15): from the title, buy a Specialty with CME, read the Atlas, and start a shift with it
  await page.evaluate(() => {
    const sc = window.game.scene;
    sc.stop('Hud');
    sc.stop('Game');
    sc.start('Title');
  });
  await page.waitForFunction(() => window.game.scene.isActive('Title'), null, { timeout: 10000 });
  const tapText = async (scene, match) => {
    const at = await page.evaluate(([key, m]) => {
      const t = window.game.scene.getScene(key).children.list.concat(...window.game.scene.getScene(key).children.list.filter((c) => c.list).map((c) => c.list))
        .find((c) => typeof c.text === 'string' && c.text.includes(m) && c.visible);
      if (!t) return null;
      const b = t.getBounds();
      const canvas = window.game.canvas.getBoundingClientRect();
      const k = canvas.width / window.game.scale.width;
      return { x: canvas.left + b.centerX * k, y: canvas.top + b.centerY * k };
    }, [scene, match]);
    if (at) await page.touchscreen.tap(at.x, at.y);
    return !!at;
  };
  await tapText('Title', 'RESIDENCY BOARD');
  await page.waitForFunction(() => window.game.scene.isActive('Board'), null, { timeout: 10000 }).catch(() => {});
  const boughtSpec = await tapText('Board', 'BUY');
  await page.waitForTimeout(300);
  const board = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('moshi.progress.v1') ?? '{}');
    return { open: window.game.scene.isActive('Board'), owned: saved.owned, specialty: saved.specialty, credits: saved.credits };
  });
  check(board.open && boughtSpec && board.specialty === 'infectiousDisease' && board.owned.includes('infectiousDisease'),
    `the Residency Board sells a Specialty for CME and puts it on shift (${JSON.stringify(board)})`);
  await tapText('Board', 'MICROBIOLOGY ATLAS');
  await page.waitForTimeout(300);
  const atlas = await page.evaluate(() => window.game.scene.getScene('Board').children.list.filter((c) => c.list).flatMap((c) => c.list).map((c) => c.text).filter((t) => typeof t === 'string' && t.includes('Basic Germ')));
  check(atlas.length === 1 && /disinfected/.test(atlas[0]), `the Microbiology Atlas lists germs with lifetime kills (${atlas[0]})`);
  await tapText('Board', 'BACK');
  await page.waitForFunction(() => window.game.scene.isActive('Title'), null, { timeout: 10000 }).catch(() => {});
  await page.touchscreen.tap(426, 120);
  await page.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 15000 }).catch(() => {});
  const onShift = await page.evaluate(() => window.game.scene.getScene('Game').player.maxHp);
  check(onShift === 90, `a shift under Infectious Disease starts with its catch: 90 max health (${onShift})`);
  // Back to General Practice, so later pages in this test start with a plain Eugene
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('moshi.progress.v1') ?? '{}');
    localStorage.setItem('moshi.progress.v1', JSON.stringify({ ...saved, specialty: '' }));
  });

  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

  // Debug/stress switches: ?round=6&copays=999&god&fps=30
  const dbg = await context.newPage();
  labelWaits(dbg);
  const dbgErrors = [];
  dbg.on('pageerror', (e) => dbgErrors.push(where(e)));
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

  // TODAY'S SHIFT, MODIFIERS, DIFFICULTY (M17)
  const fresh17 = async (query = '', init) => {
    const c = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await c.addInitScript((extra) => localStorage.setItem('moshi.settings.v1', JSON.stringify({ learned: { move: true, spray: true, pour: true, purge: true, buy: true }, ...extra })), init ?? {});
    const p = await c.newPage();
    labelWaits(p);
    const errs = [];
    p.on('pageerror', (e) => errs.push(where(e)));
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(url + query);
    await p.waitForFunction(() => window.game?.scene.isActive('Title'));
    return { c, p, errs };
  };
  /** Taps a Title-scene object (by property name) or a text containing `match`. */
  const tapIn = async (p, scene, prop, match) => {
    const at = await p.evaluate(([key, pr, m]) => {
      const sc = window.game.scene.getScene(key);
      const all = sc.children.list.flatMap((c) => (c.list ? [c, ...c.list] : [c]));
      const t = pr ? sc[pr] : all.find((c) => typeof c.text === 'string' && c.text === m && c.visible);
      if (!t) return null;
      const b = t.getBounds();
      const canvas = window.game.canvas.getBoundingClientRect();
      const k = canvas.width / window.game.scale.width;
      return { x: canvas.left + b.centerX * k, y: canvas.top + b.centerY * k };
    }, [scene, prop, match]);
    if (at) await p.touchscreen.tap(at.x, at.y);
    return !!at;
  };
  {
    const { c, p, errs } = await fresh17();
    const days = await p.evaluate(() => {
      const t = window.game.scene.getScene('Title');
      return { a: t.dailyFor('2026-10-18'), b: t.dailyFor('2026-10-18'), other: t.dailyFor('2026-10-19') };
    });
    check(days.a.length === 2 && days.a[0] !== days.a[1] && JSON.stringify(days.a) === JSON.stringify(days.b),
      `a fixed date gives the same 2 modifiers every time (${JSON.stringify(days)})`);
    await tapIn(p, 'Title', 'dailyButton');
    await p.waitForTimeout(300);
    const panel = await p.evaluate(() => {
      const t = window.game.scene.getScene('Title');
      return { open: t.dailyPanel.visible, started: window.game.scene.isActive('Game'), lines: t.panelTexts.map((x) => x.text) };
    });
    check(panel.open && !panel.started && panel.lines.join(' ').includes('URGENT'), `TODAY'S SHIFT opens the pre-shift panel with today's modifiers (${panel.lines.slice(2, 5).join(' / ')})`);
    await tapIn(p, 'Title', null, 'CLOCK IN');
    await p.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 30000 });
    await p.waitForTimeout(3000);
    const daily = await p.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      return { daily: sc.shift.daily, mods: sc.shift.mods, difficulty: sc.shift.difficulty, seed: sc.shift.seed, tag: window.game.scene.getScene('Hud').shiftText.text };
    });
    check(!!daily.daily && daily.mods.length === 2 && daily.difficulty === 'urgent' && daily.tag.includes("TODAY'S SHIFT"),
      `Today's Shift starts with the date's seed and modifiers, on Urgent (${JSON.stringify(daily)})`);
    // Finish it: the day's best, the first-of-the-day CME bonus, and the achievement
    await p.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      sc.player.invulnerableUntil = 0;
      sc.hurtPlayer(9999, 'basic');
    });
    await p.waitForFunction(() => window.game.scene.isActive('GameOver'), null, { timeout: 90000 });
    await p.waitForTimeout(800);
    const done = await p.evaluate(() => {
      const texts = window.game.scene.getScene('GameOver').children.list.flatMap((c) => (c.list ? [c, ...c.list] : [c])).map((c) => c.text).filter((t) => typeof t === 'string');
      return {
        save: JSON.parse(localStorage.getItem('moshi.save.v3') ?? '{}').daily,
        ach: JSON.parse(localStorage.getItem('moshi.achievements.v1') ?? '[]').includes('clockedIn'),
        best: texts.find((t) => t.startsWith("TODAY'S BEST")) ?? '',
        mods: texts.find((t) => t.includes("TODAY'S SHIFT")) ?? '',
        cme: texts.find((t) => t.includes('CME CREDITS')) ?? '',
      };
    });
    check(done.save?.finished === 1 && done.ach && done.best && done.mods && done.cme.includes('FIRST SHIFT TODAY'),
      `finishing Today's Shift saves the day's best, names the modifiers, and pays the first-shift CME bonus (${JSON.stringify(done)})`);
    check(errs.length === 0, `no errors in Today's Shift${errs.length ? ': ' + errs.join(' | ') : ''}`);
    await c.close();
  }
  for (const mod of ['fluSeason', 'powerOutage', 'inspectionDay', 'shortStaffed', 'construction', 'fullMoon']) {
    const { c, p, errs } = await fresh17(`?mods=${mod}&god&copays=500`);
    await p.touchscreen.tap(426, 120);
    await p.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 30000 });
    const st = await p.evaluate((m) => {
      const sc = window.game.scene.getScene('Game');
      sc.waves.nextRoundAt = 0;
      const out = { on: sc.hasMod(m), detail: '' };
      if (m === 'powerOutage') out.detail = String(!!sc.dark?.visible);
      if (m === 'shortStaffed') out.detail = String(sc.restockCost);
      if (m === 'inspectionDay' || m === 'fluSeason') out.detail = 'ok';
      if (m === 'fullMoon') out.detail = String(sc.patients.host.backwards);
      if (m === 'construction') {
        sc.unlockRoom('halls');
        sc.unlockRoom('exam1');
        sc.closeForConstruction(2);
        out.detail = sc.closed?.roomId ?? 'none';
      }
      return out;
    }, mod);
    await p.waitForTimeout(4000);
    const later = await p.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      return { round: sc.waves.round, germs: sc.germs.countActive(true) };
    });
    const ok = { powerOutage: st.detail === 'true', shortStaffed: st.detail === '120', fullMoon: st.detail === 'true', construction: st.detail !== 'none' }[mod] ?? true;
    check(st.on && ok && later.round >= 1, `?mods=${mod} runs (${st.detail}, round ${later.round}, ${later.germs} germs)`);
    check(errs.length === 0, `no errors with ${mod}${errs.length ? ': ' + errs.join(' | ') : ''}`);
    await c.close();
  }
  {
    const { c, p, errs } = await fresh17();
    await tapIn(p, 'Title', 'difficultyButton');
    await p.waitForTimeout(200);
    const picked = await p.evaluate(() => ({
      saved: JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}').difficulty,
      label: window.game.scene.getScene('Title').difficultyButton.text,
      game: window.game.scene.isActive('Game'),
    }));
    await p.touchscreen.tap(426, 120);
    await p.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 30000 });
    const hard = await p.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      sc.spawnGermAt('basic', sc.player.x + 300, sc.player.y, true);
      const g = sc.germs.getChildren().find((x) => x.active && x.def.id === 'basic');
      return { difficulty: sc.shift.difficulty, germHp: sc.diff.germHp, hpRatio: g.maxHp / g.def.hp };
    });
    check(picked.saved === 'trauma' && picked.label.includes('TRAUMA') && !picked.game && hard.difficulty === 'trauma' && hard.germHp > 1 && Math.abs(hard.hpRatio - hard.germHp) < 0.01,
      `the difficulty switch picks Trauma Center, saves it, and toughens germs (${JSON.stringify({ ...picked, ...hard })})`);
    check(errs.length === 0, `no errors on Trauma Center${errs.length ? ': ' + errs.join(' | ') : ''}`);
    await c.close();
  }

  // Phone held upright: the game still plays in landscape, turned sideways, and touches land where they look
  const tall = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const pp = await tall.newPage();
  labelWaits(pp);
  const tallErrors = [];
  pp.on('pageerror', (e) => tallErrors.push(where(e)));
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

  // OFFLINE + UPDATES: the service worker caches what the game loaded, so it launches with no network;
  // a newer version.json puts UPDATE READY on the title screen
  const swc = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const sw = await swc.newPage();
  labelWaits(sw);
  const swErrors = [];
  sw.on('pageerror', (e) => swErrors.push(where(e)));
  await sw.route('**/version.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 'v99.0.0 (newer)' }) }));
  await sw.goto(url + '?sw', { timeout: 90000 });
  await sw.waitForFunction(() => window.game?.scene.isActive('Title'));
  const pill = await sw.waitForFunction(() => window.game.scene.getScene('Title').updatePill?.visible, null, { timeout: 10000 }).then(() => true, () => false);
  check(pill, 'a newer build on the server shows UPDATE READY on the title screen');
  const cached = await sw.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    const keys = (await caches.keys()).filter((k) => k.startsWith('moshi-'));
    if (!keys.length) return false;
    const files = (await (await caches.open(keys[0])).keys()).map((r) => r.url);
    return files.some((u) => u.endsWith('.js') && !u.includes('sw.js')) && files.some((u) => u.endsWith('/')) && files.some((u) => u.includes('title.jpg')) ? files.length : false;
  }, null, { timeout: 30000, polling: 500 }).then((h) => h.jsonValue(), () => 0);
  check(cached > 0, `the service worker caches the game (${cached} files)`);
  await swc.setOffline(true);
  await sw.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  const offline = await sw.waitForFunction(() => window.game?.scene.isActive('Title'), null, { timeout: 60000 }).then(() => true, () => false);
  check(offline, 'with no network, the game still launches to the title screen');
  check(swErrors.length === 0, `no errors offline${swErrors.length ? ': ' + swErrors.join(' | ') : ''}`);
  await swc.close();

  // NPS SCORES: a Pal who hasn't been hired can't go on shift; on the title, tap a locked Pal twice to hire them
  {
    const hc = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await hc.addInitScript(() => {
      if (localStorage.getItem('moshi.progress.v1')) return;
      localStorage.setItem('moshi.settings.v1', JSON.stringify({ character: 'kaya', learned: { move: true, spray: true, pour: true, purge: true, buy: true } }));
      localStorage.setItem('moshi.progress.v1', JSON.stringify({ credits: 0, earned: 0, nps: 35, npsEarned: 35, owned: [], specialty: '', startTool: '', kills: {} }));
    });
    const hp = await hc.newPage();
    labelWaits(hp);
    const hireErrors = [];
    hp.on('pageerror', (e) => hireErrors.push(where(e)));
    await hp.goto(url);
    await hp.waitForFunction(() => window.game?.scene.isActive('Title'));
    const hire = await hp.evaluate(() => {
      const t = window.game.scene.getScene('Title');
      const label = (id) => t.picks.find((p) => p.id === id).name.text;
      const before = { info: t.pickInfo.text, kaya: label('kaya') };
      t.pick('lucien');
      const tooPoor = { info: t.pickInfo.text, nps: JSON.parse(localStorage.getItem('moshi.progress.v1')).nps };
      t.pick('lucien');
      const stillLocked = JSON.parse(localStorage.getItem('moshi.progress.v1')).owned.includes('doctor:lucien');
      t.pick('kaya');
      const asked = t.pickInfo.text;
      t.pick('kaya');
      const saved = JSON.parse(localStorage.getItem('moshi.progress.v1'));
      return { before, tooPoor, stillLocked, asked, owned: saved.owned, nps: saved.nps, kaya: label('kaya'), on: JSON.parse(localStorage.getItem('moshi.settings.v1')).character };
    });
    check(hire.before.info.startsWith('DR. MOSHKOVICH') && hire.before.kaya.includes('30 NPS'),
      `a saved pick of an unhired Pal falls back to Dr. Moshkovich, and locked Pals show their NPS price (${JSON.stringify(hire.before)})`);
    check(/NEED 10 MORE/.test(hire.tooPoor.info) && !hire.stillLocked && /TAP AGAIN/.test(hire.asked),
      `a Pal you can't afford stays locked, one you can asks for a second tap (${JSON.stringify({ tooPoor: hire.tooPoor, asked: hire.asked })})`);
    check(hire.owned.includes('doctor:kaya') && hire.nps === 5 && hire.kaya === 'KAYA' && hire.on === 'kaya',
      `the second tap hires Dr. Kaya for 30 NPS and puts him on shift (${JSON.stringify({ owned: hire.owned, nps: hire.nps, on: hire.on })})`);
    check(hireErrors.length === 0, `no errors hiring a Pal${hireErrors.length ? ': ' + hireErrors.join(' | ') : ''}`);
    await hc.close();
  }

  // THE PALS (M16): Dr. Kaya and PA Lucien are playable (once hired with NPS), each with their own signature move
  for (const who of ['kaya', 'lucien']) {
    const pc = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await pc.addInitScript((w) => {
      localStorage.setItem('moshi.settings.v1', JSON.stringify({ character: w, learned: { move: true, spray: true, pour: true, purge: true, buy: true } }));
      localStorage.setItem('moshi.progress.v1', JSON.stringify({ credits: 0, earned: 0, nps: 0, npsEarned: 0, owned: [`doctor:${w}`], specialty: '', startTool: '', kills: {} }));
    }, who);
    const pp2 = await pc.newPage();
    labelWaits(pp2);
    const palErrors = [];
    pp2.on('pageerror', (e) => palErrors.push(where(e)));
    await pp2.goto(url + '?god', { timeout: 90000 });
    await pp2.waitForFunction(() => window.game?.scene.isActive('Title'));
    await pp2.touchscreen.tap(426, 120);
    await pp2.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 15000 });
    const start = await pp2.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      sc.waves.nextRoundAt = 1e12;
      const p = sc.player;
      p.rotation = 0;
      for (let i = 0; i < 4; i++) sc.spawnGermAt('basic', p.x + 70 + i * 45, p.y, true);
      for (const g of sc.germs.getChildren()) if (g.active) { g.maxHp = g.hp = 500; g.freezeFor(sc.time.now, 20000); }
      const x0 = p.x;
      sc.signature(sc.time.now);
      return { id: sc.character.id, texture: p.texture.key, maxHp: p.maxHp, label: window.game.scene.getScene('Hud').purgeButton.label?.text ?? '', x0, cooling: sc.purgeReadyAt > sc.time.now };
    });
    const moved = await pp2.waitForFunction((x0) => {
      const sc = window.game.scene.getScene('Game');
      const hurt = sc.germs.getChildren().filter((g) => g.active && g.hp < g.maxHp).length;
      return hurt >= 2 ? { hurt, dx: Math.round(sc.player.x - x0) } : null;
    }, start.x0, { timeout: 20000 }).then((h) => h.jsonValue(), () => ({ hurt: 0, dx: 0 }));
    if (who === 'kaya') {
      check(start.texture === 'kaya' && /CODE/.test(start.label) && start.cooling && moved.hurt >= 2,
        `Dr. Kaya's CODE BLUE sprints through germs (${JSON.stringify({ ...start, ...moved })})`);
    } else {
      check(start.texture === 'lucien' && start.maxHp === 130 && /CLEAN/.test(start.label) && start.cooling && moved.hurt >= 2,
        `PA Lucien (+30 health) puts down a CLEAN FIELD that burns germs (${JSON.stringify({ ...start, ...moved })})`);
    }
    check(palErrors.length === 0, `no errors playing ${who}${palErrors.length ? ': ' + palErrors.join(' | ') : ''}`);
    await pc.close();
  }

  // KEN (M18): ?doctor=ken; FILE A GRIEVANCE hits germs and sends Diamond to HR; he hits Diamond harder than Eugene
  {
    const kc = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await kc.addInitScript(() => localStorage.setItem('moshi.settings.v1', JSON.stringify({ learned: { move: true, spray: true, pour: true, purge: true, buy: true } })));
    const kp = await kc.newPage();
    labelWaits(kp);
    const kenErrors = [];
    kp.on('pageerror', (e) => kenErrors.push(where(e)));
    await kp.goto(url + '?god&doctor=ken', { timeout: 90000 });
    await kp.waitForFunction(() => window.game?.scene.isActive('Title'));
    await kp.touchscreen.tap(426, 120);
    await kp.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 15000 });
    const ken = await kp.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      sc.waves.queue.length = 0;
      sc.waves.phase = 'intermission';
      sc.waves.nextRoundAt = Number.MAX_SAFE_INTEGER;
      const p = sc.player;
      for (let i = 0; i < 4; i++) sc.spawnGermAt('basic', p.x + 70 + i * 40, p.y, true);
      for (const g of sc.germs.getChildren()) if (g.active) { g.maxHp = g.hp = 500; g.freezeFor(sc.time.now, 20000); }
      sc.signature(sc.time.now);
      const hurt = sc.germs.getChildren().filter((g) => g.active && g.hp < g.maxHp).length;
      return { id: sc.character.id, texture: p.texture.key, label: window.game.scene.getScene('Hud').purgeButton.label?.text ?? '', cooling: sc.purgeReadyAt > sc.time.now, hurt };
    });
    check(ken.id === 'ken' && ken.texture === 'ken' && /GRIEVANCE/.test(ken.label) && ken.cooling && ken.hurt >= 3,
      `Ken (?doctor=ken) files a GRIEVANCE that hits the germs around him (${JSON.stringify(ken)})`);
    const vsDiamond = await kp.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      for (const g of sc.germs.getChildren()) if (g.active) g.kill();
      sc.perks.crit = 0; // no random STAT! crits in this comparison
      const sp = sc.room.playerSpawn;
      sc.player.setPosition(sp.x, sp.y);
      sc.spawnGerm('diamond', { hpMult: 1, speedMult: 1 });
      const boss = sc.boss;
      boss.germ.setPosition(sp.x + 260, sp.y);
      boss.nextMeetingAt = Number.MAX_SAFE_INTEGER;
      boss.germ.maxHp = boss.germ.hp = 100000;
      const hit = () => {
        const before = boss.germ.hp;
        const d = sc.droplets.get();
        d.fire(boss.germ.x, boss.germ.y, 0, 1, 100, { ...sc.loadout[0].def, damage: 100, knockback: 0, effectiveness: {} });
        sc.onDropletHit(d, boss.germ);
        return before - boss.germ.hp;
      };
      const kenDmg = hit();
      const real = sc.character;
      sc.character = { ...real, passive: {} }; // the same hit from someone without Ken's passive
      const plainDmg = hit();
      sc.character = real;
      sc.purgeReadyAt = 0;
      sc.signature(sc.time.now);
      return { kenDmg, plainDmg, hr: boss.atHr, said: boss.bubble.text, frozen: boss.germ.frozenUntil > sc.time.now };
    });
    check(vsDiamond.kenDmg > vsDiamond.plainDmg * 1.3, `Ken hits Diamond harder than Dr. Moshkovich does (${vsDiamond.kenDmg} vs ${vsDiamond.plainDmg})`);
    check(vsDiamond.hr && vsDiamond.frozen && vsDiamond.said.length > 0, `his GRIEVANCE summons Diamond to HR ("${vsDiamond.said}")`);
    check(kenErrors.length === 0, `no errors playing Ken${kenErrors.length ? ': ' + kenErrors.join(' | ') : ''}`);
    await kc.close();
  }

  // THE SCRIBES (M18): hired on the Residency Board, then their pill drops; ?scribe= brings one for the whole shift.
  // Each one follows Eugene, disinfects a germ and shames a violating patient into cleaning up (with the reward).
  const scribeWorks = async (pg, id) => {
    await pg.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 60000 });
    const here = await pg.evaluate((who) => {
      const sc = window.game.scene.getScene('Game');
      sc.waves.queue.length = 0;
      sc.waves.phase = 'intermission';
      sc.waves.nextRoundAt = Number.MAX_SAFE_INTEGER;
      for (const g of sc.germs.getChildren()) if (g.active) g.kill();
      const s = sc.scribes.get(who);
      if (!s) return { here: false };
      const p = sc.player;
      sc.spawnGermAt('basic', p.x + 160, p.y + 20, true);
      const g = sc.germs.getChildren().find((c) => c.active);
      // One or two hits (headless frame rates are low, and game time follows frames)
      g.maxHp = g.hp = 20;
      g.freezeFor(sc.time.now, 60000);
      window.__scribeGerm = g;
      return { here: true, near: Math.round(Math.hypot(s.img.x - p.x, s.img.y - p.y)) };
    }, id);
    const killed = await pg.waitForFunction((who) => {
      const sc = window.game.scene.getScene('Game');
      const s = sc.scribes.get(who);
      return !window.__scribeGerm.active && s.kills > 0 ? s.kills : null;
    }, id, { timeout: 90000 }).then((h) => h.jsonValue(), () => 0);
    check(here.here && here.near < 300 && killed > 0, `${id} shows up by Eugene and disinfects a germ (${JSON.stringify({ ...here, killed })})`);
    const copays0 = await pg.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      for (const g of sc.germs.getChildren()) if (g.active) g.kill();
      for (const other of sc.patients.group.getChildren()) if (other.active) other.retire();
      sc.patients.spawn(sc.time.now);
      const pt = sc.patients.group.getChildren().find((c) => c.active);
      pt.setPosition(sc.player.x + 30, sc.player.y + 130);
      pt.violations = 1;
      pt.hits = sc.patients.cfg.hitsToClean - 3; // already mostly shamed, so a slow test browser gets there
      pt.nextViolationAt = Number.MAX_SAFE_INTEGER;
      pt.leaveAt = Number.MAX_SAFE_INTEGER;
      window.__scribePatient = pt;
      return sc.copays;
    });
    const cleaned = await pg.waitForFunction((who) => {
      const sc = window.game.scene.getScene('Game');
      const s = sc.scribes.get(who);
      return s.cleaned > 0 ? { cleaned: s.cleaned, state: window.__scribePatient.state, copays: sc.copays } : null;
    }, id, { timeout: 90000 }).then((h) => h.jsonValue(), () => ({ cleaned: 0 }));
    check(cleaned.cleaned > 0 && cleaned.state === 'leaving' && cleaned.copays > copays0,
      `${id} gets a violating patient to clean up, for the usual reward (${JSON.stringify({ ...cleaned, copays0 })})`);
  };
  {
    // A device with CME to spend: hire Omar on the board, then play a shift with Alan forced in
    const sc1 = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await sc1.addInitScript(() => {
      if (!localStorage.getItem('moshi.progress.v1')) localStorage.setItem('moshi.progress.v1', JSON.stringify({ credits: 30, earned: 30, owned: [], specialty: '', startTool: '', kills: {} }));
      localStorage.setItem('moshi.settings.v1', JSON.stringify({ learned: { move: true, spray: true, pour: true, purge: true, buy: true } }));
    });
    const sp1 = await sc1.newPage();
    labelWaits(sp1);
    const scribeErrors = [];
    sp1.on('pageerror', (e) => scribeErrors.push(where(e)));
    await sp1.goto(url, { timeout: 90000 });
    await sp1.waitForFunction(() => window.game?.scene.isActive('Title'));
    const tapIn = async (scene, match) => {
      const at = await sp1.evaluate(([key, m]) => {
        const list = window.game.scene.getScene(key).children.list;
        const t = list.concat(...list.filter((c) => c.list).map((c) => c.list)).find((c) => typeof c.text === 'string' && c.text.includes(m) && c.visible);
        if (!t) return null;
        const b = t.getBounds();
        const canvas = window.game.canvas.getBoundingClientRect();
        const k = canvas.width / window.game.scale.width;
        return { x: canvas.left + b.centerX * k, y: canvas.top + b.centerY * k };
      }, [scene, match]);
      if (at) await sp1.touchscreen.tap(at.x, at.y);
      await sp1.waitForTimeout(250);
      return !!at;
    };
    await tapIn('Title', 'RESIDENCY BOARD');
    await sp1.waitForFunction(() => window.game.scene.isActive('Board'), null, { timeout: 10000 }).catch(() => {});
    await tapIn('Board', 'SCRIBES');
    const hired = await tapIn('Board', 'HIRE');
    const afterHire = await sp1.evaluate(() => JSON.parse(localStorage.getItem('moshi.progress.v1') ?? '{}'));
    check(hired && afterHire.owned.includes('scribe:omar') && afterHire.credits === 18,
      `the Residency Board hires Omar for 12 CME (${JSON.stringify({ owned: afterHire.owned, credits: afterHire.credits })})`);
    await sp1.goto(url + '?god&scribe=alan', { timeout: 90000 });
    await sp1.waitForFunction(() => window.game?.scene.isActive('Title'));
    await sp1.touchscreen.tap(426, 120);
    await scribeWorks(sp1, 'alan');
    const pool1 = await sp1.evaluate(() => window.game.scene.getScene('Game').powerups.dropPool);
    check(pool1.includes('scribeOmar') && pool1.includes('scribeAlan'), `a hired scribe's pill is in the drop pool (${pool1.join(', ')})`);
    // Picking up Omar's pill brings him in too
    const omarIn = await sp1.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      sc.powerups.drop(sc.player.x, sc.player.y, sc.time.now, 'scribeOmar');
      return true;
    });
    const omarHere = await sp1.waitForFunction(() => !!window.game.scene.getScene('Game').scribes.get('omar'), null, { timeout: 10000 }).then(() => true, () => false);
    check(omarIn && omarHere, "grabbing Omar's pill brings Omar in");
    check(scribeErrors.length === 0, `no errors with the scribes${scribeErrors.length ? ': ' + scribeErrors.join(' | ') : ''}`);
    await sc1.close();

    // A fresh device: nobody hired. ?scribe=omar brings Omar anyway; Alan is locked, so his pill never drops
    const sc2 = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await sc2.addInitScript(() => localStorage.setItem('moshi.settings.v1', JSON.stringify({ learned: { move: true, spray: true, pour: true, purge: true, buy: true } })));
    const sp2 = await sc2.newPage();
    labelWaits(sp2);
    const scribeErrors2 = [];
    sp2.on('pageerror', (e) => scribeErrors2.push(where(e)));
    await sp2.goto(url + '?god&scribe=omar', { timeout: 90000 });
    await sp2.waitForFunction(() => window.game?.scene.isActive('Title'));
    await sp2.touchscreen.tap(426, 120);
    await scribeWorks(sp2, 'omar');
    const drops = await sp2.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      const seen = new Set();
      for (let i = 0; i < 300; i++) {
        sc.powerups.drop(-1000, -1000, sc.time.now);
        for (const p of sc.powerups.pills) if (p.img.visible) seen.add(p.id);
      }
      for (const p of sc.powerups.pills) p.img.setVisible(false);
      return { pool: sc.powerups.dropPool, seen: [...seen] };
    });
    check(!drops.pool.includes('scribeAlan') && !drops.seen.includes('scribeAlan') && drops.seen.includes('scribeOmar'),
      `a locked scribe never drops (${drops.seen.join(', ')})`);
    check(!drops.pool.includes('techDonald'), `Donald's pill doesn't drop before he's unlocked (${drops.pool.join(', ')})`);
    // DONALD: walking into X-ray during the shift unlocks him for good and brings him out to help
    const start = await sp2.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      const omar = sc.scribes.get('omar');
      if (omar) omar.until = 1; // out of the way, so the kill below is Donald's
      const p = sc.player;
      const at = { x: p.x, y: p.y };
      const r = sc.room.rooms.find((rm) => rm.id === 'xray');
      p.body.reset(r.x + r.w * 0.2, r.y + r.h * 0.85);
      return at;
    });
    const donald = await sp2.waitForFunction(() => {
      const sc = window.game.scene.getScene('Game');
      const owned = JSON.parse(localStorage.getItem('moshi.progress.v1') ?? '{}').owned ?? [];
      return sc.scribes.get('donald') && owned.includes('scribe:donald') ? { pool: sc.powerups.dropPool } : null;
    }, null, { timeout: 30000 }).then((h) => h.jsonValue(), () => null);
    check(!!donald && donald.pool.includes('techDonald'), `walking into X-ray unlocks Donald, he comes out and his pill drops (${JSON.stringify(donald)})`);
    await sp2.evaluate((at) => window.game.scene.getScene('Game').player.body.reset(at.x, at.y), start);
    await scribeWorks(sp2, 'donald');
    check(scribeErrors2.length === 0, `no errors with Omar and Donald${scribeErrors2.length ? ': ' + scribeErrors2.join(' | ') : ''}`);
    await sc2.close();
  }

  // THE MIRACLE CURE: every step of the secret quest, driven through its stations, then the Records Room,
  // the Last Fax Machine, the Ionizer 9000 and the alternate ending
  {
    const mc = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await mc.addInitScript(() => localStorage.setItem('moshi.settings.v1', JSON.stringify({ learned: { move: true, spray: true, pour: true, purge: true, buy: true } })));
    const mp = await mc.newPage();
    labelWaits(mp);
    const cureErrors = [];
    mp.on('pageerror', (e) => cureErrors.push(where(e)));
    await mp.goto(url + '?god&copays=500', { timeout: 90000 });
    await mp.waitForFunction(() => window.game?.scene.isActive('Title'));
    await mp.touchscreen.tap(426, 120);
    await mp.waitForFunction(() => window.game.scene.isActive('Hud'), null, { timeout: 15000 });
    const clues = await mp.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      const cure = sc.cure;
      const st = (fn) => sc.stations.find((s) => fn(s.o));
      const w = sc.waves;
      // A break: the magazine's ad
      w.queue.length = 0;
      w.phase = 'intermission';
      w.nextRoundAt = Number.MAX_SAFE_INTEGER;
      const phoneHiddenBefore = !!st((o) => o.label === 'RECEPTION').gone?.();
      st((o) => o.kind === 'magTable').use(sc.time.now);
      const read = cure.magazineRead;
      // A live round (one frozen germ keeps it going): call from the front desk
      w.phase = 'active';
      sc.spawnGermAt('basic', sc.room.playerSpawn.x - 200, sc.room.playerSpawn.y + 400, true);
      for (const g of sc.germs.getChildren()) if (g.active) { g.maxHp = g.hp = 1e6; g.freezeFor(sc.time.now, 1e9); }
      const desk = st((o) => o.label === 'RECEPTION' && o.kind === 'desk');
      sc.player.body.reset(desk.o.x + desk.o.w + 40, desk.o.y + desk.o.h / 2);
      desk.use(sc.time.now);
      return { phoneHiddenBefore, read, onHold: cure.onHold, holdLabel: desk.info().verb };
    });
    check(clues.phoneHiddenBefore && clues.read && clues.onHold && clues.holdLabel === 'ON HOLD',
      `Miracle Cure: the magazine's ad, then the front-desk phone puts the doctor on hold (${JSON.stringify(clues)})`);
    // Skip most of the hold music; the operator answers if the doctor stays by the desk
    await mp.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      sc.cure.holdSince = sc.time.now - 19950;
    });
    const operator = await mp.waitForFunction(() => window.game.scene.getScene('Game').cure.codeA, null, { timeout: 20000 }).then(() => true, () => false);
    const banner = await mp.evaluate(() => window.game.scene.getScene('Hud').banner.text);
    check(operator && banner === 'CUSTOMER CARE', `staying on hold by the desk gets code half A (${banner})`);
    const rest = await mp.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      const cure = sc.cure;
      const st = (fn) => sc.stations.find((s) => fn(s.o));
      const copays = sc.copays;
      st((o) => o.kind === 'microwave').use(sc.time.now);
      const fishPaid = copays - sc.copays;
      st((o) => o.kind === 'fridge').use(sc.time.now);
      const codeB = cure.codeB;
      sc.xrayPulse();
      const keySeen = cure.keySeen;
      sc.openVending();
      const hasKeyOffer = sc.vendingOffer !== undefined && cure.keyForSale;
      sc.buySnack('mysteryKey');
      // A boss round: three flushes of Stall 3
      const w = sc.waves;
      w.round = 5;
      w.phase = 'active';
      const stall = st((o) => o.kind === 'stall' && o.label === 'STALL 3');
      for (let i = 0; i < 3; i++) stall.use(sc.time.now);
      return { fishPaid, stench: cure.stench, codeB, keySeen, hasKeyOffer, hasKey: cure.hasKey, panel: cure.panelOpen, verb: stall.info().verb, code: cure.code };
    });
    check(rest.fishPaid === 5 && rest.stench && rest.codeB && rest.keySeen && rest.hasKeyOffer && rest.hasKey && rest.panel && rest.verb === 'RECORDS',
      `fish + fridge note, X-ray, key from B4, then three flushes in a boss round open the RECORDS panel (${JSON.stringify(rest)})`);
    // Between rounds: into the Records Room, and the Last Fax Machine wakes up
    const inside = await mp.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      const w = sc.waves;
      for (const g of sc.germs.getChildren()) if (g.active) g.kill();
      w.phase = 'intermission';
      w.nextRoundAt = sc.time.now + 3000;
      sc.stations.find((s) => s.o.kind === 'stall' && s.o.label === 'STALL 3').use(sc.time.now);
      return { inRecords: sc.cure.inRecords, floor: sc.floorOf(sc.player.x, sc.player.y)?.id, breakAt: w.nextRoundAt - sc.time.now };
    });
    const faxUp = await mp.waitForFunction(() => window.game.scene.getScene('Game').boss?.germ.def.id === 'faxMachine' && window.game.scene.getScene('Game').boss.germ.active, null, { timeout: 60000 }).then(() => true, () => false);
    const pages = await mp.waitForFunction(() => window.game.scene.getScene('Game').germs.getChildren().some((g) => g.active && g.def.id === 'faxPage'), null, { timeout: 90000 }).then(() => true, () => false);
    await mp.screenshot({ path: 'smoke-records.png' });
    const held = await mp.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      return { phase: sc.waves.phase, round: sc.waves.round, left: sc.waves.nextRoundAt - sc.time.now };
    });
    check(inside.inRecords && inside.floor === 'records' && faxUp && pages && held.phase === 'intermission' && held.left > 1000,
      `the Records Room: the Last Fax Machine faxes pages, and the break waits (${JSON.stringify({ inside, faxUp, pages, held })})`);
    const won = await mp.evaluate(() => {
      const sc = window.game.scene.getScene('Game');
      const st = (fn) => sc.stations.find((s) => fn(s.o));
      const door = st((o) => o.kind === 'recordsDoor');
      const lockedWhileFax = door.info().blocked;
      sc.damageGerm(sc.boss.germ, 1e7, 0, 0);
      const tool = sc.sprayer.def.id;
      door.use(sc.time.now);
      const back = sc.floorOf(sc.player.x, sc.player.y)?.id;
      const leftovers = sc.germs.getChildren().filter((g) => g.active && sc.floorOf(g.x, g.y)?.id === 'records').length;
      sc.cure.onRoundCompleted(true);
      const exit = st((o) => o.label?.startsWith('EXIT'));
      const canClock = !exit.gone();
      exit.use(sc.time.now);
      return { lockedWhileFax, tool, back, leftovers, canClock, cureAch: sc.runStats.achievements };
    });
    // Skip the credits (keep tapping: on a slow machine the skip listener takes a moment to arm)
    // (the Discharge Summary waits 1.6 s of game time, which crawls on CI)
    const shiftComplete = () => mp.evaluate(() => window.game.scene.isActive('GameOver')
      && window.game.scene.getScene('GameOver').children.list.some((c) => c.text === 'SHIFT COMPLETE'));
    let title = false;
    for (let i = 0; i < 60 && !title; i++) {
      await mp.touchscreen.tap(426, 200);
      await mp.waitForTimeout(1500);
      title = await shiftComplete();
    }
    const capped = await mp.evaluate(() => JSON.parse(localStorage.getItem('moshi.progress.v1') ?? '{}').owned ?? []);
    check(won.lockedWhileFax && won.tool === 'ionizer9000' && won.back === 'up' && won.leftovers === 0 && won.canClock && title,
      `the Ionizer 9000, back to Stall 3, then CLOCK OUT: SHIFT COMPLETE (${JSON.stringify({ won, title, capped })})`);
    check(capped.includes('scrubCap'), `clocking out unlocks Eugene's scrub cap (${capped.join(', ')})`);
    check(cureErrors.length === 0, `no errors in the Miracle Cure${cureErrors.length ? ': ' + cureErrors.join(' | ') : ''}`);
    await mc.close();
  }
} catch (e) {
  check(false, String(e) + (errors.length ? " | errors: " + errors.join(" | ") : ""));
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
