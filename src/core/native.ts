import Phaser from 'phaser';
import { hasNativeHost, postNativeMessage } from './platform';
import { BALANCE } from '../config/balance';
import { ATLAS, ATLAS_UNLOCK_KILLS } from '../data/atlas';
import { CHARACTERS } from '../data/characters';
import { DIFFICULTIES, difficultyById } from '../data/difficulties';
import { GERMS } from '../data/germs';
import { modifierById } from '../data/modifiers';
import { achievementList } from './achievements';
import { events, GameEvents, type HealthPayload } from './events';
import { applyVolume } from './music';
import { doctorUnlocked, progress } from './progress';
import { dailyBest, loadSave } from './save';
import { saveSettings, settings, type Settings } from './settings';
import { setSfxMuted } from './sfx';
import { localDate, dailyShift } from './shift';
import { savedShift } from './shiftSave';

/**
 * NATIVE HOST: the iPhone app (ios/) runs this same build inside a WKWebView, opened with `?native`. The game
 * shows its own title screen and menus there, exactly as in a browser. The app adds what the web can't: a
 * SwiftUI Settings sheet (the title's gear asks for it), Game Center (the LEADERBOARD tab asks for it) and
 * haptics. The game reports back through `webkit.messageHandlers.moshi` (a snapshot of saved progress whenever
 * the title shows or progress changes, `ready`, `playing`, `exit`, haptics) and takes settings changes through
 * `window.moshiNative`. In a browser none of this runs.
 */
export const NATIVE = hasNativeHost();

type NativeMessage = { type: string; [key: string]: unknown };

function post(msg: NativeMessage): void { postNativeMessage(msg); }

/** Settings the app may change from its Settings sheet. */
const SETTABLE: (keyof Settings)[] = ['autoAim', 'sound', 'music', 'autoRefill', 'reducedMotion', 'character', 'difficulty'];

/** Everything the app reads (Game Center sends new bests and unlocks), read fresh from the saves. */
export function snapshot(): NativeMessage {
  const save = loadSave();
  const prog = progress();
  const date = localDate();
  const best = dailyBest(date);
  const saved = savedShift();
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
  };
}

function sendSnapshot(): void {
  post(snapshot());
}

/** Leaving a shift, the board or the locker: back to the title screen (the app hears `exit` too). */
export function toTitle(scene: Phaser.Scene): void {
  scene.scene.start('Title');
  if (NATIVE) post({ type: 'exit' });
}

/** The title's gear: in the app it opens the SwiftUI Settings sheet. False in a browser (the gear toggles sound there). */
export function openNativeSettings(): boolean {
  if (!NATIVE) return false;
  post({ type: 'openSettings' });
  return true;
}

/** The LEADERBOARD tab and button: in the app they open Game Center. False in a browser (the web leaderboard shows there). */
export function openNativeGameCenter(): boolean {
  if (!NATIVE) return false;
  post({ type: 'openGameCenter' });
  return true;
}

let lastHp = -1;
let lastHitAt = 0;
const haptic = (kind: string) => post({ type: 'haptic', kind });

/** Game moments the app turns into taps of the Taptic Engine. */
function watchForHaptics(): void {
  events.on(GameEvents.RunStarted, () => { lastHp = -1; post({ type: 'playing' }); });
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
    // The records are written just after; Game Center picks them up
    setTimeout(sendSnapshot, 500);
  });
}

/** What the app can ask for (`window.moshiNative.setSettings({ sound: false })` etc). */
const api = {
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

/**
 * Called once from main.ts. Only does anything inside the app: installs `window.moshiNative`, watches for
 * haptics, and reports in (`snapshot`, then `ready`) every time the title screen comes up.
 */
export function installNativeBridge(game: Phaser.Game): void {
  if (!NATIVE) return;
  (window as unknown as { moshiNative: typeof api }).moshiNative = api;
  watchForHaptics();
  // The scenes exist once the game is ready; the title screen is created after Boot and after every exit
  game.events.once(Phaser.Core.Events.READY, () => {
    game.scene.getScene('Title')?.events.on(Phaser.Scenes.Events.CREATE, () => {
      sendSnapshot();
      post({ type: 'ready' });
    });
  });
}
