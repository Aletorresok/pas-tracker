import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { lazy, Suspense } from 'react'
const Portal = lazy(() => import('./Portal.jsx'))
import { MenuHost } from './components/ui/MenuContextual.jsx'
import AtrapaErrores from './components/ui/AtrapaErrores.jsx'

// Importamos el proveedor del tema global
import { ThemeProvider } from './context/ThemeContext.jsx'
import './hooks/useInstalarApp.js'

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
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </AtrapaErrores>
      <MenuHost />
    </ThemeProvider>
  </StrictMode>,
)