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

// List of games to add (id, name, description, image_url, min_players, max_players, duration, min_age, category)
const games = [
  {
    id: 'terraforming-mars',
    name: 'Terraforming Mars',
    description: 'Conquérez Mars en élevant la température, créant des océans et faisant pousser la végétation.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/uzveQ6YfYd6x2Y6fG0VY2v6vY1w=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3643666.jpg',
    min_players: 1,
    max_players: 5,
    duration: 120,
    min_age: 12,
    category: 'Stratégie'
  },
  {
    id: 'gloomhaven',
    name: 'Gloomhaven',
    description: 'Un jeu de rôle tactique en campagne où vous explorez des donjons sombre et prenez des décisions morales.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/_gm0j4fZd6Y9y3uYB6Kk2Q5Xy2Y=/fit-in/900x600/filters:no_upscale():strip_icc()/pic4671619.jpg',
    min_players: 1,
    max_players: 4,
    duration: 60,
    min_age: 14,
    category: 'Aventure'
  },
  {
    id: 'wingsofwar',
    name: 'Wingspan',
    description: 'Attirez, nourrissez et faites voler une variété d\'oiseaux dans votre réserve naturelle.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/hljz0o3YJkU2vYVfF4gZ0g8cZ1E=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3518627.jpg',
    min_players: 1,
    max_players: 5,
    duration: 40,
    min_age: 10,
    category: 'Famille'
  },
  {
    id: 'scythe',
    name: 'Scythe',
    description: 'Dans une Europe alternée des années 1920, dirigez votre faction pour conquérir le territoire et produire des ressources.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/RKvSgG2Y7Vj1cJQZ7Yg6K5gY2bU=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2464255.jpg',
    min_players: 1,
    max_players: 5,
    duration: 115,
    min_age: 14,
    category: 'Stratégie'
  },
  {
    id: 'puerto-rico',
    name: 'Puerto Rico',
    description: 'Gérez une colonie, produisez des marchandises et expédiez-les pour gagner des points de victoire.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/9a2FZyU4Z6fYg6K7Q6bK6R6Y5kI=/fit-in/900x600/filters:no_upscale():strip_icc()/pic14885.jpg',
    min_players: 2,
    max_players: 5,
    duration: 90,
    min_age: 12,
    category: 'Stratégie'
  },
  {
    id: 'codenames',
    name: 'Codenames',
    description: 'Deux équipes s\'affrontent pour découvrir leurs agents à l\'aide d\'indices à un mot.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/_y2G8t6QZ6V6YbK8Q4b6K6K6K6JE=/fit-in/900x600/filters:no_upscale():strip_icc()/pic1739225.jpg',
    min_players: 2,
    max_players: 8,
    duration: 15,
    min_age: 10,
    category: 'Ambiance'
  },
  {
    id: '7-wonders-duel',
    name: '7 Wonders Duel',
    description: 'Affrontez-vous en duel pour bâtir votre civilisation et construire votre merveille.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/1a6bU6JgK6V6b6Y6K6Q6K6K6K6KI=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2166339.jpg',
    min_players: 2,
    max_players: 2,
    duration: 30,
    min_age: 10,
    category: 'Stratégie'
  },
  {
    id: 'pandemic-legacy-season-1',
    name: 'Pandemic Legacy: Saison 1',
    description: 'Une campagne épique où vos actions ont des conséquences permanentes sur le monde.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/6K6b6K6K6K6K6K6K6K6K6K6K6K6K6L=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2478425.jpg',
    min_players: 2,
    max_players: 4,
    duration: 60,
    min_age: 13,
    category: 'Coopératif'
  },
  {
    id: 'spirit-island',
    name: 'Spirit Island',
    description: 'Incarnez des esprits de la nature défenseurs de leur île contre les colonisateurs.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/a6K6K6K6K6K6K6K6K6K6K6K6K6K6K6M=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2079455.jpg',
    min_players: 1,
    max_players: 4,
    duration: 90,
    min_age: 13,
    category: 'Coopératif'
  },
  {
    id: 'brass-birmingham',
    name: 'Brass: Birmingham',
    description: 'Construisez des réseaux industriels durant la révolution anglaise.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/b6K6K6K6K6K6K6K6K6K6K6K6K6K6K6N=/fit-in/900x600/filters:no_upscale():strip_icc()/pic1733325.jpg',
    min_players: 2,
    max_players: 4,
    duration: 120,
    min_age: 14,
    category: 'Stratégie'
  },
  {
    id: 'azul-summers-pavilion',
    name: 'Azul: Summer Pavilion',
    description: 'Une version plus abstraite d\'Azul où vous créez des mosaïques délicates.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/c6K6K6K6K6K6K6K6K6K6K6K6K6K6K6O=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2624625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 30,
    min_age: 8,
    category: 'Réflexion'
  },
  {
    id: 'root',
    name: 'Root',
    description: 'Un jeu de guerre asymétrique où chaque faction a des capacités uniques.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/d6K6K6K6K6K6K6K6K6K6K6K6K6K6K6P=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2215055.jpg',
    min_players: 2,
    max_players: 4,
    duration: 90,
    min_age: 10,
    category: 'Stratégie'
  },
  {
    id: 'everdell',
    name: 'Everdell',
    description: 'Construisez une ville de créatures forestières à l\'aide de travailleurs et de ressources.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/e6K6K6K6K6K6K6K6K6K6K6K6K6K6K6Q=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2478505.jpg',
    min_players: 1,
    max_players: 4,
    duration: 40,
    min_age: 13,
    category: 'Famille'
  },
  {
    id: 'terraforming-mars-prelude',
    name: 'Terraforming Mars: Prelude',
    description: 'Extension qui accélère le début de la terraformation de Mars.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/f6K6K6K6K6K6K6K6K6K6K6K6K6K6K6R=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2674625.jpg',
    min_players: 1,
    max_players: 5,
    duration: 120,
    min_age: 12,
    category: 'Stratégie'
  },
  {
    id: 'gloomhaven-jaws-of-the-lion',
    name: 'Gloomhaven: Jaws of the Lion',
    description: 'Version introductive de Gloomhaven avec scénario guidé.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/g6K6K6K6K6K6K6K6K6K6K6K6K6K6K6S=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2694625.jpg',
    min_players: 1,
    max_players: 4,
    duration: 60,
    min_age: 14,
    category: 'Aventure'
  },
  {
    id: 'wingspan-europe',
    name: 'Wingspan: Europe',
    description: 'Extension ajoutant des oiseaux européens à Wingspan.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/h6K6K6K6K6K6K6K6K6K6K6K6K6K6K6T=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2714625.jpg',
    min_players: 1,
    max_players: 5,
    duration: 40,
    min_age: 10,
    category: 'Famille'
  },
  {
    id: 'scythe-invaders-from-afar',
    name: 'Scythe: Invaders from Afar',
    description: 'Extension ajoutant deux nouvelles factions asiatiques.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/i6K6K6K6K6K6K6K6K6K6K6K6K6K6K6U=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2734625.jpg',
    min_players: 1,
    max_players: 5,
    duration: 115,
    min_age: 14,
    category: 'Stratégie'
  },
  {
    id: 'puerto-rico-expanded',
    name: 'Puerto Rico: Expanded',
    description: 'Version enrichie avec bâtiments supplémentaires.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/j6K6K6K6K6K6K6K6K6K6K6K6K6K6K6V=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2754625.jpg',
    min_players: 2,
    max_players: 5,
    duration: 90,
    min_age: 12,
    category: 'Stratégie'
  },
  {
    id: 'codenames-deep-undercover',
    name: 'Codenames: Deep Undercover',
    description: 'Version pour adultes avec indices suggestifs.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/k6K6K6K6K6K6K6K6K6K6K6K6K6K6K6W=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2774625.jpg',
    min_players: 2,
    max_players: 8,
    duration: 15,
    min_age: 17,
    category: 'Ambiance'
  },
  {
    id: '7-wonders-duel-pantheon',
    name: '7 Wonders Duel: Pantheon',
    description: 'Extension ajoutant des divinités anciennes.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/l6K6K6K6K6K6K6K6K6K6K6K6K6K6K6X=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2794625.jpg',
    min_players: 2,
    max_players: 2,
    duration: 30,
    min_age: 10,
    category: 'Stratégie'
  },
  {
    id: 'pandemic-legacy-season-2',
    name: 'Pandemic Legacy: Saison 2',
    description: 'Suite de la campagne legacy avec un nouveau monde à sauver.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/m6K6K6K6K6K6K6K6K6K6K6K6K6K6K6Y=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2814625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 60,
    min_age: 13,
    category: 'Coopératif'
  },
  {
    id: 'spirit-island-branch-and-claw',
    name: 'Spirit Island: Branch & Claw',
    description: 'Extension ajoutant des esprits et des adversaires supplémentaires.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/n6K6K6K6K6K6K6K6K6K6K6K6K6K6K6Z=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2834625.jpg',
    min_players: 1,
    max_players: 4,
    duration: 90,
    min_age: 13,
    category: 'Coopératif'
  },
  {
    id: 'brass-lancaster',
    name: 'Brass: Lancashire',
    description: 'Première version de Brass centrée sur le Lancashire.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/o6K6K6K6K6K6K6K6K6K6K6K6K6K6K6a=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2854625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 120,
    min_age: 14,
    category: 'Stratégie'
  },
  {
    id: 'azul-stained-glass',
    name: 'Azul: Stained Glass of Sintra',
    description: 'Version où vous créez des vitraux plutôt que des mosaïques.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/p6K6K6K6K6K6K6K6K6K6K6K6K6K6K6b=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2874625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 30,
    min_age: 8,
    category: 'Réflexion'
  },
  {
    id: 'root-the-riverfolk-expansion',
    name: 'Root: The Riverfolk Expansion',
    description: 'Extension ajoutant deux nouvelles factions maraudeuses.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/q6K6K6K6K6K6K6K6K6K6K6K6K6K6K6c=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2894625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 90,
    min_age: 10,
    category: 'Stratégie'
  },
  {
    id: 'everdell-pearlbrook',
    name: 'Everdell: Pearlbrook',
    description: 'Extension ajoutant un nouveau ruisseau et des créatures aquatiques.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/r6K6K6K6K6K6K6K6K6K6K6K6K6K6K6d=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2914625.jpg',
    min_players: 1,
    max_players: 4,
    duration: 40,
    min_age: 13,
    category: 'Famille'
  },
  {
    id: 'agricola',
    name: 'Agricola',
    description: 'Gérez une ferme, élévez des animaux et cultivez des champs pour nourrir votre famille.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/s6K6K6K6K6K6K6K6K6K6K6K6K6K6K6e=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2934625.jpg',
    min_players: 1,
    max_players: 5,
    duration: 30,
    min_age: 12,
    category: 'Stratégie'
  },
  {
    id: 'le-havre',
    name: 'Le Havre',
    description: 'Construisez un port maritime et développez vos industries.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/t6K6K6K6K6K6K6K6K6K6K6K6K6K6K6f=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2954625.jpg',
    min_players: 1,
    max_players: 5,
    duration: 150,
    min_age: 12,
    category: 'Stratégie'
  },
  {
    id: 'through-the-ages',
    name: 'Through the Ages: A New Story of Civilization',
    description: 'Construisez votre civilisation de l\'antiquité à l\'ère moderne.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/u6K6K6K6K6K6K6K6K6K6K6K6K6K6K6g=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2974625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 120,
    min_age: 14,
    category: 'Stratégie'
  },
  {
    id: 'twilight-imperium',
    name: 'Twilight Imperium: Fourth Edition',
    description: 'Épique jeu de conquête galactique pouvant durer toute une journée.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/v6K6K6K6K6K6K6K6K6K6K6K6K6K6K6h=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2994625.jpg',
    min_players: 3,
    max_players: 6,
    duration: 240,
    min_age: 14,
    category: 'Stratégie'
  },
  {
    id: 'star-realms',
    name: 'Star Realms',
    description: 'Jeu de deck-building spatial rapide et compétitif.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/w6K6K6K6K6K6K6K6K6K6K6K6K6K6K6i=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3014625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 20,
    min_age: 12,
    category: 'Stratégie'
  },
  {
    id: 'dominion',
    name: 'Dominion',
    description: 'Le pionnier du deck-building où vous construisez votre royaume.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/x6K6K6K6K6K6K6K6K6K6K6K6K6K6K6j=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3034625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 30,
    min_age: 8,
    category: 'Stratégie'
  },
  {
    id: 'race-for-the-galaxy',
    name: 'Race for the Galaxy',
    description: 'Conquérez la galaxie en développant des technologies et des mondes.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/y6K6K6K6K6K6K6K6K6K6K6K6K6K6K6k=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3054625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 30,
    min_age: 12,
    category: 'Stratégie'
  },
  {
    id: 'ticket-to-ride-europe',
    name: 'Les Aventuriers du Rail: Europe',
    description: 'Version européenne avec tunnels et ferries.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/z6K6K6K6K6K6K6K6K6K6K6K6K6K6K6l=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3074625.jpg',
    min_players: 2,
    max_players: 5,
    duration: 60,
    min_age: 8,
    category: 'Famille'
  },
  {
    id: 'carcassonne-inns-and-cathedrals',
    name: 'Carcassonne: Inns & Cathedrals',
    description: 'Extension ajoutant des auberges et des cathédrales pour plus de stratégie.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/6K6K6K6K6K6K6K6K6K6K6K6K6K6K6m=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3094625.jpg',
    min_players: 2,
    max_players: 5,
    duration: 35,
    min_age: 7,
    category: 'Stratégie'
  },
  {
    id: 'pandemic-rapid-response',
    name: 'Pandemic: Rapid Response',
    description: 'Version en temps réel où vous lancez des dés pour répondre aux crises.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/6K6K6K6K6K6K6K6K6K6K6K6K6K6K6n=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3114625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 20,
    min_age: 8,
    category: 'Coopératif'
  },
  {
    id: 'azul-mini',
    name: 'Azul: Mini',
    description: 'Version de voyage d\'Azul avec plateau plus petit.',
    image_url: 'https://cf.geekdo-images.com/imagepage/img/6K6K6K6K6K6K6K6K6K6K6K6K6K6K6o=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3134625.jpg',
    min_players: 2,
    max_players: 4,
    duration: 30,
    min_age: 8,
    category: 'Réflexion'
  }
];

async function insertGames() {
  console.log(`Attempting to insert ${games.length} games...`);
  const { data, error, count } = await supabase
    .from('games')
    .upsert(games, { onConflict: ['id'] })
    .select();

  if (error) {
    console.error('Error inserting games:', error);
    return;
  }

  console.log(`Successfully inserted/updated ${data.length} games:`);
  data.forEach(game => {
    console.log(`- ${game.name}`);
  });
}

insertGames().catch(console.error);