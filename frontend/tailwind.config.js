/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        campus: {
          darkest: '#080E0A',
          dark: '#0E1A13',
          card: '#14251B',
          cardHover: '#1B3124',
          border: '#244331',
          gold: '#E5B842',
          goldHover: '#F7C948',
          goldMuted: '#967926',
          text: '#F3F4F6',
          textMuted: '#9CA3AF',
        }
      }
    },
  },
  plugins: [],
}

