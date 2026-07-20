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
          950: '#090a0f',
          900: '#11131a',
          800: '#171a24',
          700: '#1f2330',
          600: '#282d3d',
          500: '#d4af37',
          400: '#e5b842',
          300: '#8e96a8',
        },
        gold: {
          500: '#d4af37',
          400: '#e5b842',
          300: '#f3e5ab',
          dark: '#b89228',
        }
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        sans: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
