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

// Function to parse the games txt file
function parseGamesFromTxt(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')

  // Split by separator lines
  const sections = content.split(/--------------------------------------------------------------------/)

  // We expect exactly 3 sections: [header, all games, footer]
  if (sections.length < 3) {
    console.error('Unexpected file format: expected 3 sections')
    return []
  }

  const allGamesSection = sections[1].trim()

  // Split into lines
  const lines = allGamesSection.split('\n').map(line => line.trim())

  const games = []
  let currentGameLines = []

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip empty lines
    if (line.length === 0) {
      // If we have accumulated lines for a game, process it
      if (currentGameLines.length > 0) {
        const game = parseGameLines(currentGameLines)
        if (game) {
          games.push(game)
        }
        currentGameLines = []
      }
      continue
    }

    // Check if this line starts a new game: "1. Title (year)"
    if (/^\d+\.\s+.+\s+\(\d{4}\)$/.test(line)) {
      // If we have accumulated lines for a previous game, process it
      if (currentGameLines.length > 0) {
        const game = parseGameLines(currentGameLines)
        if (game) {
          games.push(game)
        }
      }
      // Start new game with this line
      currentGameLines = [line]
    } else {
      // Add line to current game
      currentGameLines.push(line)
    }
  }

  // Don't forget the last game
  if (currentGameLines.length > 0) {
    const game = parseGameLines(currentGameLines)
    if (game) {
      games.push(game)
    }
  }

  return games
}

// Helper function to parse lines of a single game
function parseGameLines(lines) {
  if (lines.length === 0) return null

  // Parse first line: "#. Titre (année)"
  const firstLine = lines[0]
  const titleMatch = firstLine.match(/^(\d+)\.\s+(.+?)\s+\((\d{4})\)$/)
  if (!titleMatch) {
    return null
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

  return {
    id,
    name: title,
    description: description || 'Description non disponible',
    image_url,
    min_players,
    max_players,
    duration: duration || 0, // Default to 0 if parsing failed
    min_age,
    category: category || 'Autre', // Default category
  }
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

  const games = parseGamesFromTxt(txtFilePath)

  console.log(`Parsed ${games.length} games from txt file`)

  if (games.length === 0) {
    console.error('No games parsed - check file format')
    return
  }

  // Show first few games as preview
  console.log('\nFirst 3 games parsed:')
  games.slice(0, 3).forEach((game, index) => {
    console.log(`${index + 1}: ${game.name} (ID: ${game.id})`)
    console.log(`   Players: ${game.min_players}-${game.max_players}, Age: ${game.min_age}+, Duration: ${game.duration}min`)
    console.log(`   Category: ${game.category}`)
    console.log(`   Description: ${game.description.substring(0, 100)}...`)
  })

  console.log('\nInserting games into Supabase...')

  try {
    const { data, error } = await supabase
      .from('games')
      .upsert(games, { onConflict: ['id'] })

    if (error) {
      throw error
    }

    console.log(`Successfully inserted/updated ${data.length} games`)

    // Show a sample of inserted games
    if (data.length > 0) {
      console.log('\nSample of inserted games:')
      data.slice(0, Math.min(5, data.length)).forEach(game => {
        console.log(`- ${game.name}`)
      })
    }
  } catch (error) {
    console.error('Error inserting games:', error)
    // If it's an RLS error, provide helpful guidance
    if (error.code === '42501') {
      console.error('\nRow Level Security (RLS) is preventing insertion.')
      console.error('To fix this, you can:')
      console.error('1. Temporarily disable RLS for testing (run in Supabase SQL editor):')
      console.error('   ALTER TABLE games DISABLE ROW LEVEL SECURITY;')
      console.error('2. Or create a policy that allows insertions:')
      console.error('   CREATE POLICY "Allow inserts" ON games FOR INSERT WITH CHECK (true);')
      console.error('3. Or use the service_role key instead of anon key in your .env.local')
    }
    return
  }
}

// Run the insertion
insertGames().catch(console.error)