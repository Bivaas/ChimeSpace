import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system tokens
        accent: {
          DEFAULT: '#4F46E5',
          50:  '#EEEEFF',
          100: '#DCDCFF',
          200: '#B8B7FF',
          300: '#8E8AF9',
          400: '#6D68F2',
          500: '#4F46E5',
          600: '#3730C8',
          700: '#2620A3',
          800: '#191580',
          900: '#100E5E',
        },
        ink: {
          DEFAULT: '#0A0A0B',
          muted:   '#52525B',
          faint:   '#A1A1AA',
        },
        paper: {
          DEFAULT: '#FAFAF8',
          raised:  '#FFFFFF',
          sunken:  '#F4F4F0',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)',    'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'soft':    '0 4px 12px 0 rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'soft-lg': '0 12px 32px 0 rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
