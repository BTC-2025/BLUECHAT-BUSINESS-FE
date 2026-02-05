/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#195BAC',
          dark: '#144a8c',
          light: '#3375c4',
        },
        // Removed secondary cyan. Using gray/primary instead.
        secondary: {
          DEFAULT: '#64748b', // Slate 500 (Gray)
          dark: '#475569',    // Slate 600
          light: '#94a3b8',   // Slate 400
        },
        background: {
          DEFAULT: '#E9F4FF',
          dark: '#d4e8f9',
          card: '#ffffff',
        },
      },
      animation: {
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'premium-in': 'premium-fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'premium-fade-in': {
          'from': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
        'premium': '0 20px 40px -15px rgba(25, 91, 172, 0.15), 0 0 2px rgba(0,0,0,0.05)',
        'card': '0 2px 10px rgba(0, 0, 0, 0.03)',
        'input': '0 2px 5px rgba(0,0,0,0.02)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
};
