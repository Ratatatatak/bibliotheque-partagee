import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

/**
 * Import games from a text file into Supabase games table
 *
 * This script parses a formatted text file containing game information and
 * inserts/updates the records in the Supabase games table.
 *
 * Expected text file format:
 * - Separator lines: "--------------------------------------------------------------------"
 * - Each game starts with a line like: "1. Game Title (Year)"
 * - Followed by fields like:
 *   Concepteur(s) : ...
 *   Éditeur : ...
 *   Joueurs : ...
 *   Âge : ...
 *   Durée : ...
 *   Mécaniques principales : ...
 *   Objectif : ...
 *   Source vérifiable : [URL] or "À compléter avec source vérifiable"
 */

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
  console.error('Missing Supabase credentials in .env.local or environment variables')
  console.log('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Parse the games text file and return an array of game objects
 * @param {string} filePath - Path to the text file
 * @returns {Array} Array of game objects ready for insertion
 */
function parseGamesFromTxt(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')

  // Split by separator lines to isolate the games section
  const sections = content.split(/--------------------------------------------------------------------/)

  // Validate file structure: [header, all games, footer]
  if (sections.length < 3) {
    throw new Error('Unexpected file format: expected header, games, and footer sections separated by "------" lines')
  }

  const allGamesSection = sections[1].trim()

  // Split into lines for processing
  const lines = allGamesSection.split('\n').map(line => line.trim())

  const games = []
  let currentGameLines = []

  // Process each line to build game blocks
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip empty lines but use them to delimit games
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

    // Check if this line starts a new game: "Number. Title (Year)"
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
      // Add line to current game being built
      currentGameLines.push(line)
    }
  }

  // Don't forget the last game if the file doesn't end with a blank line
  if (currentGameLines.length > 0) {
    const game = parseGameLines(currentGameLines)
    if (game) {
      games.push(game)
    }
  }

  return games
}

/**
 * Parse lines representing a single game into a game object
 * @param {Array<string>} lines - Lines of text for one game
 * @returns {Object|null} Game object or null if parsing failed
 */
function parseGameLines(lines) {
  if (lines.length === 0) return null

  // Parse first line: "#. Titre (année)"
  // Example: "1. Brass: Birmingham (2018)"
  const firstLine = lines[0]
  const titleMatch = firstLine.match(/^(\d+)\.\s+(.+?)\s+\((\d{4})\)$/)
  if (!titleMatch) {
    // Skip lines that don't match the game header pattern
    return null
  }
  const [, , title, yearStr] = titleMatch
  const year = parseInt(yearStr, 10)

  // Initialize fields with default empty values
  let designers = ''
  let editor = ''
  let playersStr = ''
  let ageStr = ''
  let durationStr = ''
  let mechanics = ''
  let objective = ''
  let source = ''

  // Parse subsequent lines for each field
  // Using Unicode-aware regex to handle various dash types and spacing
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

  // Parse players field: extract all numbers (e.g., "2‑4" -> [2, 4])
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

  // Parse age field: extract first number (e.g., "14+" -> 14)
  let min_age = 0
  const ageNumbers = ageStr.match(/\d+/g)
  if (ageNumbers && ageNumbers.length > 0) {
    min_age = parseInt(ageNumbers[0], 10)
  }

  // Parse duration field: extract numbers and compute average if range (e.g., "60‑120 min" -> 90)
  let duration = 0
  const durationNumbers = durationStr.match(/\d+/g)
  if (durationNumbers) {
    const numbers = durationNumbers.map(n => parseInt(n, 10))
    if (numbers.length === 1) {
      duration = numbers[0]
    } else if (numbers.length >= 2) {
      // Take average of first two numbers for duration ranges
      duration = Math.round((numbers[0] + numbers[1]) / 2)
    }
  }

  // Generate ID from title: convert to kebab-case, remove special characters
  let id = title.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters (keep letters, numbers, spaces, hyphens)
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens

  // Truncate ID if too long (though unlikely with game titles)
  if (id.length > 50) {
    id = id.substring(0, 50)
  }

  // Determine description: combine objective and mechanics if both exist
  let description = objective
  if (mechanics && description) {
    description += ` ${mechanics}`
  } else if (mechanics && !description) {
    description = mechanics
  }

  // Determine category based on keywords in mechanics
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
      // Default category for games that don't match known types
      category = ''
    }
  }

  // Image URL: not available in source text file
  const image_url = null

  // Source URL: extract if it's a valid URL
  let source_url = null
  let source_name = null
  if (source && (source.startsWith('http') || source.startsWith('www'))) {
    source_url = source
    // Try to extract a clean source name from the URL
    try {
      const urlObj = new URL(source.startsWith('http') ? source : `http://${source}`)
      source_name = urlObj.hostname.replace('www.', '')
    } catch (e) {
      // Fallback to truncating the source if URL parsing fails
      source_name = source.substring(0, 50)
    }
  } else if (source && source !== 'À compléter avec source vérifiable') {
    // Use the source text directly if it's not a URL and not the placeholder
    source_name = source.substring(0, 100) // Limit length to prevent overly long values
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

/**
 * Main function to import games into Supabase
 */
async function importGames() {
  // Construct path to the games text file
  const txtFilePath = path.join('..', '..', 'vs code', 'scrapping boardgamegeek', 'fiches_jeux', 'jeux_100.txt')

  console.log('📖 Reading games from:', txtFilePath)

  // Verify the file exists
  if (!fs.existsSync(txtFilePath)) {
    console.error('❌ File not found:', txtFilePath)
    // Try alternative absolute path
    const altPath = path.join('c:', 'Users', 'pigag', 'Documents', 'vs code', 'scrapping boardgamegeek', 'fiches_jeux', 'jeux_100.txt')
    if (fs.existsSync(altPath)) {
      console.log('🔄 Using alternative path:', altPath)
      // Continue with altPath
    } else {
      console.error('❌ Alternative path also not found:', altPath)
      process.exit(1)
    }
  }

  // Parse the text file into game objects
  const games = parseGamesFromTxt(txtFilePath)

  console.log(`✅ Successfully parsed ${games.length} games from the text file`)

  if (games.length === 0) {
    console.error('❌ No valid games were parsed - please check the file format')
    return
  }

  // Show preview of first 3 games
  console.log('\n📋 Preview of first 3 games to be imported:')
  games.slice(0, 3).forEach((game, index) => {
    console.log(`  ${index + 1}. ${game.name}`)
    console.log(`     ID: ${game.id}`)
    console.log(`     Players: ${game.min_players}-${game.max_players}`)
    console.log(`     Age: ${game.min_album}+`)
    console.log(`     Duration: ${game.duration} minutes`)
    console.log(`     Category: ${game.category || 'Autre'}`)
    console.log(`     Description: ${game.description.substring(0, 100)}...`)
    console.log()
  })

  // Insert games into Supabase
  console.log('🚀 Inserting games into Supabase database...')

  try {
    const { data, error } = await supabase
      .from('games')
      .upsert(games, { onConflict: ['id'] })

    if (error) {
      throw error
    }

    console.log(`✅ Successfully inserted/updated ${data.length} games in the database`)

    // Show confirmation of inserted games
    if (data.length > 0) {
      console.log('\n🎮 Sample of games now in database:')
      data.slice(0, Math.min(5, data.length)).forEach(game => {
        console.log(`  - ${game.name}`)
      })
    }

  } catch (error) {
    console.error('❌ Failed to insert games into Supabase:')
    console.error('   Code:', error.code)
    console.error('   Message:', error.message)

    // Provide specific guidance for Row Level Security errors
    if (error.code === '42501') {
      console.error('\n🔒 ROW LEVEL SECURITY (RLS) IS BLOCKING THE INSERTION')
      console.error('\nTo resolve this issue, you have these options:')
      console.error('\n1. 🛠️  TEMPORARILY DISABLE RLS (for testing/development):')
      console.error('   Run this SQL in your Supabase dashboard → SQL Editor:')
      console.error('   ALTER TABLE games DISABLE ROW LEVEL SECURITY;')
      console.error('\n2. 🛡️  CREATE A PROPER INSERTION POLICY:')
      console.error('   Run this SQL in your Supabase dashboard → SQL Editor:')
      console.error('   CREATE POLICY "Enable insert for anonymous users" ON games')
      console.error('   FOR INSERT USING (true) WITH CHECK (true);')
      console.error('\n3. 🔑  USE SERVICE ROLE KEY (recommended for server-side operations):')
      console.error('   Add a SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
      console.error('   (Get this from Supabase Dashboard → Settings → API)')
      console.error('   The service role key bypasses RLS but must be kept secret!')
      console.error('\n📝 NOTE: The anon key (currently in use) is designed for')
      console.error('   client-side use and should have restrictive RLS policies.')
    }

    // Stop execution on error
    process.exit(1)
  }
}

// Execute the import function
importGames().catch(error => {
  console.error('❌ Unexpected error during import:', error)
  process.exit(1)
})