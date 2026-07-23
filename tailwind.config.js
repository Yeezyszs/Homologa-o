/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // paleta do status de homologação
        status: {
          homologado: '#16a34a',
          pendente: '#d97706',
          nao_homologado: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}
