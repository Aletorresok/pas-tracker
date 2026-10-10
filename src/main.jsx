import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
const Portal = lazy(() => import('./Portal.jsx'))
const PaginaReclamo = lazy(() => import('./components/publico/PaginaReclamo.jsx')) // página pública para quien no es cliente
import { MenuHost } from './components/ui/MenuContextual.jsx'
import AtrapaErrores from './components/ui/AtrapaErrores.jsx'

// Importamos el proveedor del tema global
import { ThemeProvider } from './context/ThemeContext.jsx'
import './hooks/useInstalarApp.js'

// Hora de Argentina en todas las fechas y horas que se muestran (pantallas, PDF, mails), aunque el
// dispositivo esté en otra zona, y horas de 0 a 23 (en es-AR salía "11:16" para las 23:16). Si una llamada ya
// pide otra zona u otro formato de hora, se respeta.
import { ZONA_AR } from './utils/formatters.js'
for (const m of ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']) {
  const original = Date.prototype[m]
  Date.prototype[m] = function (locales, opciones) { return original.call(this, locales, { timeZone: ZONA_AR, ...(opciones?.hour12 === undefined ? { hourCycle: 'h23' } : {}), ...opciones }) }
}

// App instalable (PWA): el service worker solo en la versión publicada
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[sw]', e)))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AtrapaErrores>
        <BrowserRouter>
          <Routes>
            <Route path="/portal/*" element={<Suspense fallback={null}><Portal /></Suspense>} />
            <Route path="/reclamo" element={<Suspense fallback={null}><PaginaReclamo /></Suspense>} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </AtrapaErrores>
      <MenuHost />
    </ThemeProvider>
  </StrictMode>,
)