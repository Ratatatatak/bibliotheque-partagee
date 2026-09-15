import fs from 'fs'
import path from 'path'

const filePath = path.join('..', '..', 'vs code', 'scrapping boardgamegeek', 'fiches_jeux', 'jeux_100.txt')

// Function to parse the games txt file
function parseGamesFromTxt(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')

  // Split by separator lines
  const sections = content.split(/--------------------------------------------------------------------/)

  const games = []

  // Process each section (skip first and last which are header/footer)
  for (let s = 1; s < sections.length - 1; s++) {
    const section = sections[s].trim()
    if (!section) continue

    // Split into lines and process each game in the section
    // Each section may contain multiple games separated by double newlines
    const gameBlocks = section.split('\n\n')

    for (const block of gameBlocks) {
      const trimmedBlock = block.trim()
      if (!trimmedBlock || trimmedBlock.startsWith('Liste des') ||
          trimmedBlock.startsWith('Format :') || trimmedBlock.startsWith('Fin du fichier') ||
          trimmedBlock.startsWith('(continuer')) {
        continue
      }

      try {
        const lines = trimmedBlock.split('\n').map(line => line.trim()).filter(line => line.length > 0)

        if (lines.length < 1) continue

        // Parse first line: "#. Titre (année)"
        const firstLine = lines[0]
        const titleMatch = firstLine.match(/^(\d+)\.\s+(.+?)\s+\((\d{4})\)$/)
        if (!titleMatch) {
          continue
        }
        const [, , title, yearStr] = titleMatch
        const year = parseInt(yearStr, 10)

        // Initialize fields with defaults
        let designers = ''
        let editor = ''
        let playersStr = ''
        let ageStr = ''
        let durationStr = ''
        let mechanics = ''
        let objective = ''
        let source = ''

        // Parse subsequent lines
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]
          if (/^Concepteur\(s\)\s*[:‑]\s*/u.test(line)) {
            const parts = line.split(/[:‑]/)
            if (parts.length >= 2) {
              designers = parts.slice(1).join(':').trim()
            }
          } else if (/^Éditeur\s*[:‑]\s*/u.test(line)) {
            const parts = line.split(/[:‑]/)
            if (parts.length >= 2) {
              editor = parts.slice(1).join(':').trim()
            }
          } else if (/^Joueurs\s*[:‑]\s*/u.test(line)) {
            const parts = line.split(/[:‑]/)
            if (parts.length >= 2) {
              playersStr = parts.slice(1).join(':').trim()
            }
          } else if (/^Âge\s*[:‑]\s*/u.test(line)) {
            const parts = line.split(/[:‑]/)
            if (parts.length >= 2) {
              ageStr = parts.slice(1).join(':').trim()
            }
          } else if (/^Durée\s*[:‑]\s*/u.test(line)) {
            const parts = line.split(/[:‑]/)
            if (parts.length >= 2) {
              durationStr = parts.slice(1).join(':').trim()
            }
          } else if (/^Mécaniques\s+principales\s*[:‑]\s*/u.test(line)) {
            const parts = line.split(/[:‑]/)
            if (parts.length >= 2) {
              mechanics = parts.slice(1).join(':').trim()
            }
          } else if (/^Objectif\s*[:‑]\s*/u.test(line)) {
            const parts = line.split(/[:‑]/)
            if (parts.length >= 2) {
              objective = parts.slice(1).join(':').trim()
            }
          } else if (/^Source\s+vérifiable\s*[:‑]\s*/u.test(line)) {
            const parts = line.split(/[:‑]/)
            if (parts.length >= 2) {
              source = parts.slice(1).join(':').trim()
            }
          }
        }

        // Parse players: extract all numbers
        let min_players = 1
        let max_players = 1
        const playerNumbers = playersStr.match(/\d+/g)
        if (playerNumbers) {
          const numbers = playerNumbers.map(n => parseInt(n, 10))
          if (numbers.length >= 1) {
            min_players = numbers[0]
            max_players = numbers.length >= 2 ? numbers[1] : numbers[0]
          }
        }

        // Parse age: extract first number
        let min_age = 0
        const ageNumbers = ageStr.match(/\d+/g)
        if (ageNumbers && ageNumbers.length > 0) {
          min_age = parseInt(ageNumbers[0], 10)
        }

        // Parse duration: extract numbers and compute average if multiple
        let duration = 0
        const durationNumbers = durationStr.match(/\d+/g)
        if (durationNumbers) {
          const numbers = durationNumbers.map(n => parseInt(n, 10))
          if (numbers.length === 1) {
            duration = numbers[0]
          } else if (numbers.length >= 2) {
            // Take average of first two numbers
            duration = Math.round((numbers[0] + numbers[1]) / 2)
          }
        }

        // Generate ID from title: convert to kebab-case, remove special characters
        let id = title.toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special chars
          .replace(/\s+/g, '-')     // Replace spaces with hyphens
          .replace(/--+/g, '-')     // Replace multiple hyphens with single
          .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens

        // Truncate ID if too long (though unlikely)
        if (id.length > 50) {
          id = id.substring(0, 50)
        }

        // Determine description: combine objective and mechanics
        let description = objective
        if (mechanics && description) {
          description += ` ${mechanics}`
        } else if (mechanics && !description) {
          description = mechanics
        }

        // Determine category based on mechanics or leave empty for now
        let category = ''
        if (mechanics) {
          const lowerMechanics = mechanics.toLowerCase()
          if (lowerMechanics.includes('stratégie') || lowerMechanics.includes('strategy')) {
            category = 'Stratégie'
          } else if (lowerMechanics.includes('famille') || lowerMechanics.includes('family')) {
            category = 'Famille'
          } else if (lowerMechanics.includes('ambiance') || lowerMechanics.includes('party') || lowerMechanics.includes('ambiance')) {
            category = 'Ambiance'
          } else if (lowerMechanics.includes('réflexion') || lowerMechanics.includes('reflection')) {
            category = 'Réflexion'
          } else if (lowerMechanics.includes('coopératif') || lowerMechanics.includes('cooperative') || lowerMechanics.includes('coopération')) {
            category = 'Coopératif'
          } else if (lowerMechanics.includes('cartes') || lowerMechanics.includes('card')) {
            category = 'Cartes'
          } else if (lowerMechanics.includes('aventure') || lowerMechanics.includes('adventure')) {
            category = 'Aventure'
          } else if (lowerMechanics.includes('enquête') || lowerMechanics.includes('investigation')) {
            category = 'Enquête'
          } else {
            // Default to first word or empty
            category = ''
          }
        }

        // Image URL: not available in txt file, set to null
        const image_url = null

        // Source URL: extract if it's a URL
        let source_url = null
        let source_name = null
        if (source && (source.startsWith('http') || source.startsWith('www'))) {
          source_url = source
          // Try to extract source name from URL
          try {
            const urlObj = new URL(source.startsWith('http') ? source : `http://${source}`)
            source_name = urlObj.hostname.replace('www.', '')
          } catch (e) {
            source_name = source.substring(0, 50) // Fallback
          }
        } else if (source && source !== 'À compléter avec source vérifiable') {
          source_name = source.substring(0, 100) // Limit length
        }

        games.push({
          id,
          name: title,
          description: description || 'Description non disponible',
          image_url,
          min_players,
          max_players,
          duration: duration || 0, // Default to 0 if parsing failed
          min_age,
          category: category || 'Autre', // Default category
        })

      } catch (error) {
        // Silently skip problematic blocks
        continue
      }
    }
  }

  return games
}

const games = parseGamesFromTxt(filePath)
console.log(`Total games parsed: ${games.length}`)

// Show first 5 games
console.log('\nFirst 5 games:')
games.slice(0, 5).forEach((game, index) => {
  console.log(`${index + 1}: ${game.name}`)
  console.log(`   ID: ${game.id}`)
  console.log(`   Players: ${game.min_players}-${game.max_players}`)
  console.log(`   Age: ${game.min_age}+`)
  console.log(`   Duration: ${game.duration}min`)
  console.log(`   Category: ${game.category}`)
  console.log()
})

// Show last 5 games
console.log('Last 5 games:')
games.slice(-5).forEach((game, index) => {
  const actualIndex = games.length - 5 + index
  console.log(`${actualIndex + 1}: ${game.name}`)
  console.log(`   ID: ${game.id}`)
  console.log(`   Players: ${game.min_players}-${game.max_players}`)
  console.log(`   Age: ${game.min_age}+`)
  console.log(`   Duration: ${game.duration}min`)
  console.log(`   Category: ${game.category}`)
  console.log()
})