import { CME, SPECIALTIES, STARTER_KIT_COST, type SpecialtyDef } from '../data/residency';
import { SCRIBES, scribeUnlockId, type ScribeId } from '../data/scribes';
import { BALANCE } from '../config/balance';
import { characterById } from '../data/characters';
import { LOCKER } from '../config/locker';

/**
 * Between-run progress on this device: CME Credits, NPS Scores (which hire the Pals), what's been bought on the Residency Board, what's
 * chosen for the next shift, and lifetime kills per germ (for the Microbiology Atlas). Its own storage key,
 * read once and written on every change; storage can be unavailable, then it lasts the session.
 */
export interface Progress {
  credits: number;
  /** Lifetime credits (for the board's header). */
  earned: number;
  /** NPS Scores to spend on hiring doctors, and lifetime NPS. */
  nps: number;
  npsEarned: number;
  /** Bought specialty ids, plus 'starterKit', unlocked scribes and Donald ('scribe:omar') and hired doctors ('doctor:kaya'). Older saves simply have none. */
  owned: string[];
  /** Active specialty for the next shift (must be owned), or ''. */
  specialty: string;
  /** Crate tool to start with (needs the Starter Kit), or ''. */
  startTool: string;
  /** Lifetime kills by germ id. */
  kills: Record<string, number>;
  /** Copays banked for the Equipment Locker (a share of every shift's), and Locker levels bought per tool id. */
  bank: number;
  locker: Record<string, number>;
}

const KEY = 'moshi.progress.v1';

const whole = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

function load(): Progress {
  const fresh: Progress = { credits: 0, earned: 0, nps: 0, npsEarned: 0, owned: [], specialty: '', startTool: '', kills: {}, bank: 0, locker: {} };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return fresh;
    const r = raw as Record<string, unknown>;
    const owned = Array.isArray(r.owned) ? r.owned.filter((x): x is string => typeof x === 'string') : [];
    const kills: Record<string, number> = {};
    if (r.kills && typeof r.kills === 'object') for (const [k, v] of Object.entries(r.kills as Record<string, unknown>)) kills[k] = whole(v);
    const locker: Record<string, number> = {};
    if (r.locker && typeof r.locker === 'object') {
      for (const [k, v] of Object.entries(r.locker as Record<string, unknown>)) locker[k] = Math.min(LOCKER.levels.length, whole(v));
    }
    const specialty = typeof r.specialty === 'string' && owned.includes(r.specialty) ? r.specialty : '';
    const startTool = typeof r.startTool === 'string' && owned.includes('starterKit') ? r.startTool : '';
    return { credits: whole(r.credits), earned: whole(r.earned), nps: whole(r.nps), npsEarned: whole(r.npsEarned), owned, specialty, startTool, kills, bank: whole(r.bank), locker };
  } catch {
    return fresh;
  }
}

let state = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not fatal
  }
}

export function progress(): Readonly<Progress> {
  return state;
}

/** The Specialty chosen for this shift, if any. */
export function activeSpecialty(): SpecialtyDef | undefined {
  return SPECIALTIES.find((s) => s.id === state.specialty);
}

/** CME Credits a finished shift is worth. */
export function creditsFor(round: number, newAchievements: number, bossesDefeated: number): number {
  return Math.floor(round / 2) * CME.perTwoRounds + newAchievements * CME.perAchievement + bossesDefeated * CME.perBoss;
}

/** NPS Scores a finished shift is worth: how far you got, how many patients you cleaned up, bosses beaten. */
export function npsFor(round: number, patientsCleaned: number, bossesDefeated: number): number {
  const n = BALANCE.nps;
  return round * n.perRound + patientsCleaned * n.perPatient + bossesDefeated * n.perBoss;
}

/** Copays a finished shift sends home to the Equipment Locker. */
export function bankFor(copaysEarned: number): number {
  return Math.floor(copaysEarned * LOCKER.bankShare);
}

/** Banks a finished shift: credits, NPS Scores, Locker Copays and per-germ kills. */
export function recordShift(credits: number, kills: Record<string, number>, nps = 0, bank = 0): void {
  state = {
    ...state, credits: state.credits + credits, earned: state.earned + credits,
    nps: state.nps + nps, npsEarned: state.npsEarned + nps, bank: state.bank + bank, kills: { ...state.kills },
  };
  for (const [id, n] of Object.entries(kills)) state.kills[id] = (state.kills[id] ?? 0) + n;
  save();
}

/** Whether a scribe has been unlocked on the Residency Board (their pill can drop). */
export function scribeUnlocked(id: ScribeId): boolean {
  return state.owned.includes(scribeUnlockId(id));
}

/** Unlocks a helper who isn't bought (Donald). Returns true the first time. */
export function unlockScribe(id: ScribeId): boolean {
  const key = scribeUnlockId(id);
  if (state.owned.includes(key)) return false;
  state = { ...state, owned: [...state.owned, key] };
  save();
  return true;
}

/** Buys a board item (a specialty id, 'starterKit' or 'scribe:<id>'). Returns false if it's owned or too expensive. */
export function buy(id: string): boolean {
  const cost = id === 'starterKit' ? STARTER_KIT_COST
    : SPECIALTIES.find((s) => s.id === id)?.cost ?? SCRIBES.find((s) => scribeUnlockId(s.id) === id)?.cost;
  if (cost === undefined || state.owned.includes(id) || state.credits < cost) return false;
  state = { ...state, credits: state.credits - cost, owned: [...state.owned, id] };
  save();
  return true;
}

/** Chooses (or with '' clears) the Specialty for the next shift. */
export function chooseSpecialty(id: string): void {
  if (id && !state.owned.includes(id)) return;
  state = { ...state, specialty: id };
  save();
}

/** Chooses (or with '' clears) the crate tool to start with. */
export function chooseStartTool(id: string): void {
  if (id && !state.owned.includes('starterKit')) return;
  state = { ...state, startTool: id };
  save();
}

/** Whether a doctor can go on shift (Eugene always can; the others once hired). */
export function doctorUnlocked(id: string): boolean {
  const c = characterById(id);
  return c.id === id && (c.price === 0 || state.owned.includes(`doctor:${id}`));
}

/** Hires a doctor with NPS Scores. Returns false if they're already on staff or it's too expensive. */
export function hireDoctor(id: string): boolean {
  const c = characterById(id);
  if (c.id !== id || doctorUnlocked(id) || state.nps < c.price) return false;
  state = { ...state, nps: state.nps - c.price, owned: [...state.owned, `doctor:${id}`] };
  save();
  return true;
}

/** Unlocks something earned rather than bought (the Miracle Cure's 'scrubCap'). */
export function grant(id: string): void {
  if (state.owned.includes(id)) return;
  state = { ...state, owned: [...state.owned, id] };
  save();
}

/** Equipment Locker levels bought for a tool (0 = none). */
export function lockerLevel(toolId: string): number {
  return state.locker[toolId] ?? 0;
}

/** Buys a tool's next Equipment Locker level with banked Copays. Returns false if it's maxed or too expensive. */
export function buyLockerLevel(toolId: string): boolean {
  const level = lockerLevel(toolId);
  const next = LOCKER.levels[level];
  if (!next || state.bank < next.cost) return false;
  state = { ...state, bank: state.bank - next.cost, locker: { ...state.locker, [toolId]: level + 1 } };
  save();
  return true;
}
