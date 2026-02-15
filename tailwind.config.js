/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        black:  '#0D0D0D',
        gold:   '#D4AF37',
        'gold-light': '#E8CC6A',
        'gold-dark':  '#A88B20',
        'surface':    '#161616',
        'surface-2':  '#1F1F1F',
        'surface-3':  '#2A2A2A',
        'border':     '#2E2E2E',
        'text-muted': '#888888',
      },
      fontFamily: {
        sans:    ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-display)', 'serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.4s ease forwards',
        'slide-down': 'slideDown 0.3s ease forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                   to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,175,55,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(212,175,55,0)' },
        },
      },
      boxShadow: {
        gold: '0 0 20px rgba(212,175,55,0.25)',
        'gold-lg': '0 0 40px rgba(212,175,55,0.35)',
        card: '0 2px 12px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
