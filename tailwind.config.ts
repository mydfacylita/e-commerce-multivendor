import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8eef9',
          100: '#d1ddf3',
          200: '#a3bbe7',
          300: '#7599db',
          400: '#4777cf',
          500: '#2C4A9E', // Azul principal
          600: '#233b7e',
          700: '#1a2c5f',
          800: '#121d3f',
          900: '#090e20',
        },
        accent: {
          50: '#fff4e6',
          100: '#ffe9cc',
          200: '#ffd399',
          300: '#ffbd66',
          400: '#ffa733',
          500: '#FF9900', // Laranja principal
          600: '#cc7a00',
          700: '#995c00',
          800: '#663d00',
          900: '#331f00',
        },
      },
    },
  },
  plugins: [],
}
export default config
