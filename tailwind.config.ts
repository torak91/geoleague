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
        paper: '#F6F2EA',
        cream: '#FBF8F2',
        ink: '#16140F',
        subink: '#6B655B',
        flame: {
          DEFAULT: '#DA5520',
          soft: '#F8E6D8',
          '600': '#B84416',
        },
        sage: {
          DEFAULT: '#5A6845',
          soft: 'rgba(90, 104, 69, 0.13)',
        },
        espresso: '#1A1612',
      },
      fontFamily: {
        sans:    ['var(--font-inter)',       'ui-sans-serif', 'system-ui'],
        display: ['var(--font-inter-tight)', 'Inter',         'sans-serif'],
        mono:    ['var(--font-jetbrains)',   'ui-monospace',  'monospace'],
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        card:   '0 1px 0 rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        cardLg: '0 30px 80px rgba(0,0,0,0.08)',
      },
      letterSpacing: {
        tightish: '-0.02em',
        wider:    '0.18em',
        widest:   '0.22em',
      },
    },
  },
  plugins: [],
};
export default config;
