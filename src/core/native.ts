import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { ATLAS, ATLAS_UNLOCK_KILLS } from '../data/atlas';
import { CHARACTERS } from '../data/characters';
import { DIFFICULTIES, difficultyById } from '../data/difficulties';
import { GERMS } from '../data/germs';
import { modifierById } from '../data/modifiers';
import { achievementList } from './achievements';
import { events, GameEvents, type HealthPayload } from './events';
import { applyVolume } from './music';
import { doctorUnlocked, hireDoctor, progress } from './progress';
import { dailyBest, loadSave } from './save';
import { saveSettings, settings, type Settings } from './settings';
import { setSfxMuted } from './sfx';
import { chooseShift, dailyShift, localDate } from './shift';
import { savedShift } from './shiftSave';

/**
 * NATIVE HOST: the iPhone app (ios/) runs this same build inside a WKWebView, opened with `?native`. There the
 * app's SwiftUI screens replace the title screen: Boot hands off to the empty Native scene, the app starts shifts
 * and opens the board or locker through `window.moshiNative`, and the game reports back (a snapshot of saved
 * progress, leaving to the menu, haptics) through `webkit.messageHandlers.moshi`. In a browser none of this runs.
 */
export const NATIVE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('native');

type NativeMessage = { type: string; [key: string]: unknown };

interface WebkitWindow {
  webkit?: { messageHandlers?: { moshi?: { postMessage(msg: unknown): void } } };
}

function post(msg: NativeMessage): void {
  try {
    (window as unknown as WebkitWindow).webkit?.messageHandlers?.moshi?.postMessage(msg);
  } catch {
    // No app listening (a browser testing ?native): nothing to tell
  }
}

/** Settings the app may change from its own Settings screen and shift picker. */
const SETTABLE: (keyof Settings)[] = ['autoAim', 'sound', 'music', 'autoRefill', 'reducedMotion', 'character', 'difficulty'];

let game: Phaser.Game | undefined;
/** A start or open asked for before Boot finished; the Native scene runs it once it's up. */
let pending: (() => void) | undefined;
let artSent = false;

/** Everything the app's screens show, read fresh from the saves. `withArt` adds the Pals' and germs' pictures. */
export function snapshot(withArt = false): NativeMessage {
  const save = loadSave();
  const prog = progress();
  const date = localDate();
  const best = dailyBest(date);
  const saved = savedShift();
  const art: Record<string, string> = {};
  if (withArt && game) {
    const keys = [...CHARACTERS.map((c) => `${c.id}-held`), ...ATLAS.map((a) => `germ-${a.id}`)];
    for (const key of keys) {
      try {
        if (game.textures.exists(key)) art[key] = game.textures.getBase64(key);
      } catch {
        // A picture the app can't have just shows its placeholder
      }
    }
  }
  return {
    type: 'snapshot',
    version: __APP_VERSION__,
    settings: Object.fromEntries(SETTABLE.map((k) => [k, settings[k]])),
    pals: CHARACTERS.map((c) => ({ id: c.id, name: c.name, short: c.short, blurb: c.blurb, price: c.price, unlocked: doctorUnlocked(c.id) })),
    difficulties: DIFFICULTIES.map((d) => ({ id: d.id, name: d.name, blurb: d.blurb, ...save.records[d.id] })),
    totals: { runs: save.runs, totalKills: save.totalKills },
    progress: { credits: prog.credits, nps: prog.nps, bank: prog.bank },
    achievements: achievementList().map(({ def, unlocked }) => ({ id: def.id, name: def.name, how: def.how, unlocked })),
    atlas: ATLAS.map((a) => {
      const germ = GERMS[a.id];
      const kills = prog.kills[a.id] ?? 0;
      const need = germ?.boss ? 1 : ATLAS_UNLOCK_KILLS;
      return { id: a.id, name: germ?.name ?? a.id, note: a.note, kills, need, unlocked: kills >= need };
    }),
    today: {
      date,
      mods: dailyShift(date).mods.map((id) => modifierById(id)).filter((m) => !!m).map((m) => ({ id: m.id, name: m.name, icon: m.icon, blurb: m.blurb })),
      bestScore: best.bestScore, bestRound: best.bestRound, finished: best.finished, firstFinishCme: BALANCE.daily.firstFinishCme,
    },
    savedShift: saved ? { round: saved.round, difficulty: difficultyById(saved.shift.difficulty).name, daily: !!saved.shift.daily, character: saved.character } : null,
    art,
  };
}

function sendSnapshot(): void {
  post(snapshot(!artSent));
  artSent = true;
}

/** Leaving a shift, the board or the locker: the browser game shows its title screen; the app takes over instead. */
export function toTitle(scene: Phaser.Scene): void {
  if (!NATIVE) {
    scene.scene.start('Title');
    return;
  }
  scene.scene.start('Native');
  post({ type: 'exit' });
}

/** Where the app goes from: an empty, dark scene that reports in when it starts and runs any pending request. */
export class NativeScene extends Phaser.Scene {
  constructor() {
    super('Native');
  }

  create(): void {
    sendSnapshot();
    post({ type: 'ready' });
    const run = pending;
    pending = undefined;
    if (run) run();
    else idle();
  }
}

/** Nothing to draw behind the app's menus: let the game loop sleep (a start or open wakes it). */
function idle(): void {
  setTimeout(() => {
    if (game?.scene.isActive('Native') && !pending) game.loop.sleep();
  }, 250);
}

/** Runs `fn` on the Native scene (now if it's up, otherwise as soon as it is). */
function fromNative(fn: (scene: Phaser.Scene) => void): void {
  const run = () => {
    const scene = game?.scene.getScene('Native');
    if (scene) fn(scene);
  };
  game?.loop.wake();
  if (game?.scene.isActive('Native')) run();
  else pending = run;
}

let lastHp = -1;
let lastHitAt = 0;
const haptic = (kind: string) => post({ type: 'haptic', kind });

/** Game moments the app turns into taps of the Taptic Engine. */
function watchForHaptics(): void {
  events.on(GameEvents.RunStarted, () => (lastHp = -1));
  events.on(GameEvents.PlayerHealthChanged, ({ hp }: HealthPayload) => {
    const now = performance.now();
    if (lastHp >= 0 && hp < lastHp && now - lastHitAt > 150) {
      lastHitAt = now;
      haptic('hit');
    }
    lastHp = hp;
  });
  events.on(GameEvents.PurgeUsed, () => haptic('purge'));
  events.on(GameEvents.BossSpawned, () => haptic('boss'));
  events.on(GameEvents.BossDefeated, () => haptic('bossDefeated'));
  events.on(GameEvents.RoundCompleted, () => haptic('roundCompleted'));
  events.on(GameEvents.RoomUnlocked, () => haptic('unlock'));
  events.on(GameEvents.ToolUnlocked, () => haptic('pickup'));
  events.on(GameEvents.PowerupPicked, () => haptic('pickup'));
  events.on(GameEvents.AchievementUnlocked, () => haptic('achievement'));
  events.on(GameEvents.PlayerDied, () => {
    haptic('death');
    // The records are written just after; the app's screens pick them up
    setTimeout(sendSnapshot, 500);
  });
}

/** What the app can ask for (`window.moshiNative.start({ kind: 'daily' })` etc). */
const api = {
  /** Starts a shift: a normal one, Today's Shift, or the saved one. */
  start({ kind }: { kind?: 'normal' | 'daily' | 'resume' } = {}): void {
    fromNative((scene) => {
      const resume = kind === 'resume' && !!savedShift();
      chooseShift(resume ? savedShift()?.shift.daily : kind === 'daily' ? localDate() : undefined);
      scene.scene.start('Game', { resume });
    });
  },
  /** Opens the Residency Board or the Equipment Locker (their BACK returns to the app). */
  open(screen: 'board' | 'locker'): void {
    fromNative((scene) => scene.scene.start(screen === 'board' ? 'Board' : 'Locker'));
  },
  /** Hires a Pal with NPS Scores. True if it worked; a fresh snapshot follows either way. */
  hire(id: string): boolean {
    const ok = !doctorUnlocked(id) && hireDoctor(id);
    sendSnapshot();
    return ok;
  },
  /** Changes settings (unknown keys and wrong types are ignored), applies sound and music, and saves. */
  setSettings(changes: Partial<Settings>): void {
    const target = settings as unknown as Record<string, unknown>;
    for (const key of SETTABLE) {
      const value = (changes as Record<string, unknown>)[key];
      if (value === undefined || typeof value !== typeof target[key]) continue;
      // Only a hired Pal goes on shift, and only a real difficulty
      if (key === 'character' && !doctorUnlocked(String(value))) continue;
      if (key === 'difficulty' && !DIFFICULTIES.some((d) => d.id === value)) continue;
      target[key] = value;
    }
    saveSettings();
    setSfxMuted(!settings.sound);
    applyVolume();
    sendSnapshot();
  },
  /** Sends a fresh snapshot. */
  refresh(): void {
    sendSnapshot();
  },
};

/** Called once from main.ts. Only does anything inside the app. */
export function installNativeBridge(g: Phaser.Game): void {
  if (!NATIVE) return;
  game = g;
  (window as unknown as { moshiNative: typeof api }).moshiNative = api;
  watchForHaptics();
  // Phaser restarts its loop when the app comes back to the foreground; back to sleep if the menus are up
  g.events.on(Phaser.Core.Events.VISIBLE, () => {
    if (g.scene.isActive('Native')) idle();
  });
}
