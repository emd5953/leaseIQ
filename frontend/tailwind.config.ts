import type { Config } from 'tailwindcss'
const color = (name: string) => `rgb(var(--${name}) / <alpha-value>)`
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: color('canvas'),
        foreground: color('ink'),
        primary: color('sky'),
        'primary-hover': color('sky-hover'),
        'primary-foreground': color('canvas'),
        secondary: color('surface-2'),
        card: color('surface'),
        'card-alt': color('surface-2'),
        muted: color('surface-2'),
        'muted-foreground': color('muted'),
        border: 'rgb(var(--ink) / 0.12)',
        accent: color('terracotta'),
        warning: color('warning'),
        danger: color('danger'),
        success: color('success'),
        info: color('info'),
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        heading: ['var(--font-heading)', 'Arial', 'sans-serif'],
        sans: ['var(--font-inter)', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius-control)',
        xl: 'var(--radius-surface)',
        '2xl': 'var(--radius-surface)',
        '3xl': 'var(--radius-media)',
      },
      boxShadow: {
        soft: '0 8px 30px #0002',
        'soft-md': '0 12px 40px #0003',
        'soft-lg': '0 16px 50px #0005',
        'soft-xl': '0 24px 70px #0007',
      },
    },
  },
  plugins: [],
}
export default config
