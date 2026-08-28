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
          orange: '#ff4d00',
          'orange-hover': '#e64500',
          'orange-light': 'rgba(255, 77, 0, 0.12)',
          dark: '#030303',
          card: '#0f0f11',
          hover: '#161619',
          border: '#222225',
          muted: '#888890',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
