import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve('.env.local')
const envVars = {}
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      envVars[key.trim()] = value.trim()
    }
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars')
  console.log('Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local or environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to parse the games txt file with debugging
function parseGamesFromTxtDebug(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')

  // Split by separator lines
  const sections = content.split(/--------------------------------------------------------------------/)

  const games = []

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed || trimmed.startsWith('Liste des') || trimmed.startsWith('Format :') ||
        trimmed.startsWith('Fin du fichier') || trimmed.startsWith('(continuer')) {
      continue
    }

    const lines = trimmed.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    if (lines.length < 1) continue

    try {
      // Parse first line: "#. Titre (année)"
      const firstLine = lines[0]
      const titleMatch = firstLine.match(/^\d+\.\s+(.+?)\s+\((\d{4})\)$/)
      if (!titleMatch) {
        console.warn(`Could not parse title line: ${firstLine}`)
        continue
      }
      const [, title, yearStr] = titleMatch
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

      // Parse subsequent lines - show debug for each line
      console.log('DEBUG: Processing lines for first section:');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()
        console.log(`  Line ${i}: '${line}'`);
        console.log(`    trimmed: '${trimmedLine}'`);

        // Check what the line starts with
        if (trimmedLine.startsWith('Concepteur(s) :')) {
          console.log('    -> Matches Concepteur(s) :');
          const parts = line.split(':')
          if (parts.length >= 2) {
            designers = parts.slice(1).join(':').trim()
            console.log(`    -> designers: '${designers}'`);
          }
        } else if (trimmedLine.startsWith('Éditeur :')) {
          console.log('    -> Matches Éditeur :');
          const parts = line.split(':')
          if (parts.length >= 2) {
            editor = parts.slice(1).join(':').trim()
            console.log(`    -> editor: '${editor}'`);
          }
        } else if (trimmedLine.startsWith('Joueurs :')) {
          console.log('    -> Matches Joueurs :');
          const parts = line.split(':')
          if (parts.length >= 2) {
            playersStr = parts.slice(1).join(':').trim()
            console.log(`    -> playersStr: '${playersStr}'`);
          }
        } else if (trimmedLine.startsWith('Âge :')) {
          console.log('    -> Matches Âge :');
          const parts = line.split(':')
          if (parts.length >= 2) {
            ageStr = parts.slice(1).join(':').trim()
            console.log(`    -> ageStr: '${ageStr}'`);
          }
        } else if (trimmedLine.startsWith('Durée :')) {
          console.log('    -> Matches Durée :');
          const parts = line.split(':')
          if (parts.length >= 2) {
            durationStr = parts.slice(1).join(':').trim()
            console.log(`    -> durationStr: '${durationStr}'`);
          }
        } else if (trimmedLine.startsWith('Mécaniques principales :')) {
          console.log('    -> Matches Mécaniques principales :');
          const parts = line.split(':')
          if (parts.length >= 2) {
            mechanics = parts.slice(1).join(':').trim()
            console.log(`    -> mechanics: '${mechanics}'`);
          }
        } else if (trimmedLine.startsWith('Objectif :')) {
          console.log('    -> Matches Objectif :');
          const parts = line.split(':')
          if (parts.length >= 2) {
            objective = parts.slice(1).join(':').trim()
            console.log(`    -> objective: '${objective}'`);
          }
        } else if (trimmedLine.startsWith('Source vérifiable :')) {
          console.log('    -> Matches Source vérifiable :');
          const parts = line.split(':')
          if (parts.length >= 2) {
            source = parts.slice(1).join(':').trim()
            console.log(`    -> source: '${source}'`);
          }
        } else {
          console.log('    -> No match');
        }
      }

      // Debug: Show extracted strings
      console.log('DEBUG: After line parsing:');
      console.log('  playersStr:', JSON.stringify(playersStr));
      console.log('  ageStr:', JSON.stringify(ageStr));
      console.log('  durationStr:', JSON.stringify(durationStr));
      console.log('  mechanics:', JSON.stringify(mechanics));
      console.log('  objective:', JSON.stringify(objective));

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

      // Debug: Show parsed numbers
      console.log('DEBUG: After number parsing:');
      console.log('  min_players:', min_players);
      console.log('  max_players:', max_players);
      console.log('  min_age:', min_age);
      console.log('  duration:', duration);

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
        // Note: year, source_url, source_name are not in the Supabase games table
        // They would need to be added to the table schema if desired
      })

    } catch (error) {
      console.warn(`Error parsing section:`, section.substring(0, 100), error)
      continue
    }
  }

  return games
}

async function insertGames() {
  const txtFilePath = path.join('..', '..', 'vs code', 'scrapping boardgamegeek', 'fiches_jeux', 'jeux_100.txt')

  console.log('Reading games from:', txtFilePath)

  if (!fs.existsSync(txtFilePath)) {
    console.error('File not found:', txtFilePath)
    // Try alternative path
    const altPath = path.join('c:', 'Users', 'pigag', 'Documents', 'vs code', 'scrapping boardgamegeek', 'fiches_jeux', 'jeux_100.txt')
    if (fs.existsSync(altPath)) {
      console.log('Using alternative path:', altPath)
      // Continue with altPath
    } else {
      console.error('Alternative path also not found:', altPath)
      process.exit(1)
    }
  }

  const games = parseGamesFromTxtDebug(txtFilePath)

  console.log(`Parsed ${games.length} games from txt file`)

  // Show first few games as preview
  console.log('\nFirst 3 games parsed:')
  games.slice(0, 3).forEach((game, index) => {
    console.log(`${index + 1}: ${game.name} (ID: ${game.id})`)
    console.log(`   Players: ${game.min_players}-${game.max_players}, Age: ${game.min_age}+, Duration: ${game.duration}min`)
    console.log(`   Category: ${game.category}`)
    console.log(`   Description: ${game.description.substring(0, 100)}...`)
  })

  console.log('\nInserting games into Supabase...')

  const { data, error, count } = await supabase
    .from('games')
    .upsert(games, { onConflict: ['id'] })
    .select()

  if (error) {
    console.error('Error inserting games:', error)
    return
  }

  console.log(`Successfully inserted/updated ${data.length} games:`)
  data.forEach(game => {
    console.log(`- ${game.name}`)
  })
}

// Run the insertion
insertGames().catch(console.error)