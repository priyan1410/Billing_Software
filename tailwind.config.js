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
          950: '#EEE9DF', // Palladian - Light background
          900: '#FFFFFF', // White - Sidebar / Panels / Cards
          800: '#FFF9EE', // Soft off-white - Inputs / Hover states
          700: '#A35139', // Truffle Trouble - Accents
          600: '#C9C1B1', // Oatmeal - Dividers
          500: '#FFB162', // Burning Flame - Highlights
          400: '#2C3B4D', // Blue Fantastic - Dark Text
          300: '#4A5E75', // Muted Blue Fantastic - Secondary Text
        },
        gold: {
          500: '#FFB162', // Burning Flame
          400: '#A35139', // Truffle Trouble
          300: '#A35139', // Truffle Trouble
          dark: '#A35139', // Truffle Trouble
        },
        amber: {
          50: '#A35139',
          100: '#A35139',
          200: '#A35139',
          300: '#A35139',
          400: '#A35139',
          500: '#A35139',
          600: '#A35139',
          700: '#A35139',
          800: '#A35139',
          900: '#A35139',
          950: '#EEE9DF',
        },
        orange: {
          500: '#A35139',
          600: '#A35139',
          700: '#A35139',
        },
        emerald: {
          400: '#27ae60',
          500: '#27ae60',
          600: '#27ae60',
          700: '#27ae60',
        },
        teal: {
          500: '#27ae60',
          600: '#27ae60',
          700: '#27ae60',
        },
        rose: {
          50: '#c0392b',
          100: '#c0392b',
          200: '#c0392b',
          300: '#c0392b',
          400: '#c0392b',
          500: '#c0392b',
          600: '#c0392b',
          700: '#c0392b',
          800: '#c0392b',
          900: '#c0392b',
        },
        slate: {
          50: '#4A5E75',
          100: '#4A5E75',
          200: '#2C3B4D',
          300: '#4A5E75',
          400: '#2C3B4D',
          500: '#1B2632',
          600: '#1B2632',
          700: '#C9C1B1',
          800: '#E3DBD0',
          900: '#FFFFFF',
          950: '#EEE9DF',
        },
        gray: {
          50: '#4A5E75',
          100: '#4A5E75',
          200: '#2C3B4D',
          300: '#4A5E75',
          400: '#2C3B4D',
          500: '#1B2632',
          600: '#1B2632',
          700: '#C9C1B1',
          800: '#E3DBD0',
          900: '#FFFFFF',
          950: '#EEE9DF',
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
