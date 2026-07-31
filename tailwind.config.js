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
          950: '#0b1320', // Deep Navy Black
          900: '#142034', // Slate Dark Card
          800: '#1e2c42', // Container Background
          700: '#71A3CC', // Color 4: Deep Steel Blue
          600: '#93BBD8', // Color 3: Medium Slate Blue
          500: '#FBE99B', // Color 1: Pastel Gold Cream
          400: '#BCE4F0', // Color 2: Ice Sky Blue
          300: '#93BBD8', // Muted Slate Text
        },
        gold: {
          500: '#FBE99B', // Color 1: Pastel Gold Cream (#FBE99B)
          400: '#BCE4F0', // Color 2: Ice Sky Blue (#BCE4F0)
          300: '#93BBD8', // Color 3: Medium Slate Blue (#93BBD8)
          dark: '#71A3CC', // Color 4: Deep Steel Blue (#71A3CC)
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
