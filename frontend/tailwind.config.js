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
        brand: {
          black: '#000000',
          darkest: '#0A0A0A',
          dark: '#121212',
          card: '#181818',
          cardHover: '#222222',
          border: '#2E2E2E',
          borderLight: '#444444',
          white: '#FFFFFF',
          textMuted: '#A3A3A3',
          yellow: '#FFCC00',
          yellowHover: '#FFD633',
          yellowDark: '#B28F00',
          red: '#FF3333',
          redHover: '#FF4D4D',
          redDark: '#8B0000',
        },
        campus: {
          black: '#000000',
          darkest: '#0A0A0A',
          dark: '#121212',
          card: '#181818',
          cardHover: '#222222',
          border: '#2E2E2E',
          borderLight: '#444444',
          white: '#FFFFFF',
          textMuted: '#A3A3A3',
          gold: '#FFCC00',
          goldHover: '#FFD633',
          red: '#FF3333',
          redHover: '#FF4D4D',
        }
      }
    },
  },
  plugins: [],
}
