/** @type {import('tailwindcss').Config} */

// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/renderer/index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans]
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        },
        breath: {
          '0%, 100%': {
            // opacity: '1',
            transform: 'scale(1)'
          },
          '50%': {
            // opacity: '.7',
            transform: 'scale(1.1)'
          }
        }
      },
      animation: {
        wiggle: 'wiggle 2s ease-in-out infinite',
        breath: 'breath 3s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
