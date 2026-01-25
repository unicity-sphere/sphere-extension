/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/popup/**/*.{js,ts,jsx,tsx}',
    './public/popup.html',
  ],
  theme: {
    extend: {
      colors: {
        sphere: {
          primary: '#8B5CF6',
          secondary: '#3B82F6',
        },
      },
    },
  },
  plugins: [],
};
