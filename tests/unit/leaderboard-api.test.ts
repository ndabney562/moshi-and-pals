import { describe, expect, it } from 'vitest';
import {
  handleRequest,
  validateName,
  countGraphemes,
  type D1Database,
} from '../../worker/index';

function createMockDb(initialRows: any[] = []) {
  const rows = [...initialRows];
  const executed: { query: string; params: unknown[] }[] = [];

  const db: D1Database = {
    prepare(query: string) {
      let boundParams: unknown[] = [];
      return {
        bind(...params: unknown[]) {
          boundParams = params;
          return this;
        },
        async all<T = unknown>() {
          executed.push({ query, params: boundParams });
          // Filter rows if simple matching
          let result = [...rows];
          if (query.includes('WHERE')) {
            const mode = boundParams[0];
            const difficulty = boundParams[1];
            result = result.filter((r) => r.mode === mode && r.difficulty === difficulty);
            if (boundParams.length > 3) {
              const provider = boundParams[2];
              result = result.filter((r) => r.provider === provider);
            }
          }
          return { results: result as T[], success: true };
        },
        async run() {
          executed.push({ query, params: boundParams });
          if (query.includes('INSERT INTO scores')) {
            rows.push({
              name: boundParams[0],
              score: boundParams[1],
              round: boundParams[2],
              mode: boundParams[3],
              difficulty: boundParams[4],
              provider: boundParams[5],
              streak: boundParams[6],
              kills: boundParams[7],
              created_at: boundParams[8],
            });
          }
          return { success: true };
        },
      };
    },
  };

  return { db, executed, rows };
}

describe('Leaderboard Worker & API', () => {
  it('validates 1-10 player visible characters with grapheme counting', () => {
    expect(countGraphemes('ABCDEFGHIJ')).toBe(10);
    expect(validateName('ABCDEFGHIJ')).toEqual({ ok: true, name: 'ABCDEFGHIJ' });
    expect(validateName('ABCDEFGHIJK')).toEqual({ ok: false, reason: 'tooLong' });
    expect(validateName('   ')).toEqual({ ok: false, reason: 'required' });
    expect(validateName('A\u0000B')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('handles CORS OPTIONS requests', async () => {
    const { db } = createMockDb();
    const req = new Request('https://worker.test/api/scores', { method: 'OPTIONS' });
    const res = await handleRequest(req, { DB: db });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('handles GET /api/health probe', async () => {
    const { db } = createMockDb();
    const req = new Request('https://worker.test/api/health', { method: 'GET' });
    const res = await handleRequest(req, { DB: db });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok', service: 'moshi-leaderboard' });
  });

  it('POST /api/scores validates submission and executes parameterized insert', async () => {
    const { db, executed } = createMockDb();
    const payload = {
      name: 'Dr. Eugene',
      score: 12500,
      round: 6,
      mode: 'fluSeason',
      difficulty: 'urgent',
      provider: 'eugene',
      streak: 8,
      kills: 45,
    };

    const req = new Request('https://worker.test/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await handleRequest(req, { DB: db });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.submitted.name).toBe('Dr. Eugene');
    expect(body.submitted.score).toBe(12500);

    // Verify parameterized SQL was executed with bound values
    expect(executed.length).toBe(1);
    expect(executed[0].query).toContain('INSERT INTO scores');
    expect(executed[0].params[0]).toBe('Dr. Eugene');
    expect(executed[0].params[1]).toBe(12500);
    expect(executed[0].params[2]).toBe(6);
    expect(executed[0].params[3]).toBe('fluSeason');
    expect(executed[0].params[4]).toBe('urgent');
    expect(executed[0].params[5]).toBe('eugene');
  });

  it('POST /api/scores rejects invalid names, scores, or oversized payloads', async () => {
    const { db } = createMockDb();

    // Name too long
    const req1 = new Request('https://worker.test/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ThisNameIsWayTooLong123', score: 100, round: 1 }),
    });
    const res1 = await handleRequest(req1, { DB: db });
    expect(res1.status).toBe(400);

    // Negative score
    const req2 = new Request('https://worker.test/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Eugene', score: -50, round: 1 }),
    });
    const res2 = await handleRequest(req2, { DB: db });
    expect(res2.status).toBe(400);

    // Large payload (> 2048 bytes)
    const req3 = new Request('https://worker.test/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '3000' },
      body: JSON.stringify({ name: 'Eugene', score: 100, round: 1 }),
    });
    const res3 = await handleRequest(req3, { DB: db });
    expect(res3.status).toBe(413);
  });

  it('GET /api/scores retrieves scores with parameterized filtering and edge cache header', async () => {
    const sample = [
      { name: 'Player1', score: 9000, round: 8, mode: 'standard', difficulty: 'urgent', provider: 'eugene' },
      { name: 'Player2', score: 8500, round: 7, mode: 'standard', difficulty: 'urgent', provider: 'kaya' },
      { name: 'Player3', score: 7000, round: 5, mode: 'fluSeason', difficulty: 'urgent', provider: 'eugene' },
    ];
    const { db, executed } = createMockDb(sample);

    const req = new Request('https://worker.test/api/scores?mode=standard&difficulty=urgent&limit=5', {
      method: 'GET',
    });

    const res = await handleRequest(req, { DB: db });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=15');

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scores.length).toBe(2);
    expect(executed[0].query).toContain('WHERE mode = ? AND difficulty = ?');
    expect(executed[0].params[0]).toBe('standard');
    expect(executed[0].params[1]).toBe('urgent');
  });
});
