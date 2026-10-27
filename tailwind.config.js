/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-mrt-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      /** Default `ring` / `ring-2` without a color: neutral graphite (not Tailwind's blue). */
      ringColor: {
        DEFAULT: 'rgba(71, 85, 105, 0.45)',
      },
    },
  },
  plugins: [],
};
