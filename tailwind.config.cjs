/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terre-cuite-chaleureuse': '#E27D60',
        'bleu-canard-profond': '#2C5F6D',
        'vert-sauge-doux': '#8FBC8F',
        'creme-de-lait': '#F8F4E9',
        'gris-pierre-chaude': '#E2E8D0',
        'brun-cafe-doux': '#4A4A4A',
        'gris-perle': '#F0F0F0',
        // États
        'success-clair': '#A8D5BA',
        'warning-doux': '#D4A574',
        'error-atténue': '#E8B7B7',
        // Jetons sémantiques (classes bg-background, text-muted-foreground, etc.)
        // reliés aux variables CSS de src/index.css, elles-mêmes alignées sur la palette.
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      fontFamily: {
        display: ['Cinzel', 'Playfair Display', 'Merriweather', 'Georgia', 'serif'],
        sans: ['Lato', 'Open Sans', 'Nunito', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['Cinzel', 'Cormorant Garamond', 'Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
        body: ['Lato', 'Open Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1)',
        md: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.09), 0 4px 6px -2px rgba(0,0,0,0.05)',
        inner: 'inset 0 2px 4px rgba(0,0,0,0.04)',
        jeu: '0 8px 25px -5px rgba(226, 125, 96, 0.15)',
      },
      transitionDuration: {
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
      transitionTimingFunction: {
        doux: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-doux': 'cubic-bezier(0.16, 1, 0.3, 1)',
        naturel: 'cubic-bezier(0.4, 0, 0.2, 1)',
        ludique: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      keyframes: {
        'apparition-douce': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulsation-douce': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'flottement-ludique': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'tilt-ludique': {
          '0%, 100%': { transform: 'rotate(0deg) rotateX(0deg)' },
          '50%': { transform: 'rotate(2deg) rotateX(1deg)' },
        },
      },
    },
  },
  plugins: [],
}
