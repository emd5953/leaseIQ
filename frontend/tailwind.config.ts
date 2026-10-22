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
        foreground: '#243B34',
        primary: '#386552',
        secondary: '#DCCFC2',
        border: '#E6E2DA',
        accent: '#A34F37',
        card: '#FFFFFF',
        'card-alt': '#F2F0EB',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-source)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
