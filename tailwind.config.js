/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B7A4E',
          dark: '#145C3A',
          light: '#E8F5EE',
        },
        accent: '#F4A024',
        surface: '#FFFFFF',
        background: '#F7F9F8',
        foreground: '#1A1F1C',
        muted: '#5C6B63',
        border: '#E2E8E5',
        error: '#D64545',
        whatsapp: '#25D366',
      },
    },
  },
  plugins: [],
};
