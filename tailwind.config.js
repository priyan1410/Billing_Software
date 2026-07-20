/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          950: '#0d130e',
          900: '#141f16',
          800: '#1b291d',
          700: '#243627',
          600: '#2d4432',
          500: '#4d642d',
          400: '#556b2f',
          300: '#6b8e23',
        },
        gold: {
          500: '#d4af37',
          400: '#e5b842',
          300: '#f3e5ab',
          dark: '#aa7c11',
        }
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        sans: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
