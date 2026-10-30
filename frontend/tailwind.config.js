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
        background: '#f5f4f0',
        accent: {
          DEFAULT: '#0047ab',
          hover: '#003888',
          dark: '#002b66',
          light: '#e6effa',
        },
        brand: {
          black: 'var(--brand-black)',
          darkest: 'var(--brand-darkest)',
          dark: 'var(--brand-dark)',
          card: 'var(--brand-card)',
          cardHover: 'var(--brand-card-hover)',
          border: 'var(--brand-border)',
          borderLight: 'var(--brand-border-light)',
          white: 'var(--brand-white)',
          textMuted: 'var(--brand-text-muted)',
          yellow: '#0047ab',
          yellowHover: '#003888',
          yellowDark: '#002b66',
          accent: '#0047ab',
          accentHover: '#003888',
          accentDark: '#002b66',
          red: '#dc2626',
          redHover: '#b91c1c',
          redDark: '#991b1b',
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
