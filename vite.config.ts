import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

function bggApiProxy(token: string): Plugin {
  return {
    name: 'bgg-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/bgg', async (request, response, next) => {
        if (!token) {
          response.statusCode = 503
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: 'BGG_API_TOKEN est absent du serveur' }))
          return
        }

        const path = request.url?.replace(/^\/api\/bgg/, '') || '/'
        const bggUrl = `https://boardgamegeek.com/xmlapi2${path}`

        try {
          const bggResponse = await fetch(bggUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              'User-Agent': 'BibliothequePartagee/1.0 (local development)'
            }
          })

          response.statusCode = bggResponse.status
          response.setHeader('Content-Type', bggResponse.headers.get('content-type') || 'application/xml')
          response.end(await bggResponse.text())
        } catch (error) {
          next(error instanceof Error ? error : new Error('Erreur proxy BGG'))
        }
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [react(), bggApiProxy(env.BGG_API_TOKEN)],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'tanstack-query': ['@tanstack/react-query'],
          'lucide': ['lucide-react'],
          'sonner': ['sonner'],
          'radix': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tooltip'],
        }
      }
    }
  }
  }
})