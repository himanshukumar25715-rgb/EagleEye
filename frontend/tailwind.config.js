/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['32px', { lineHeight: '40px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        md: '12px',
        lg: '12px',
        xl: '12px',
        '2xl': '12px',
        full: '9999px',
      },
      boxShadow: {
        DEFAULT: '0 0 0 1px #e6e3dc',
        card: '0 0 0 1px #e6e3dc',
        glow: '0 0 0 1px #e6e3dc',
      },
      colors: {
        background: 'hsl(0 0% 100%)',
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
      }
    },
  },
  plugins: [],
}
