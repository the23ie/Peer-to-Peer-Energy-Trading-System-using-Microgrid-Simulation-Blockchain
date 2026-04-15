/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // CRITICAL: These paths MUST match your actual file structure
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './contexts/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './styles/**/*.{css}',

  ],
  theme: {
    extend: {
      boxShadow: {
        card: "0 4px 6px -1px rgba(0,0,0,0.1)",   // your shadow-card value
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fbbf24',
          700: '#b45309',
        },
        accent: {
          teal: '#14b8a6',
          aqua: '#06b6d4',
        },
        background: {
          DEFAULT: '#f8fafc',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-soft': 'linear-gradient(to bottom right, #fafafa, #f0f9ff)',
      },
    },
  },
  plugins: [],
}