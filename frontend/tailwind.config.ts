import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F9F8F4',
        foreground: '#2D3A31',
        primary: '#8C9A84',
        secondary: '#DCCFC2',
        border: '#E6E2DA',
        accent: '#C27B66',
        card: '#FFFFFF',
        'card-alt': '#F2F0EB',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Playfair Display', 'serif'],
        sans: ['var(--font-source)', 'Source Sans 3', 'sans-serif'],
      },
      borderRadius: {
        'arch': '200px 200px 0 0',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(45, 58, 49, 0.05)',
        'soft-md': '0 10px 15px -3px rgba(45, 58, 49, 0.05)',
        'soft-lg': '0 20px 40px -10px rgba(45, 58, 49, 0.05)',
        'soft-xl': '0 25px 50px -12px rgba(45, 58, 49, 0.15)',
      },
    },
  },
  plugins: [],
}
export default config
