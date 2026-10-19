import { CME, SPECIALTIES, STARTER_KIT_COST, type SpecialtyDef } from '../data/residency';
import { SCRIBES, scribeUnlockId, type ScribeId } from '../data/scribes';

/**
 * Between-run progress on this device: CME Credits, what's been bought on the Residency Board, what's
 * chosen for the next shift, and lifetime kills per germ (for the Microbiology Atlas). Its own storage key,
 * read once and written on every change; storage can be unavailable, then it lasts the session.
 */
export interface Progress {
  credits: number;
  /** Lifetime credits (for the board's header). */
  earned: number;
  /** Bought specialty ids, plus 'starterKit' and unlocked scribes ('scribe:omar'). Older saves simply have none. */
  owned: string[];
  /** Active specialty for the next shift (must be owned), or ''. */
  specialty: string;
  /** Crate tool to start with (needs the Starter Kit), or ''. */
  startTool: string;
  /** Lifetime kills by germ id. */
  kills: Record<string, number>;
}

const KEY = 'moshi.progress.v1';

const whole = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

function load(): Progress {
  const fresh: Progress = { credits: 0, earned: 0, owned: [], specialty: '', startTool: '', kills: {} };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return fresh;
    const r = raw as Record<string, unknown>;
    const owned = Array.isArray(r.owned) ? r.owned.filter((x): x is string => typeof x === 'string') : [];
    const kills: Record<string, number> = {};
    if (r.kills && typeof r.kills === 'object') for (const [k, v] of Object.entries(r.kills as Record<string, unknown>)) kills[k] = whole(v);
    const specialty = typeof r.specialty === 'string' && owned.includes(r.specialty) ? r.specialty : '';
    const startTool = typeof r.startTool === 'string' && owned.includes('starterKit') ? r.startTool : '';
    return { credits: whole(r.credits), earned: whole(r.earned), owned, specialty, startTool, kills };
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

/** Banks a finished shift: credits and per-germ kills. */
export function recordShift(credits: number, kills: Record<string, number>): void {
  state = { ...state, credits: state.credits + credits, earned: state.earned + credits, kills: { ...state.kills } };
  for (const [id, n] of Object.entries(kills)) state.kills[id] = (state.kills[id] ?? 0) + n;
  save();
}

/** Whether a scribe has been unlocked on the Residency Board (their pill can drop). */
export function scribeUnlocked(id: ScribeId): boolean {
  return state.owned.includes(scribeUnlockId(id));
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

/** Unlocks something earned rather than bought (the Miracle Cure's 'scrubCap'). */
export function grant(id: string): void {
  if (state.owned.includes(id)) return;
  state = { ...state, owned: [...state.owned, id] };
  save();
}
