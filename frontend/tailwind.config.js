/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        olive: {
          50:  '#f2f6e9',
          100: '#e3ecd0',
          200: '#c6d9a2',
          300: '#a0c06b',
          400: '#7da63e',
          500: '#618929',
          600: '#4a7319',
          700: '#3a5b13',
          800: '#2e4810',
          900: '#1e3009',
          950: '#121d06',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        kenBurns: {
          '0%':   { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1.15)' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fadeIn 0.35s ease-out both',
        'scale-in':   'scaleIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'ken-burns':  'kenBurns 10s ease-out forwards',
      },
    },
  },
  plugins: [],
};
