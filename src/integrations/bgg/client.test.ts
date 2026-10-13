// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bggDetailsToGameInput, BGGUnavailableError, getBGGGameDetails, rankBGGSearchResults, searchBGGGames } from './client';

// Réponses XML FICTIVES, construites pour tester l'analyse (structure conforme à l'API XML2 de BGG).
const SEARCH_XML = `<?xml version="1.0" encoding="utf-8"?><items total="3">
  <item type="boardgameexpansion" id="900"><name type="primary" value="Exemple : extension"/><yearpublished value="2021"/></item>
  <item type="boardgame" id="100"><name type="primary" value="Exemple"/><yearpublished value="2019"/></item>
  <item type="boardgame" id="100"><name type="alternate" value="Ejemplo"/><yearpublished value="2019"/></item>
</items>`;

const THING_XML = `<?xml version="1.0" encoding="utf-8"?><items>
  <item type="boardgame" id="100">
    <thumbnail>https://example.test/thumb.jpg</thumbnail>
    <image>https://example.test/image.jpg</image>
    <name type="primary" sortindex="1" value="Exemple"/>
    <name type="alternate" sortindex="1" value="Ejemplo"/>
    <description>Ligne 1&amp;#10;&amp;#10;L&amp;rsquo;auteur dit &amp;quot;bonjour&amp;quot;</description>
    <yearpublished value="2019"/>
    <minplayers value="2"/><maxplayers value="4"/><playingtime value="45"/><minage value="0"/>
    <link type="boardgamecategory" id="1" value="Abstrait"/>
    <link type="boardgamemechanic" id="2" value="Pose de tuiles"/>
    <link type="boardgamedesigner" id="3" value="Auteur Fictif"/>
    <link type="boardgameartist" id="4" value="(Uncredited)"/>
    <link type="boardgamepublisher" id="5" value="Éditeur A"/>
    <link type="boardgamepublisher" id="6" value="Éditeur B"/>
    <statistics><ratings><usersrated value="1234"/><average value="7.56789"/><bayesaverage value="7.1"/></ratings></statistics>
  </item>
</items>`;

const mockFetch = (status: number, body: string, contentType = 'application/xml') =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status, headers: { 'content-type': contentType } }));

afterEach(() => { vi.restoreAllMocks(); });

describe('client BoardGameGeek', () => {
  it('dédoublonne et classe les résultats : jeu de base avant extension', async () => {
    mockFetch(200, SEARCH_XML);
    const results = await searchBGGGames('exemple');
    expect(results.map((r) => r.id)).toEqual(['100', '900']);
    expect(rankBGGSearchResults(results, 'exemple')[0].type).toBe('boardgame');
  });

  it('analyse la fiche sans inventer de valeur et conserve la source', async () => {
    mockFetch(200, THING_XML);
    const details = await getBGGGameDetails('100');
    expect(details).not.toBeNull();
    expect(details!.description).toBe('Ligne 1\n\nL’auteur dit "bonjour"');
    expect(details!.artists).toEqual([]); // « (Uncredited) » n'est pas un nom
    const input = bggDetailsToGameInput(details!, '2026-10-13T10:00:00Z');
    expect(input).toMatchObject({
      id: '100', bggId: '100', name: 'Exemple', year: 2019, minPlayers: 2, maxPlayers: 4, playingTime: 45,
      minAge: null, // 0 chez BGG = non renseigné
      designers: ['Auteur Fictif'], publishers: ['Éditeur A', 'Éditeur B'], categories: ['Abstrait'], mechanics: ['Pose de tuiles'],
      isExpansion: false, rating: 7.57, ratingsCount: 1234, origin: 'bgg',
      sources: [{ name: 'BoardGameGeek', url: 'https://boardgamegeek.com/boardgame/100', retrievedAt: '2026-10-13T10:00:00Z' }],
    });
  });

  it('explique clairement un jeton manquant ou refusé', async () => {
    mockFetch(503, '{"error":"BGG_API_TOKEN est absent du serveur"}', 'application/json');
    await expect(searchBGGGames('x')).rejects.toThrow(/BGG_API_TOKEN manquant/);
    vi.restoreAllMocks();
    mockFetch(401, 'Unauthorized', 'text/plain');
    await expect(searchBGGGames('x')).rejects.toBeInstanceOf(BGGUnavailableError);
  });

  it('refuse un identifiant non numérique sans appeler BGG', async () => {
    const spy = mockFetch(200, THING_XML);
    expect(await getBGGGameDetails('catan')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
