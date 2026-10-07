/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary — richer, warmer blue
        brand: {
          50:  '#eef4ff',
          100: '#d9e4ff',
          200: '#b9ceff',
          300: '#8aadff',
          400: '#5482ff',
          500: '#2e5aff',
          600: '#0a5cff',   // primary CTA
          700: '#0646cc',
          800: '#063aa5',
          900: '#082c7a',
        },
        // Secondary — warm amber for accents
        accent: {
          50:  '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc170',
          400: '#ffa138',
          500: '#ff8210',
          600: '#f06400',
          700: '#c74d00',
          800: '#9e3d04',
          900: '#7f3408',
        },
        // Ink — cool grays for text
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Tighter, more premium scale
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft':  '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card':  '0 1px 2px 0 rgb(15 23 42 / 0.03), 0 4px 12px -2px rgb(15 23 42 / 0.06)',
        'lift':  '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 12px 32px -8px rgb(15 23 42 / 0.12)',
        'brand': '0 4px 14px -2px rgb(10 92 255 / 0.30)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
