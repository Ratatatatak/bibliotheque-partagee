import { bggService } from './src/lib/bggService';

// Test function to verify BGG API functionality
async function testBGGApi() {
  console.log('Testing BGG API functionality...\n');

  // Test 1: Search for a known game
  console.log('Test 1: Searching for "Catan"...');
  try {
    const searchResults = await bggService.search('Catan');
    console.log(`Found ${searchResults.length} results`);

    if (searchResults.length > 0) {
      const firstResult = searchResults[0];
      console.log(`First result: ${firstResult.name} (ID: ${firstResult.id}, Type: ${firstResult.type})`);

      // Test 2: Get details for the first result
      console.log('\nTest 2: Getting details for the first result...');
      try {
        const gameDetails = await bggService.getDetails(firstResult.id);

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

          // Verify essential fields are present
          if (!gameDetails.name || !gameDetails.id) {
            console.error('ERROR: Essential fields missing!');
            return false;
          }

          console.log('\n✓ Test 2 passed: Game details retrieved successfully');
        } else {
          console.error('ERROR: Failed to retrieve game details');
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

  // Test 3: Test with a known game ID (Catan is 13)
  console.log('\nTest 3: Getting details for known game ID 13 (Catan)...');
  try {
    const catanDetails = await bggService.getDetails('13');

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
    const invalidDetails = await bggService.getDetails('999999999'); // Non-existent ID

    if (invalidDetails === null) {
      console.log('\n✓ Test 4 passed: Correctly returned null for invalid ID');
    } else {
      console.error('ERROR: Should have returned null for invalid ID');
      return false;
    }
  } catch (error) {
    // Some implementations might throw an error instead of returning null
    console.log('Note: API threw an error for invalid ID (this is also acceptable):', error.message);
    console.log('\n✓ Test 4 passed: Error handling working correctly');
  }

  console.log('\n🎉 All BGG API tests completed successfully!');
  return true;
}

// Run the test
testBGGApi()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });