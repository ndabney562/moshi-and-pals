/**
 * Cloudflare Worker: Moshi and Pals Shared Online Leaderboard
 * Free-tier $0 constraint: Bounded payload sizes, parameterized SQL, cached GET responses.
 */

export interface Env {
  DB: D1Database;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean }>;
}

export const LEADERBOARD_NAME_LIMIT = 10;
export const VALID_MODES = new Set(['standard', 'fluSeason']);
export const VALID_DIFFICULTIES = new Set(['walkIn', 'urgent', 'trauma']);
export const VALID_PROVIDERS = new Set([
  'eugene', 'kaya', 'lucien', 'ken', 'jason',
  'dhiwya', 'raj', 'lidiya', 'dharma', 'amanda', 'janeen',
]);

const Segmenter = (Intl as typeof Intl & {
  Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => {
    segment(value: string): Iterable<{ segment: string }>;
  };
}).Segmenter;
const segmenter = Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : undefined;

export function countGraphemes(value: string): number {
  return segmenter ? Array.from(segmenter.segment(value)).length : Array.from(value).length;
}

export function validateName(value: unknown): { ok: true; name: string } | { ok: false; reason: string } {
  if (typeof value !== 'string') return { ok: false, reason: 'required' };
  if (value.length > 256) return { ok: false, reason: 'tooLong' };
  const name = value.normalize('NFC').trim();
  if (!name) return { ok: false, reason: 'required' };
  // Reject invisible/bidi/control characters
  if (/[\u0000-\u001f\u007f-\u009f\u200b\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u.test(name)) {
    return { ok: false, reason: 'invalid' };
  }
  if (countGraphemes(name) > LEADERBOARD_NAME_LIMIT) {
    return { ok: false, reason: 'tooLong' };
  }
  return { ok: true, name };
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health probe
  if (url.pathname === '/api/health') {
    return jsonResponse({ status: 'ok', service: 'moshi-leaderboard' });
  }

  // GET /api/scores - Retrieve top scores with parameterized SQL
  if (request.method === 'GET' && url.pathname === '/api/scores') {
    const mode = url.searchParams.get('mode') ?? 'standard';
    const difficulty = url.searchParams.get('difficulty') ?? 'urgent';
    const provider = url.searchParams.get('provider') ?? undefined;
    const rawLimit = Number(url.searchParams.get('limit') ?? 10);
    const limit = Math.max(1, Math.min(50, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10));

    if (!VALID_MODES.has(mode)) {
      return jsonResponse({ ok: false, error: 'Invalid mode' }, 400);
    }
    if (!VALID_DIFFICULTIES.has(difficulty)) {
      return jsonResponse({ ok: false, error: 'Invalid difficulty' }, 400);
    }
    if (provider && !VALID_PROVIDERS.has(provider)) {
      return jsonResponse({ ok: false, error: 'Invalid provider' }, 400);
    }

    try {
      let query: string;
      let params: unknown[];
      if (provider) {
        query = `SELECT id, name, score, round, mode, difficulty, provider, streak, kills, created_at
                 FROM scores
                 WHERE mode = ? AND difficulty = ? AND provider = ?
                 ORDER BY score DESC, round DESC, id ASC
                 LIMIT ?`;
        params = [mode, difficulty, provider, limit];
      } else {
        query = `SELECT id, name, score, round, mode, difficulty, provider, streak, kills, created_at
                 FROM scores
                 WHERE mode = ? AND difficulty = ?
                 ORDER BY score DESC, round DESC, id ASC
                 LIMIT ?`;
        params = [mode, difficulty, limit];
      }

      const { results } = await env.DB.prepare(query).bind(...params).all();
      return jsonResponse(
        { ok: true, scores: results },
        200,
        { 'Cache-Control': 'public, max-age=15' } // Edge cache reduces D1 reads
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error';
      return jsonResponse({ ok: false, error: msg }, 500);
    }
  }

  // POST /api/scores - Submit score with validation & parameterized SQL
  if (request.method === 'POST' && url.pathname === '/api/scores') {
    // Defense: bound body size to 2KB
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 2048) {
      return jsonResponse({ ok: false, error: 'Payload too large' }, 413);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return jsonResponse({ ok: false, error: 'Object expected' }, 400);
    }

    // 1-10 visible grapheme cluster validation
    const nameValidation = validateName(body.name);
    if (!nameValidation.ok) {
      return jsonResponse({ ok: false, error: `Invalid name: ${nameValidation.reason}` }, 400);
    }

    const score = Number(body.score);
    if (!Number.isFinite(score) || score < 0 || score > 10_000_000) {
      return jsonResponse({ ok: false, error: 'Invalid score' }, 400);
    }

    const round = Number(body.round);
    if (!Number.isFinite(round) || round < 1 || round > 9999) {
      return jsonResponse({ ok: false, error: 'Invalid round' }, 400);
    }

    const mode = typeof body.mode === 'string' && VALID_MODES.has(body.mode) ? body.mode : 'standard';
    const difficulty = typeof body.difficulty === 'string' && VALID_DIFFICULTIES.has(body.difficulty) ? body.difficulty : 'urgent';
    const provider = typeof body.provider === 'string' && VALID_PROVIDERS.has(body.provider) ? body.provider : 'eugene';
    const streak = Math.max(0, Math.floor(Number(body.streak) || 0));
    const kills = Math.max(0, Math.floor(Number(body.kills) || 0));
    const now = Date.now();

    try {
      const insert = `INSERT INTO scores (name, score, round, mode, difficulty, provider, streak, kills, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      await env.DB.prepare(insert).bind(
        nameValidation.name,
        Math.floor(score),
        Math.floor(round),
        mode,
        difficulty,
        provider,
        streak,
        kills,
        now
      ).run();

      return jsonResponse({
        ok: true,
        submitted: {
          name: nameValidation.name,
          score: Math.floor(score),
          round: Math.floor(round),
          mode,
          difficulty,
          provider,
        },
      }, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error';
      return jsonResponse({ ok: false, error: msg }, 500);
    }
  }

  return jsonResponse({ ok: false, error: 'Not Found' }, 404);
}

export default {
  fetch: handleRequest,
};
