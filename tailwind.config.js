/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        apex: {
          blue: '#6366F1',
          'blue-hover': '#4F46E5',
          'blue-light': 'rgba(99, 102, 241, 0.14)',
          orange: '#FE6500',
          'orange-hover': '#E85C00',
          'orange-light': 'rgba(254, 101, 0, 0.13)',
          dark: '#0A0F24',
          card: '#121A38',
          hover: '#18234A',
          border: '#27345F',
          muted: '#AAB5D7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
