/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        orbitron: ['Orbitron', 'monospace'],
      },
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite alternate',
        'neon-flicker': 'neon-flicker 3s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
        'neon-flicker': {
          '0%, 100%': {
            textShadow: '0 0 5px rgba(220, 38, 38, 0.4), 0 0 10px rgba(220, 38, 38, 0.3), 0 0 15px rgba(220, 38, 38, 0.2)',
          },
          '50%': {
            textShadow: '0 0 3px rgba(220, 38, 38, 0.5), 0 0 8px rgba(220, 38, 38, 0.4), 0 0 12px rgba(220, 38, 38, 0.3)',
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan': {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
      },
    },
  },
  plugins: [],
}
