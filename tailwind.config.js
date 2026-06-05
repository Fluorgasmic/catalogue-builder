/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0d0d0d',
          1: '#141414',
          2: '#1a1a1a',
          3: '#222222',
          4: '#2a2a2a',
          5: '#333333',
          6: '#3d3d3d',
        },
        accent: {
          DEFAULT: '#7C5CFC',
          light: '#9B82FD',
          dark: '#5E3FDB',
        },
        muted: '#6b7280',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.15s ease-out',
        slideIn: 'slideIn 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
