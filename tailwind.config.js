/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde de marca — nav ativa, links, botões primários e foco.
        // Usar com moderação: ação e navegação, nunca decoração.
        marca: {
          DEFAULT: '#1F5B3F',
          escuro: '#17472F',
          claro: '#EAF2ED',
          'claro-hover': '#DCEBE2',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
