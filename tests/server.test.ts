import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bgg from '../api/bgg/[...path]';
import keepalive from '../api/cron/keepalive';

type Res = { statusCode: number; headers: Record<string, string>; body: string; setHeader(n: string, v: string): void; end(b?: string): void };
const res = (): Res => ({ statusCode: 0, headers: {}, body: '', setHeader(n, v) { this.headers[n] = v; }, end(b = '') { this.body = b; } });

describe('fonctions serveur', () => {
  beforeEach(() => {
    process.env.BGG_API_TOKEN = 'jeton-bgg';
    process.env.VITE_SUPABASE_URL = 'https://exemple.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'cle-publique';
  });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.CRON_SECRET; });

  it('le relais BGG refuse un visiteur non connecté sans appeler BGG', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const r = res();
    await bgg({ url: '/api/bgg/search?query=azul', headers: {} }, r);
    expect(r.statusCode).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('le relais BGG accepte un membre dont la session est valide', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return new Response('{"id":"x"}', { status: 200 });
      return new Response('<items total="1"/>', { status: 200, headers: { 'content-type': 'text/xml' } });
    });
    const r = res();
    await bgg({ url: '/api/bgg/search?query=azul', headers: { authorization: 'Bearer session-valide' } }, r);
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('items');
    expect(String(spy.mock.calls[1][0])).toBe('https://boardgamegeek.com/xmlapi2/search?query=azul');
  });

  it('le relais BGG refuse une session invalide et les autres points d’accès', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const r = res();
    await bgg({ url: '/api/bgg/search?query=azul', headers: { authorization: 'Bearer faux' } }, r);
    expect(r.statusCode).toBe(401);
    const r2 = res();
    await bgg({ url: '/api/bgg/plays?username=x', headers: {} }, r2);
    expect(r2.statusCode).toBe(404);
  });

  it('la tâche quotidienne interroge la base et respecte le secret', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));
    const r = res();
    await keepalive({ url: '/api/cron/keepalive', headers: {} }, r);
    expect(r.statusCode).toBe(200);
    expect(String(spy.mock.calls[0][0])).toContain('/rest/v1/games');
    process.env.CRON_SECRET = 'secret';
    const r2 = res();
    await keepalive({ url: '/api/cron/keepalive', headers: { authorization: 'Bearer autre' } }, r2);
    expect(r2.statusCode).toBe(401);
  });
});
