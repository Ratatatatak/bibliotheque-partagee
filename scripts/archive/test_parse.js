const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\pigag\\Documents\\vs code\\scrapping boardgamegeek\\fiches_jeux\\jeux_100.txt';
const content = fs.readFileSync(filePath, 'utf8');

const sections = content.split(/--------------------------------------------------------------------/);
console.log('Number of sections:', sections.length);

if (sections.length > 2) {
  const firstGameSection = sections[2].trim(); // Skip header sections
  console.log('First game section:');
  console.log(firstGameSection.substring(0, 200) + '...');

  const lines = firstGameSection.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('\nLines:');
  lines.forEach((line, idx) => {
    console.log(`${idx}: '${line}'`);
  });

  if (lines.length > 0) {
    const firstLine = lines[0];
    console.log(`\nFirst line: '${firstLine}'`);
    const titleMatch = firstLine.match(/^\\d+\\.\\s+(.+?)\\s+\\((\\d{4})\\)$/);
    if (titleMatch) {
      const [, title, yearStr] = titleMatch;
      console.log(`Title: '${title}', Year: ${yearStr}`);
    }

    // Show specific field lines
    const playersLine = lines.find(l => l.startsWith('Joueurs :'));
    const ageLine = lines.find(l => l.startsWith('Âge :'));
    const durationLine = lines.find(l => l.startsWith('Durée :'));

    console.log(`\nPlayers line: '${playersLine}'`);
    console.log(`Age line: '${ageLine}'`);
    console.log(`Duration line: '${durationLine}'`);

    if (playersLine) {
      const playersStr = playersLine.split(':')[1].trim();
      console.log(`PlayersStr: '${playersStr}'`);
      const playerNumbers = playersStr.match(/\d+/g);
      console.log(`Player numbers:`, playerNumbers);
      if (playerNumbers) {
        const numbers = playerNumbers.map(n => parseInt(n, 10));
        console.log(`Parsed numbers:`, numbers);
        console.log(`Min: ${numbers[0]}, Max: ${numbers.length >= 2 ? numbers[1] : numbers[0]}`);
      }
    }

    if (ageLine) {
      const ageStr = ageLine.split(':')[1].trim();
      console.log(`\nAgeStr: '${ageStr}'`);
      const ageNumbers = ageStr.match(/\d+/g);
      console.log(`Age numbers:`, ageNumbers);
      if (ageNumbers && ageNumbers.length > 0) {
        console.log(`Min age: ${parseInt(ageNumbers[0], 10)}`);
      }
    }

    if (durationLine) {
      const durationStr = durationLine.split(':')[1].trim();
      console.log(`\nDurationStr: '${durationStr}'`);
      const durationNumbers = durationStr.match(/\d+/g);
      console.log(`Duration numbers:`, durationNumbers);
      if (durationNumbers) {
        const numbers = durationNumbers.map(n => parseInt(n, 10));
        console.log(`Parsed numbers:`, numbers);
        if (numbers.length === 1) {
          console.log(`Duration: ${numbers[0]}`);
        } else if (numbers.length >= 2) {
          const avg = Math.round((numbers[0] + numbers[1]) / 2);
          console.log(`Average duration: ${avg}`);
        }
      }
    }
  }
}