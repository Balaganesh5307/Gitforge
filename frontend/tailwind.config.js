/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#080c14',
          card: '#0d1321',
          border: 'rgba(255, 255, 255, 0.06)',
          lightBorder: 'rgba(255, 255, 255, 0.12)',
          text: '#f3f4f6',
          muted: '#9ca3af',
        },
        brand: {
          purple: '#8b5cf6',
          blue: '#3b82f6',
          indigo: '#6366f1',
          emerald: '#10b981',
          rose: '#ef4444',
          amber: '#f59e0b',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(139, 92, 246, 0.15)',
        glow: '0 0 15px rgba(99, 102, 241, 0.5)',
      }
    },
  },
  plugins: [],
}
