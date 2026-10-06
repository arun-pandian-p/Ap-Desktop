/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDECEC',
          100: '#FCD7D7',
          200: '#F9B0B0',
          500: '#E11D26',
          600: '#C8101A',
          700: '#A80000',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          dark: 'var(--surface-dark)',
          'dark-2': 'var(--surface-dark-2)',
        },
        theme: {
          bg: 'var(--bg)',
          border: 'var(--border)',
          'border-hover': 'var(--border-hover)',
          text: 'var(--text)',
          'text-muted': 'var(--text-muted)',
          'text-subtle': 'var(--text-subtle)',
          primary: 'var(--primary)',
          'primary-hover': 'var(--primary-hover)',
          'primary-deep': 'var(--primary-deep)',
          'primary-tint': 'var(--primary-tint)',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: 'var(--radius-card, 14px)',
        control: 'var(--radius-control, 8px)',
        chip: '6px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        glow: '0 0 15px rgba(225, 29, 38, 0.25)',
      }
    },
  },
  plugins: [],
}
