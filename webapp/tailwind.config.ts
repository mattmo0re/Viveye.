import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        aurora: '0 25px 60px rgba(112, 120, 160, 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
