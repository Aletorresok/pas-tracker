import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Librerías que casi no cambian van en archivos propios: el navegador los guarda entre deploys
// y solo se vuelve a bajar el código de la app. Las pesadas (xlsx, jsPDF, pdf.js, pdf-lib) se cargan bajo demanda.
const VENDOR = [
  ['react', /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@remix-run)\//],
  ['supabase', /node_modules\/@supabase\//],
  ['dnd', /node_modules\/@dnd-kit\//],
]

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const n = id.replace(/\\/g, '/')
          return VENDOR.find(([, re]) => re.test(n))?.[0]
        },
      },
    },
  },
})
