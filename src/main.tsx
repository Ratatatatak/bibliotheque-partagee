import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Polices hébergées avec le site (aucun appel à Google Fonts, affichage plus rapide).
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import '@fontsource/playfair-display/700.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)