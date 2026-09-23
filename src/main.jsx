import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Portal from './Portal.jsx'

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
      <BrowserRouter>
        <Routes>
          <Route path="/portal/*" element={<Portal />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)