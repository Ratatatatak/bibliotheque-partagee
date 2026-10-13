// Direct test of BGG API using fetch
const BGG_BASE_URL = 'https://www.boardgamegeek.com/xmlapi2';

// Function to fetch from BGG API
async function fetchBGG(endpoint, params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const url = `${BGG_BASE_URL}/${endpoint}?${queryParams}`;

  // Respect BGG rate limit (5 seconds between requests)
  // For testing, we'll just make the request
  // In production, proper rate limiting should be implemented

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'BibliothequePartagee/1.0 (https://github.com/pigag/bibliotheque-partagee; contact@example.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`BGG API Error: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

// Function to parse search results from XML
function parseBGGSearchResults(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Check if parsing succeeded
  if (xmlDoc.querySelector("parsererror")) {
    console.error("Error parsing BGG search XML");
    return [];
  }

  const results = [];
  const items = xmlDoc.querySelectorAll("items > item");

  items.forEach(item => {
    const id = item.getAttribute("objectid") || "";
    const type = item.getAttribute("type") || "";
    const nameElement = item.querySelector("name[type='primary']") ||
                      item.querySelector("name[sortindex='1']") ||
                      item.querySelector("name");
    const name = nameElement ? nameElement.textContent || "" : "";
    const yearElement = item.querySelector("year");
    const year = yearElement ? yearElement.textContent || null : null;

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

// Function to parse game details from XML
function parseBGGGameDetails(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Check if parsing succeeded
  if (xmlDoc.querySelector("parsererror")) {
    console.error("Error parsing BGG game details XML");
    return null;
  }

  const item = xmlDoc.querySelector("items > item");
  if (!item) {
    console.error("No item found in BGG game details response");
    return null;
  }

  const id = item.getAttribute("objectid") || "";
  if (!id) {
    return null;
  }

  // Get primary name
  const nameElement = item.querySelector("name[type='primary']") ||
                     item.querySelector("name[sortindex='1']") ||
                     item.querySelector("name");
  const name = nameElement ? nameElement.textContent || "" : "";

  // Get description
  const descriptionElement = item.querySelector("description");
  const description = descriptionElement ? descriptionElement.textContent || null : null;

  // Get year
  const yearElement = item.querySelector("year");
  const year = yearElement ? yearElement.textContent || null : null;

  // Get image and thumbnail
  const imageElement = item.querySelector("image");
  const image = imageElement ? imageElement.textContent || null : null;

  const thumbnailElement = item.querySelector("thumbnail");
  const thumbnail = thumbnailElement ? thumbnailElement.textContent || null : null;

  // Get player stats
  const minPlayersElement = item.querySelector("minplayers");
  const minPlayers = minPlayersElement ? minPlayersElement.getAttribute("value") || null : null;

  const maxPlayersElement = item.querySelector("maxplayers");
  const maxPlayers = maxPlayersElement ? maxPlayersElement.getAttribute("value") || null : null;

  const playingTimeElement = item.querySelector("playingtime");
  const playingTime = playingTimeElement ? playingTimeElement.getAttribute("value") || null : null;

  const minAgeElement = item.querySelector("minage");
  const minAge = minAgeElement ? minAgeElement.getAttribute("value") || null : null;

  // Get ratings
  const ratingElement = item.querySelector("statistics > ratings > average");
  const average = ratingElement ? ratingElement.getAttribute("value") || null : null;

  const bayesAverageElement = item.querySelector("statistics > ratings > bayesaverage");
  const bayesAverage = bayesAverageElement ? bayesAverageElement.getAttribute("value") || null : null;

  const usersRatedElement = item.querySelector("statistics > ratings > usersrated");
  const usersRated = usersRatedElement ? usersRatedElement.getAttribute("value") || null : null;

  // Build game details object
  const gameDetails = {
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

// Test function
async function testBGGApiDirect() {
  console.log('Testing BGG API directly...\n');

  // Test 1: Search for "Catan"
  console.log('Test 1: Searching for "Catan"...');
  try {
    const xmlResponse = await fetchBGG('search', {
      query: 'Catan',
      type: 'boardgame'
    });

    const results = parseBGGSearchResults(xmlResponse);
    console.log(`Found ${results.length} results`);

    if (results.length > 0) {
      const firstResult = results[0];
      console.log(`First result: ${firstResult.name} (ID: ${firstResult.id}, Type: ${firstResult.type})`);

      // Test 2: Get details for first result
      console.log('\nTest 2: Getting details for first result...');
      try {
        const detailsXml = await fetchBGG('thing', {
          id: firstResult.id,
          stats: '1'
        });

        const gameDetails = parseBGGGameDetails(detailsXml);

        if (gameDetails) {
          console.log('Successfully retrieved game details:');
          console.log(`  Name: ${gameDetails.name}`);
          console.log(`  Year: ${gameDetails.year}`);
          console.log(`  Min Players: ${gameDetails.minPlayers}`);
          console.log(`  Max Players: ${gameDetails.maxPlayers}`);
          console.log(`  Playing Time: ${gameDetails.playingTime}`);
          console.log(`  Min Age: ${gameDetails.minAge}`);
          console.log(`  Rating Average: ${gameDetails.rating.average}`);
          console.log(`  Rating Bayes Average: ${gameDetails.rating.bayesAverage}`);
          console.log(`  Users Rated: ${gameDetails.rating.usersRated}`);
          console.log(`  Has Image: ${!!gameDetails.image}`);
          console.log(`  Has Thumbnail: ${!!gameDetails.thumbnail}`);

          // Verify essential fields
          if (!gameDetails.name || !gameDetails.id) {
            console.error('ERROR: Essential fields missing!');
            return false;
          }

          console.log('\n✓ Test 2 passed: Game details retrieved successfully');
        } else {
          console.error('ERROR: Failed to parse game details');
          return false;
        }
      } catch (error) {
        console.error('ERROR in Test 2:', error.message);
        return false;
      }
    } else {
      console.error('ERROR: No search results found for "Catan"');
      return false;
    }
  } catch (error) {
    console.error('ERROR in Test 1:', error.message);
    return false;
  }

  // Test 3: Test with known Catan ID (13)
  console.log('\nTest 3: Getting details for known game ID 13 (Catan)...');
  try {
    const detailsXml = await fetchBGG('thing', {
      id: '13',
      stats: '1'
    });

    const catanDetails = parseBGGGameDetails(detailsXml);

    if (catanDetails) {
      console.log('Successfully retrieved Catan details:');
      console.log(`  Name: ${catanDetails.name}`);
      console.log(`  Year: ${catanDetails.year}`);
      console.log(`  Rating: ${catanDetails.rating.average}`);

      // Verify it's actually Catan
      if (catanDetails.name && catanDetails.name.toLowerCase().includes('catan')) {
        console.log('\n✓ Test 3 passed: Correctly retrieved Catan details');
      } else {
        console.error('ERROR: Retrieved game does not appear to be Catan');
        console.log(`  Got: ${catanDetails.name}`);
        return false;
      }
    } else {
      console.error('ERROR: Failed to retrieve Catan details');
      return false;
    }
  } catch (error) {
    console.error('ERROR in Test 3:', error.message);
    return false;
  }

  // Test 4: Test error handling with invalid ID
  console.log('\nTest 4: Testing error handling with invalid ID...');
  try {
    const detailsXml = await fetchBGG('thing', {
      id: '999999999', // Non-existent ID
      stats: '1'
    });

    const invalidDetails = parseBGGGameDetails(detailsXml);

    if (invalidDetails === null) {
      console.log('\n✓ Test 4 passed: Correctly returned null for invalid ID');
    } else {
      console.error('ERROR: Should have returned null for invalid ID');
      console.log(`  Got: ${invalidDetails.name}`);
      return false;
    }
  } catch (error) {
    // Some implementations might throw an error for invalid ID
    console.log('Note: API threw an error for invalid ID (this is also acceptable):', error.message);
    console.log('\n✓ Test 4 passed: Error handling working correctly');
  }

  console.log('\n🎉 All BGG API direct tests completed successfully!');
  return true;
}

// Run the test
testBGGApiDirect()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });