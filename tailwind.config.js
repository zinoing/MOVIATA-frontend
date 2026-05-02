/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        indeterminate: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(500%)' },
        },
      },
      animation: {
        shimmer:       'shimmer 1.5s ease-in-out infinite',
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
      },
      fontFamily: {
        gulfs: ['"Gulfs Display"', 'sans-serif'],
        gulfsCondensed: ['"Gulfs Display Condensed"', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}