// Client pour l'API Board Game Geek
// Basé sur la documentation de l'API XML API2 de BGG

// Types pour les données BGG
export type BGGSearchResult = {
  id: string;
  type: string; // "boardgame", "boardgameexpansion", etc.
  name: string;
  year: string | null;
};

export type BGGGameDetails = {
  id: string;
  name: string;
  description: string | null;
  year: string | null;
  image: string | null;
  thumbnail: string | null;
  minPlayers: string | null;
  maxPlayers: string | null;
  playingTime: string | null;
  minAge: string | null;
  rating: {
    average: string | null;
    bayesAverage: string | null;
    usersRated: string | null;
  };
  // Autres statistiques BGG
  statistics: {
    ratings: {
      usersRated: string | null;
      average: string | null;
      bayesAverage: string | null;
      stdDev: string | null;
      median: string | null;
    };
  };
};

// Configuration de l'API BGG
const BGG_BASE_URL = '/api/bgg';

// Fonction utilitaire pour effectuer une requête vers l'API BGG
async function fetchBGG<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams(params).toString();
  const url = `${BGG_BASE_URL}/${endpoint}?${queryParams}`;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url);

    if (response.status === 202 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }

    if (!response.ok) {
      throw new Error(`Erreur BGG API: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return text as unknown as T;
  }

  throw new Error('BGG API indisponible après plusieurs tentatives');
}

// Fonction pour parser le XML de recherche BGG
function parseBGGSearchResults(xmlString: string): BGGSearchResult[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Vérifier si le parsing a réussi
  if (xmlDoc.querySelector("parsererror")) {
    console.error("Erreur lors du parsing XML de recherche BGG");
    return [];
  }

  const results: BGGSearchResult[] = [];
  const items = xmlDoc.querySelectorAll("items > item");

  items.forEach(item => {
    const id = item.getAttribute("id") || item.getAttribute("objectid") || "";
    const type = item.getAttribute("type") || "";
    const nameElement = item.querySelector("name[type='primary']") ||
                      item.querySelector("name[sortindex='1']") ||
                      item.querySelector("name");
    const name = nameElement?.getAttribute("value") || nameElement?.textContent || "";
    const yearElement = item.querySelector("yearpublished") || item.querySelector("year");
    const year = yearElement?.getAttribute("value") || yearElement?.textContent || null;

    if (id && name) {
      results.push({
        id,
        type,
        name,
        year
      });
    }
  });

  return results;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function rankBGGSearchResults(results: BGGSearchResult[], query: string): BGGSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);

  return results
    .map((result, index) => {
      const normalizedName = normalizeSearchText(result.name);
      const rank = normalizedName === normalizedQuery
        ? 0
        : normalizedName.startsWith(normalizedQuery)
          ? 1
          : 2;
      const year = result.year ? Number.parseInt(result.year, 10) : Number.MAX_SAFE_INTEGER;

      return { result, index, rank, year };
    })
    .sort((left, right) => left.rank - right.rank || left.year - right.year || left.index - right.index)
    .map(({ result }) => result);
}

// Fonction pour parser le XML des détails d'un jeu BGG
function parseBGGGameDetails(xmlString: string): BGGGameDetails | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Vérifier si le parsing a réussi
  if (xmlDoc.querySelector("parsererror")) {
    console.error("Erreur lors du parsing XML des détails BGG");
    return null;
  }

  const item = xmlDoc.querySelector("items > item");
  if (!item) {
    console.error("Aucun élément trouvé dans la réponse XML des détails BGG");
    return null;
  }

  const id = item.getAttribute("id") || item.getAttribute("objectid") || "";
  if (!id) {
    return null;
  }

  // Récupérer le nom principal
  const nameElement = item.querySelector("name[type='primary']") ||
                     item.querySelector("name[sortindex='1']") ||
                     item.querySelector("name");
  const name = nameElement?.getAttribute("value") || nameElement?.textContent || "";

  // Récupérer la description
  const descriptionElement = item.querySelector("description");
  const description = descriptionElement ? descriptionElement.textContent || null : null;

  // Récupérer l'année
  const yearElement = item.querySelector("yearpublished") || item.querySelector("year");
  const year = yearElement?.getAttribute("value") || yearElement?.textContent || null;

  // Récupérer l'image et la miniature
  const imageElement = item.querySelector("image");
  const image = imageElement ? imageElement.textContent || null : null;

  const thumbnailElement = item.querySelector("thumbnail");
  const thumbnail = thumbnailElement ? thumbnailElement.textContent || null : null;

  // Récupérer les statistiques des joueurs
  const minPlayersElement = item.querySelector("minplayers");
  const minPlayers = minPlayersElement ? minPlayersElement.getAttribute("value") || null : null;

  const maxPlayersElement = item.querySelector("maxplayers");
  const maxPlayers = maxPlayersElement ? maxPlayersElement.getAttribute("value") || null : null;

  const playingTimeElement = item.querySelector("playingtime");
  const playingTime = playingTimeElement ? playingTimeElement.getAttribute("value") || null : null;

  const minAgeElement = item.querySelector("minage");
  const minAge = minAgeElement ? minAgeElement.getAttribute("value") || null : null;

  // Récupérer les notes
  const ratingElement = item.querySelector("statistics > ratings > average");
  const average = ratingElement ? ratingElement.getAttribute("value") || null : null;

  const bayesAverageElement = item.querySelector("statistics > ratings > bayesaverage");
  const bayesAverage = bayesAverageElement ? bayesAverageElement.getAttribute("value") || null : null;

  const usersRatedElement = item.querySelector("statistics > ratings > usersrated");
  const usersRated = usersRatedElement ? usersRatedElement.getAttribute("value") || null : null;

  // Construire l'objet de détails
  const gameDetails: BGGGameDetails = {
    id,
    name,
    description,
    year,
    image,
    thumbnail,
    minPlayers,
    maxPlayers,
    playingTime,
    minAge,
    rating: {
      average,
      bayesAverage,
      usersRated
    },
    statistics: {
      ratings: {
        usersRated,
        average,
        bayesAverage,
        stdDev: item.querySelector("statistics > ratings > stddev")?.getAttribute("value") || null,
        median: item.querySelector("statistics > ratings > median")?.getAttribute("value") || null
      }
    }
  };

  return gameDetails;
}

// Fonction pour rechercher des jeux sur BGG
export async function searchBGGGames(query: string): Promise<BGGSearchResult[]> {
  try {
    const xmlResponse = await fetchBGG<string>('search', {
      query: query,
      type: 'boardgame' // Limiter aux jeux de société
    });

    const results = parseBGGSearchResults(xmlResponse);
    return rankBGGSearchResults(results, query);
  } catch (error) {
    console.error('Erreur lors de la recherche BGG:', error);
    throw error;
  }
}

// Fonction pour obtenir les détails d'un jeu spécifique sur BGG
export async function getBGGGameDetails(gameId: string): Promise<BGGGameDetails | null> {
  try {
    const xmlResponse = await fetchBGG<string>('thing', {
      id: gameId,
      stats: '1' // Inclure les statistiques
    });

    const details = parseBGGGameDetails(xmlResponse);
    return details;
  } catch (error) {
    console.warn('BGG indisponible, utilisation du catalogue local:', error);
    return null;
  }
}

// Exportons une instance configurée
export const bggApi = {
  search: searchBGGGames,
  getDetails: getBGGGameDetails
};