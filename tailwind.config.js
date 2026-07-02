/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'fl-dark': '#1f2a1d',
        'fl-mid': '#2d3a2a',
        'fl-btn': '#2a3827',
        'fl-text': '#4b5b47',
        'fl-heading': '#336443',
        'fl-accent': '#85AB8B',
        'fl-bottom': '#3d5638',
        'fl-bottom-hover': '#2d4228',
      },
      fontFamily: {
        display: ['"Neue Haas Grotesk Display Pro 55 Roman"', '"Neue Haas Grotesk Text Pro"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
