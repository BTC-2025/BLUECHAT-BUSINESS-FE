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
          DEFAULT: '#002147',
          dark: '#001a38',
          light: '#003366',
        },
        secondary: {
          DEFAULT: '#00BFFF',
          dark: '#185F99',
          light: '#33ccff',
        },
        background: {
          DEFAULT: '#E9F4FF',
          dark: '#d4e8f9',
          card: '#ffffff',
        },
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'bubble': '0 2px 8px rgba(0, 33, 71, 0.08)',
        'card': '0 4px 20px rgba(0, 33, 71, 0.06)',
        'header': '0 2px 10px rgba(0, 33, 71, 0.1)',
      },
    },
  },
  plugins: [],
};
