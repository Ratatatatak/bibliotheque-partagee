import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkGames() {
  const { data, error } = await supabase.from('games').select('id, name', { count: 'exact' })
  if (error) {
    console.error('Error fetching games:', error)
    process.exit(1)
  }
  console.log(`Found ${data.length} games:`)
  data.forEach(g => console.log(`- ${g.name}`))
}

checkGames()